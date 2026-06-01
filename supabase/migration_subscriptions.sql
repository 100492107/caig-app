-- Run this in Supabase Dashboard → SQL Editor
-- Creates the client_subscriptions table and adds plan columns to profiles

-- 1. client_subscriptions table
create table if not exists client_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid references profiles(id) on delete cascade not null,
  stripe_session_id     text unique,
  stripe_customer_id    text,
  stripe_subscription_id text,
  plan_tier             text not null,   -- 'starter' | 'growth' | 'elite'
  plan_amount           integer not null, -- in pence (e.g. 300000 = £3,000)
  status                text not null default 'pending', -- 'pending' | 'active' | 'cancelled'
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- 2. Row-level security
alter table client_subscriptions enable row level security;

-- Admins can read/write all subscriptions
create policy "admin_all" on client_subscriptions
  for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Clients can only read their own subscription
create policy "client_read_own" on client_subscriptions
  for select using (client_id = auth.uid());

-- 3. Add plan columns to profiles (if not already present)
alter table profiles
  add column if not exists tier text,
  add column if not exists subscription_status text;

-- 4. Index for fast lookups
create index if not exists idx_client_subscriptions_client_id on client_subscriptions(client_id);
create index if not exists idx_client_subscriptions_session_id on client_subscriptions(stripe_session_id);

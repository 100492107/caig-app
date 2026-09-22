-- Cornerstone Commerce Intelligence: product + trend signals, opportunities and monetisation tests
create table if not exists public.cornerstone_commerce_signals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_platform text not null check (source_platform in ('pinterest','vinted','depop','tiktok','tiktok_shop','temu','alibaba','other')),
  signal_type text not null check (signal_type in ('product','trend','visual','listing')),
  source_url text,
  canonical_url text,
  title text,
  description text,
  image_url text,
  storage_path text,
  product_id text,
  shop_name text,
  brand text,
  price_amount numeric,
  price_currency text,
  availability text,
  rating numeric,
  review_count integer,
  sold_count numeric,
  metric_name text,
  metric_value numeric,
  metric_window text,
  trend_direction text,
  category text,
  tags text[] default '{}',
  affiliate_route text,
  evidence_confidence text default 'medium' check (evidence_confidence in ('high','medium','low')),
  metadata jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists cornerstone_commerce_signals_owner_idx
  on public.cornerstone_commerce_signals (owner_id, created_at desc);
create index if not exists cornerstone_commerce_signals_source_idx
  on public.cornerstone_commerce_signals (owner_id, source_platform, signal_type);
create index if not exists cornerstone_commerce_signals_category_idx
  on public.cornerstone_commerce_signals (owner_id, category);

alter table public.cornerstone_commerce_signals enable row level security;

drop policy if exists "commerce_signals_owner_select" on public.cornerstone_commerce_signals;
drop policy if exists "commerce_signals_owner_insert" on public.cornerstone_commerce_signals;
drop policy if exists "commerce_signals_owner_update" on public.cornerstone_commerce_signals;
drop policy if exists "commerce_signals_owner_delete" on public.cornerstone_commerce_signals;

create policy "commerce_signals_owner_select"
  on public.cornerstone_commerce_signals for select to authenticated
  using (auth.uid() = owner_id);
create policy "commerce_signals_owner_insert"
  on public.cornerstone_commerce_signals for insert to authenticated
  with check (auth.uid() = owner_id);
create policy "commerce_signals_owner_update"
  on public.cornerstone_commerce_signals for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
create policy "commerce_signals_owner_delete"
  on public.cornerstone_commerce_signals for delete to authenticated
  using (auth.uid() = owner_id);

revoke all on public.cornerstone_commerce_signals from anon;
grant select, insert, update, delete on public.cornerstone_commerce_signals to authenticated;

create table if not exists public.cornerstone_commerce_opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  creator_id text not null check (creator_id in ('cara','lila','duo','neutral')),
  title text not null,
  summary text,
  signal_ids uuid[] not null default '{}',
  trend text,
  product_angle text,
  aesthetic_angle text,
  hook text,
  content_concept text,
  format text,
  visual_direction jsonb not null default '{}'::jsonb,
  content_prompt text,
  monetisation_route text,
  monetisation_test text,
  cta text,
  kpi text,
  winner_rule text,
  evidence_confidence text default 'medium' check (evidence_confidence in ('high','medium','low')),
  status text default 'candidate' check (status in ('candidate','approved','queued','produced','tested','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists cornerstone_commerce_opportunities_owner_idx
  on public.cornerstone_commerce_opportunities (owner_id, created_at desc);
create index if not exists cornerstone_commerce_opportunities_status_idx
  on public.cornerstone_commerce_opportunities (owner_id, status);

alter table public.cornerstone_commerce_opportunities enable row level security;

drop policy if exists "commerce_opportunities_owner_select" on public.cornerstone_commerce_opportunities;
drop policy if exists "commerce_opportunities_owner_insert" on public.cornerstone_commerce_opportunities;
drop policy if exists "commerce_opportunities_owner_update" on public.cornerstone_commerce_opportunities;
drop policy if exists "commerce_opportunities_owner_delete" on public.cornerstone_commerce_opportunities;

create policy "commerce_opportunities_owner_select"
  on public.cornerstone_commerce_opportunities for select to authenticated
  using (auth.uid() = owner_id);
create policy "commerce_opportunities_owner_insert"
  on public.cornerstone_commerce_opportunities for insert to authenticated
  with check (auth.uid() = owner_id);
create policy "commerce_opportunities_owner_update"
  on public.cornerstone_commerce_opportunities for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
create policy "commerce_opportunities_owner_delete"
  on public.cornerstone_commerce_opportunities for delete to authenticated
  using (auth.uid() = owner_id);

revoke all on public.cornerstone_commerce_opportunities from anon;
grant select, insert, update, delete on public.cornerstone_commerce_opportunities to authenticated;

create table if not exists public.cornerstone_commerce_tests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.cornerstone_commerce_opportunities(id) on delete set null,
  creator_id text not null check (creator_id in ('cara','lila','duo','neutral')),
  platform text,
  monetisation_route text,
  product_id text,
  source_signal_ids uuid[] not null default '{}',
  content_url text,
  tracking_url text,
  cta text,
  kpi text,
  winner_rule text,
  status text default 'planned' check (status in ('planned','live','complete','cancelled')),
  impressions numeric,
  views numeric,
  clicks numeric,
  conversions numeric,
  revenue numeric,
  commission numeric,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists cornerstone_commerce_tests_owner_idx
  on public.cornerstone_commerce_tests (owner_id, created_at desc);
create index if not exists cornerstone_commerce_tests_status_idx
  on public.cornerstone_commerce_tests (owner_id, status);

alter table public.cornerstone_commerce_tests enable row level security;

drop policy if exists "commerce_tests_owner_select" on public.cornerstone_commerce_tests;
drop policy if exists "commerce_tests_owner_insert" on public.cornerstone_commerce_tests;
drop policy if exists "commerce_tests_owner_update" on public.cornerstone_commerce_tests;
drop policy if exists "commerce_tests_owner_delete" on public.cornerstone_commerce_tests;

create policy "commerce_tests_owner_select"
  on public.cornerstone_commerce_tests for select to authenticated
  using (auth.uid() = owner_id);
create policy "commerce_tests_owner_insert"
  on public.cornerstone_commerce_tests for insert to authenticated
  with check (auth.uid() = owner_id);
create policy "commerce_tests_owner_update"
  on public.cornerstone_commerce_tests for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
create policy "commerce_tests_owner_delete"
  on public.cornerstone_commerce_tests for delete to authenticated
  using (auth.uid() = owner_id);

revoke all on public.cornerstone_commerce_tests from anon;
grant select, insert, update, delete on public.cornerstone_commerce_tests to authenticated;

create or replace function public.set_updated_at_cornerstone_commerce()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_cornerstone_commerce_signals_updated_at on public.cornerstone_commerce_signals;
create trigger trg_cornerstone_commerce_signals_updated_at
  before update on public.cornerstone_commerce_signals for each row
  execute function public.set_updated_at_cornerstone_commerce();

drop trigger if exists trg_cornerstone_commerce_opportunities_updated_at on public.cornerstone_commerce_opportunities;
create trigger trg_cornerstone_commerce_opportunities_updated_at
  before update on public.cornerstone_commerce_opportunities for each row
  execute function public.set_updated_at_cornerstone_commerce();

drop trigger if exists trg_cornerstone_commerce_tests_updated_at on public.cornerstone_commerce_tests;
create trigger trg_cornerstone_commerce_tests_updated_at
  before update on public.cornerstone_commerce_tests for each row
  execute function public.set_updated_at_cornerstone_commerce();

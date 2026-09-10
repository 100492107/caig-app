-- Canonical migration for Profiles + earnings cloud sync.
-- Replaces the former one-off Supabase SQL editor script.

create table if not exists public.user_owned_media (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profiles jsonb not null default '[]'::jsonb,
  earnings jsonb not null default '{"total":0,"currency":"GBP","entries":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_owned_media enable row level security;

drop policy if exists "user_owned_media_select_own" on public.user_owned_media;
drop policy if exists "user_owned_media_insert_own" on public.user_owned_media;
drop policy if exists "user_owned_media_update_own" on public.user_owned_media;
drop policy if exists "user_owned_media_delete_own" on public.user_owned_media;

create policy "user_owned_media_select_own"
  on public.user_owned_media for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "user_owned_media_insert_own"
  on public.user_owned_media for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "user_owned_media_update_own"
  on public.user_owned_media for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "user_owned_media_delete_own"
  on public.user_owned_media for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_owned_media to authenticated;

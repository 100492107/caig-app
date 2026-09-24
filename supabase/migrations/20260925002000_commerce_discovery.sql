-- Continuous public commerce discovery and deterministic signal dedupe.

alter table public.cornerstone_commerce_signals
  add column if not exists discovery_key text;

create unique index if not exists cornerstone_commerce_signals_discovery_key_uq
  on public.cornerstone_commerce_signals(owner_id, discovery_key)
  where discovery_key is not null;

create table if not exists public.cornerstone_commerce_watchlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  query text not null,
  source_platform text not null check (source_platform in ('pinterest','vinted','depop','tiktok','tiktok_shop','temu','alibaba','other')),
  enabled boolean not null default true,
  cadence_hours integer not null default 6 check (cadence_hours between 1 and 168),
  last_scanned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cornerstone_commerce_watchlists_owner_idx
  on public.cornerstone_commerce_watchlists(owner_id, enabled, last_scanned_at);

alter table public.cornerstone_commerce_watchlists enable row level security;

drop policy if exists commerce_watchlists_owner_select on public.cornerstone_commerce_watchlists;
drop policy if exists commerce_watchlists_owner_insert on public.cornerstone_commerce_watchlists;
drop policy if exists commerce_watchlists_owner_update on public.cornerstone_commerce_watchlists;
drop policy if exists commerce_watchlists_owner_delete on public.cornerstone_commerce_watchlists;

create policy commerce_watchlists_owner_select
  on public.cornerstone_commerce_watchlists for select to authenticated
  using (auth.uid() = owner_id);
create policy commerce_watchlists_owner_insert
  on public.cornerstone_commerce_watchlists for insert to authenticated
  with check (auth.uid() = owner_id);
create policy commerce_watchlists_owner_update
  on public.cornerstone_commerce_watchlists for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
create policy commerce_watchlists_owner_delete
  on public.cornerstone_commerce_watchlists for delete to authenticated
  using (auth.uid() = owner_id);

revoke all on public.cornerstone_commerce_watchlists from anon;
grant select, insert, update, delete on public.cornerstone_commerce_watchlists to authenticated;

create or replace function public.set_updated_at_cornerstone_commerce_watchlist()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_cornerstone_commerce_watchlists_updated_at on public.cornerstone_commerce_watchlists;
create trigger trg_cornerstone_commerce_watchlists_updated_at
before update on public.cornerstone_commerce_watchlists
for each row execute function public.set_updated_at_cornerstone_commerce_watchlist();

comment on column public.cornerstone_commerce_signals.discovery_key is 'Deterministic public-signal identity used to upsert scheduled discovery results.';
comment on table public.cornerstone_commerce_watchlists is 'Owner-scoped public commerce discovery queries; worker scans them on their configured cadence.';

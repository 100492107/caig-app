-- Cornerstone research signals: bias-resistant market evidence before Build
create table if not exists public.cornerstone_research_signals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_url text,
  platform text,
  source_creator text,
  creator_baseline_views numeric,
  observed_metric_name text default 'views',
  observed_metric_value numeric,
  outlier_rationale text,
  topic text,
  mechanism text not null,
  confidence text default 'medium' check (confidence in ('high', 'medium', 'low')),
  niche text,
  status text default 'candidate' check (status in ('candidate', 'approved', 'used', 'rejected')),
  notes text,
  captured_at date default (timezone('utc', now()))::date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists cornerstone_research_signals_owner_idx
  on public.cornerstone_research_signals (owner_id, created_at desc);

create index if not exists cornerstone_research_signals_status_idx
  on public.cornerstone_research_signals (owner_id, status);

alter table public.cornerstone_research_signals enable row level security;

drop policy if exists "research_signals_owner_select" on public.cornerstone_research_signals;
drop policy if exists "research_signals_owner_insert" on public.cornerstone_research_signals;
drop policy if exists "research_signals_owner_update" on public.cornerstone_research_signals;
drop policy if exists "research_signals_owner_delete" on public.cornerstone_research_signals;

create policy "research_signals_owner_select"
  on public.cornerstone_research_signals for select to authenticated
  using (auth.uid() = owner_id);

create policy "research_signals_owner_insert"
  on public.cornerstone_research_signals for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "research_signals_owner_update"
  on public.cornerstone_research_signals for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "research_signals_owner_delete"
  on public.cornerstone_research_signals for delete to authenticated
  using (auth.uid() = owner_id);

revoke all on public.cornerstone_research_signals from anon;
grant select, insert, update, delete on public.cornerstone_research_signals to authenticated;

create or replace function public.set_updated_at_cornerstone_research_signals()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_cornerstone_research_signals_updated_at on public.cornerstone_research_signals;
create trigger trg_cornerstone_research_signals_updated_at
  before update on public.cornerstone_research_signals
  for each row execute function public.set_updated_at_cornerstone_research_signals();

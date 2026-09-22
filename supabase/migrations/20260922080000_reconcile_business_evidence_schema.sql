-- Canonical Cornerstone business/evidence schema reconciliation.
-- These tables previously existed in production without their DDL being tracked in-repo.
-- Keep this migration idempotent so it safely reconciles an already-populated database.

create table if not exists public.cornerstone_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('financial','legal','contracts','operations','ip','customer','other')),
  document_type text not null,
  title text not null,
  status text not null default 'requested' check (status in ('missing','requested','received','verified','expired','rejected')),
  issuer text,
  period_start date,
  period_end date,
  filename text,
  mime_type text,
  size_bytes bigint,
  storage_path text,
  source_url text,
  notes text,
  verification_notes text,
  verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cornerstone_case_study_updates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_ending date not null,
  title text not null,
  summary text not null,
  wins text,
  failures text,
  next_move text,
  public_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cornerstone_experiment_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  publication_id uuid references public.track_b_publications(id) on delete set null,
  creator_id text,
  platform text,
  hypothesis text not null,
  mechanism text,
  variant text,
  primary_metric text,
  success_threshold numeric,
  decision text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table if not exists public.cornerstone_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  snapshot_date date not null default current_date,
  period_days integer not null default 30 check (period_days > 0),
  scope text not null default 'business' check (scope in ('business','creator','platform')),
  creator_id text,
  platform text,
  audience_followers bigint,
  subscribers bigint,
  paid_subscribers bigint,
  views bigint,
  reach bigint,
  clicks bigint,
  conversions bigint,
  revenue numeric,
  fees numeric,
  cogs numeric,
  operating_expenses numeric,
  cash_balance numeric,
  receivables numeric,
  current_assets numeric,
  current_liabilities numeric,
  monthly_burn numeric,
  debt numeric,
  customer_count bigint,
  new_customers bigint,
  churn_rate numeric,
  cac numeric,
  ltv numeric,
  employee_count integer,
  dso_days numeric,
  notes text,
  source_type text not null default 'manual' check (source_type in ('manual','platform_api','accounting','bank','document','import')),
  source_name text,
  source_document_id uuid references public.cornerstone_documents(id) on delete set null,
  verified boolean not null default false,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Reconcile columns that were introduced during production hardening.
alter table public.local_ai_jobs
  add column if not exists persona_id text not null default 'cara';

alter table public.local_ai_jobs
  add column if not exists owner_id uuid default auth.uid();

-- Enforce the canonical access model.
alter table public.cornerstone_metric_snapshots enable row level security;
alter table public.cornerstone_documents enable row level security;
alter table public.cornerstone_case_study_updates enable row level security;
alter table public.cornerstone_experiment_log enable row level security;

revoke all on table public.cornerstone_metric_snapshots from anon;
revoke all on table public.cornerstone_documents from anon;
revoke all on table public.cornerstone_case_study_updates from anon;
revoke all on table public.cornerstone_experiment_log from anon;

grant select, insert, update, delete on table public.cornerstone_metric_snapshots to authenticated;
grant select, insert, update, delete on table public.cornerstone_documents to authenticated;
grant select, insert, update, delete on table public.cornerstone_case_study_updates to authenticated;
grant select, insert, update, delete on table public.cornerstone_experiment_log to authenticated;

drop policy if exists "cornerstone metrics select own" on public.cornerstone_metric_snapshots;
drop policy if exists "cornerstone metrics insert own" on public.cornerstone_metric_snapshots;
drop policy if exists "cornerstone metrics update own" on public.cornerstone_metric_snapshots;
drop policy if exists "cornerstone metrics delete own" on public.cornerstone_metric_snapshots;
create policy "cornerstone metrics select own" on public.cornerstone_metric_snapshots for select to authenticated using (owner_id = auth.uid());
create policy "cornerstone metrics insert own" on public.cornerstone_metric_snapshots for insert to authenticated with check (owner_id = auth.uid());
create policy "cornerstone metrics update own" on public.cornerstone_metric_snapshots for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "cornerstone metrics delete own" on public.cornerstone_metric_snapshots for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "cornerstone documents select own" on public.cornerstone_documents;
drop policy if exists "cornerstone documents insert own" on public.cornerstone_documents;
drop policy if exists "cornerstone documents update own" on public.cornerstone_documents;
drop policy if exists "cornerstone documents delete own" on public.cornerstone_documents;
create policy "cornerstone documents select own" on public.cornerstone_documents for select to authenticated using (owner_id = auth.uid());
create policy "cornerstone documents insert own" on public.cornerstone_documents for insert to authenticated with check (owner_id = auth.uid());
create policy "cornerstone documents update own" on public.cornerstone_documents for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "cornerstone documents delete own" on public.cornerstone_documents for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "case study select own" on public.cornerstone_case_study_updates;
drop policy if exists "case study insert own" on public.cornerstone_case_study_updates;
drop policy if exists "case study update own" on public.cornerstone_case_study_updates;
drop policy if exists "case study delete own" on public.cornerstone_case_study_updates;
create policy "case study select own" on public.cornerstone_case_study_updates for select to authenticated using (owner_id = auth.uid());
create policy "case study insert own" on public.cornerstone_case_study_updates for insert to authenticated with check (owner_id = auth.uid());
create policy "case study update own" on public.cornerstone_case_study_updates for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "case study delete own" on public.cornerstone_case_study_updates for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "experiments select own" on public.cornerstone_experiment_log;
drop policy if exists "experiments insert own" on public.cornerstone_experiment_log;
drop policy if exists "experiments update own" on public.cornerstone_experiment_log;
drop policy if exists "experiments delete own" on public.cornerstone_experiment_log;
create policy "experiments select own" on public.cornerstone_experiment_log for select to authenticated using (owner_id = auth.uid());
create policy "experiments insert own" on public.cornerstone_experiment_log for insert to authenticated with check (owner_id = auth.uid());
create policy "experiments update own" on public.cornerstone_experiment_log for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "experiments delete own" on public.cornerstone_experiment_log for delete to authenticated using (owner_id = auth.uid());

create or replace function public.touch_cornerstone_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cornerstone_documents_updated_at on public.cornerstone_documents;
create trigger trg_cornerstone_documents_updated_at
before update on public.cornerstone_documents
for each row execute function public.touch_cornerstone_updated_at();

drop trigger if exists trg_cornerstone_case_study_updates_updated_at on public.cornerstone_case_study_updates;
create trigger trg_cornerstone_case_study_updates_updated_at
before update on public.cornerstone_case_study_updates
for each row execute function public.touch_cornerstone_updated_at();

drop trigger if exists trg_cornerstone_experiment_log_updated_at on public.cornerstone_experiment_log;
create trigger trg_cornerstone_experiment_log_updated_at
before update on public.cornerstone_experiment_log
for each row execute function public.touch_cornerstone_updated_at();

create index if not exists cornerstone_metric_snapshots_owner_date_idx
  on public.cornerstone_metric_snapshots(owner_id, snapshot_date desc);
create index if not exists cornerstone_documents_owner_updated_idx
  on public.cornerstone_documents(owner_id, updated_at desc);
create index if not exists cornerstone_case_study_updates_owner_week_idx
  on public.cornerstone_case_study_updates(owner_id, week_ending desc);
create index if not exists cornerstone_experiment_log_owner_created_idx
  on public.cornerstone_experiment_log(owner_id, created_at desc);

-- Keep the public browser health check readable while protecting write access.
alter table public.local_ai_worker_heartbeat enable row level security;
revoke all on table public.local_ai_worker_heartbeat from anon;
grant select on table public.local_ai_worker_heartbeat to authenticated;
drop policy if exists "authenticated users can read local ai worker status" on public.local_ai_worker_heartbeat;
create policy "authenticated users can read local ai worker status"
  on public.local_ai_worker_heartbeat
  for select to authenticated
  using (true);

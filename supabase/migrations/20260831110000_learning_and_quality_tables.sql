create table if not exists public.track_b_research_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  workspace_id uuid references public.track_b_workspaces(id) on delete set null,
  job_id uuid references public.local_ai_jobs(id) on delete set null,
  research_domain text not null,
  target_topic text,
  window_days integer not null default 7 check (window_days > 0 and window_days <= 90),
  confidence text not null default 'low' check (confidence in ('low','medium','high')),
  methodology text,
  limitations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.track_b_research_signals (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid not null references public.track_b_research_runs(id) on delete cascade,
  platform text,
  source_type text,
  source text,
  title text,
  published_at timestamptz,
  url text,
  signal text,
  evidence text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.track_b_quality_gates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  project_id uuid references public.track_b_content_projects(id) on delete cascade,
  production_job_id uuid references public.track_b_production_jobs(id) on delete cascade,
  status text not null default 'required' check (status in ('required','approved','rejected')),
  checks jsonb not null default '{}'::jsonb,
  reviewer_notes text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.track_b_creative_dna (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  workspace_id uuid references public.track_b_workspaces(id) on delete set null,
  creator_id text not null,
  format text,
  hook_pattern text,
  setting_pattern text,
  action_pattern text,
  emotion text,
  caption_treatment text,
  visual_treatment text,
  audience_response jsonb not null default '{}'::jsonb,
  business_result jsonb not null default '{}'::jsonb,
  evidence_asset_id uuid references public.track_b_assets(id) on delete set null,
  status text not null default 'candidate' check (status in ('candidate','validated','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.track_b_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  workspace_id uuid references public.track_b_workspaces(id) on delete set null,
  project_id uuid references public.track_b_content_projects(id) on delete set null,
  production_job_id uuid references public.track_b_production_jobs(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.local_ai_jobs add column if not exists research_run_id uuid references public.track_b_research_runs(id) on delete set null;

alter table public.track_b_research_runs enable row level security;
alter table public.track_b_research_signals enable row level security;
alter table public.track_b_quality_gates enable row level security;
alter table public.track_b_creative_dna enable row level security;
alter table public.track_b_events enable row level security;

do $$
begin
  execute 'drop policy if exists track_b_research_runs_select on public.track_b_research_runs';
  execute 'drop policy if exists track_b_research_runs_insert on public.track_b_research_runs';
  execute 'drop policy if exists track_b_research_runs_update on public.track_b_research_runs';
  execute 'drop policy if exists track_b_research_signals_select on public.track_b_research_signals';
  execute 'drop policy if exists track_b_research_signals_insert on public.track_b_research_signals';
  execute 'drop policy if exists track_b_quality_gates_select on public.track_b_quality_gates';
  execute 'drop policy if exists track_b_quality_gates_insert on public.track_b_quality_gates';
  execute 'drop policy if exists track_b_quality_gates_update on public.track_b_quality_gates';
  execute 'drop policy if exists track_b_creative_dna_select on public.track_b_creative_dna';
  execute 'drop policy if exists track_b_creative_dna_insert on public.track_b_creative_dna';
  execute 'drop policy if exists track_b_creative_dna_update on public.track_b_creative_dna';
  execute 'drop policy if exists track_b_events_select on public.track_b_events';
  execute 'drop policy if exists track_b_events_insert on public.track_b_events';
end;
$$;

create policy track_b_research_runs_select on public.track_b_research_runs for select to authenticated using (owner_id is null or owner_id = auth.uid());
create policy track_b_research_runs_insert on public.track_b_research_runs for insert to authenticated with check (owner_id = auth.uid());
create policy track_b_research_runs_update on public.track_b_research_runs for update to authenticated using (owner_id is null or owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy track_b_research_signals_select on public.track_b_research_signals for select to authenticated using (exists (select 1 from public.track_b_research_runs r where r.id = research_run_id and (r.owner_id is null or r.owner_id = auth.uid())));
create policy track_b_research_signals_insert on public.track_b_research_signals for insert to authenticated with check (exists (select 1 from public.track_b_research_runs r where r.id = research_run_id and (r.owner_id is null or r.owner_id = auth.uid())));
create policy track_b_quality_gates_select on public.track_b_quality_gates for select to authenticated using (owner_id is null or owner_id = auth.uid());
create policy track_b_quality_gates_insert on public.track_b_quality_gates for insert to authenticated with check (owner_id = auth.uid());
create policy track_b_quality_gates_update on public.track_b_quality_gates for update to authenticated using (owner_id is null or owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy track_b_creative_dna_select on public.track_b_creative_dna for select to authenticated using (owner_id is null or owner_id = auth.uid());
create policy track_b_creative_dna_insert on public.track_b_creative_dna for insert to authenticated with check (owner_id = auth.uid());
create policy track_b_creative_dna_update on public.track_b_creative_dna for update to authenticated using (owner_id is null or owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy track_b_events_select on public.track_b_events for select to authenticated using (owner_id is null or owner_id = auth.uid());
create policy track_b_events_insert on public.track_b_events for insert to authenticated with check (owner_id = auth.uid());

create index if not exists track_b_research_runs_job_idx on public.track_b_research_runs(job_id, created_at desc);
create index if not exists track_b_research_signals_run_idx on public.track_b_research_signals(research_run_id, created_at desc);
create index if not exists track_b_quality_gates_project_idx on public.track_b_quality_gates(project_id, status, created_at desc);
create index if not exists track_b_creative_dna_workspace_idx on public.track_b_creative_dna(workspace_id, status, created_at desc);
create index if not exists track_b_events_project_idx on public.track_b_events(project_id, created_at desc);

create or replace function public.touch_track_b_hardening_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_track_b_quality_gates_updated_at on public.track_b_quality_gates;
create trigger trg_track_b_quality_gates_updated_at before update on public.track_b_quality_gates for each row execute function public.touch_track_b_hardening_updated_at();
drop trigger if exists trg_track_b_creative_dna_updated_at on public.track_b_creative_dna;
create trigger trg_track_b_creative_dna_updated_at before update on public.track_b_creative_dna for each row execute function public.touch_track_b_hardening_updated_at();

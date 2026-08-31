-- Operator leverage layer: Track A revenue, Track B outcomes/learning, captions,
-- scene contracts and asset provenance. All rows are single-operator owned today.

create table if not exists public.track_b_creative_dna (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workspace_id uuid,
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
  evidence_asset_id uuid,
  status text not null default 'candidate' check (status in ('candidate','validated','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.track_a_revenue_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dealer_id text,
  dealer_name text not null,
  event_type text not null check (event_type in ('contacted','positive_reply','sample_ready','sample_sent','diagnostic_booked','diagnostic_held','pilot_started','recurring_started','lost','follow_up_due')),
  stage text not null check (stage in ('outreach','positive','sample','diagnostic','pilot','recurring','lost')),
  value numeric(12,2),
  next_action_at timestamptz,
  notes text,
  source_listing_url text,
  sample_package jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.track_b_performance_evidence (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  creator_id text not null,
  proof_type text not null check (proof_type in ('public_social','fanvue_monetisation')),
  platform text not null,
  content_external_id text,
  title text,
  asset_id uuid,
  published_at timestamptz,
  reach numeric,
  views numeric,
  saves numeric,
  shares numeric,
  comments numeric,
  profile_actions numeric,
  clicks numeric,
  conversions numeric,
  revenue numeric(12,2),
  operator_note text,
  outcome_score numeric(6,2),
  winner boolean not null default false,
  winner_reason text,
  structure jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.track_b_learning_recommendations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  proof_type text not null check (proof_type in ('public_social','fanvue_monetisation')),
  creator_id text not null,
  platform text not null,
  source_evidence_id uuid not null references public.track_b_performance_evidence(id) on delete cascade,
  recommendation_type text not null check (recommendation_type in ('replicate','adapt','retire')),
  hook_type text,
  format text,
  first_frame_behaviour text,
  emotional_trigger text,
  invariant_pattern text,
  controlled_variations jsonb not null default '[]'::jsonb,
  reusable_prompt_context text not null,
  confidence text not null default 'medium' check (confidence in ('low','medium','high')),
  status text not null default 'active' check (status in ('active','used','retired')),
  created_at timestamptz not null default now()
);

alter table public.track_b_creative_dna add column if not exists proof_type text check (proof_type in ('public_social','fanvue_monetisation'));
alter table public.track_b_creative_dna add column if not exists source_performance_id uuid references public.track_b_performance_evidence(id) on delete set null;
alter table public.track_b_creative_dna add column if not exists first_frame_behaviour text;
alter table public.track_b_creative_dna add column if not exists emotional_trigger text;
alter table public.track_b_creative_dna add column if not exists invariant_pattern text;
alter table public.track_b_creative_dna add column if not exists reuse_count integer not null default 0;

create table if not exists public.track_b_caption_backlog (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  creator_id text not null,
  platform text not null,
  local_file_name text,
  asset_id uuid,
  local_path text,
  caption_job_id uuid references public.local_ai_jobs(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting','processing','ready','queued','published','archived')),
  context text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.track_b_scene_contracts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  production_job_id uuid,
  creator_id text not null,
  location text,
  time_of_day text,
  lighting text,
  action text,
  props jsonb not null default '[]'::jsonb,
  wardrobe text,
  composition text,
  negative_constraints jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','approved','verifying','passed','failed')),
  verification jsonb not null default '{}'::jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.track_b_asset_provenance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asset_id uuid not null,
  parent_asset_id uuid,
  source_type text not null check (source_type in ('source','derived')),
  production_job_id uuid,
  scene_contract_id uuid references public.track_b_scene_contracts(id) on delete set null,
  model text,
  provider text,
  seed text,
  prompt text,
  cost_credits numeric(10,2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists track_a_revenue_events_stage_idx on public.track_a_revenue_events(owner_id, stage, created_at desc);
create index if not exists track_a_revenue_events_next_action_idx on public.track_a_revenue_events(owner_id, next_action_at);
create index if not exists track_b_performance_evidence_winner_idx on public.track_b_performance_evidence(owner_id, winner, proof_type, created_at desc);
create index if not exists track_b_learning_recommendations_active_idx on public.track_b_learning_recommendations(owner_id, status, creator_id, created_at desc);
create index if not exists track_b_caption_backlog_status_idx on public.track_b_caption_backlog(owner_id, status, due_at, created_at desc);
create index if not exists track_b_scene_contracts_status_idx on public.track_b_scene_contracts(owner_id, status, created_at desc);
create index if not exists track_b_asset_provenance_asset_idx on public.track_b_asset_provenance(owner_id, asset_id, created_at desc);

create or replace function public.touch_operator_leverage_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_track_b_caption_backlog_updated_at on public.track_b_caption_backlog;
create trigger trg_track_b_caption_backlog_updated_at before update on public.track_b_caption_backlog for each row execute function public.touch_operator_leverage_updated_at();

alter table public.track_a_revenue_events enable row level security;
alter table public.track_b_performance_evidence enable row level security;
alter table public.track_b_learning_recommendations enable row level security;
alter table public.track_b_caption_backlog enable row level security;
alter table public.track_b_scene_contracts enable row level security;
alter table public.track_b_asset_provenance enable row level security;

DO $$
BEGIN
  create policy track_a_revenue_events_select on public.track_a_revenue_events for select to authenticated using (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  create policy track_a_revenue_events_insert on public.track_a_revenue_events for insert to authenticated with check (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  create policy track_a_revenue_events_update on public.track_a_revenue_events for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  create policy track_b_performance_evidence_select on public.track_b_performance_evidence for select to authenticated using (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  create policy track_b_performance_evidence_insert on public.track_b_performance_evidence for insert to authenticated with check (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  create policy track_b_performance_evidence_update on public.track_b_performance_evidence for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  create policy track_b_learning_recommendations_select on public.track_b_learning_recommendations for select to authenticated using (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  create policy track_b_learning_recommendations_insert on public.track_b_learning_recommendations for insert to authenticated with check (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  create policy track_b_learning_recommendations_update on public.track_b_learning_recommendations for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  create policy track_b_caption_backlog_select on public.track_b_caption_backlog for select to authenticated using (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  create policy track_b_caption_backlog_insert on public.track_b_caption_backlog for insert to authenticated with check (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  create policy track_b_caption_backlog_update on public.track_b_caption_backlog for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  create policy track_b_scene_contracts_select on public.track_b_scene_contracts for select to authenticated using (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  create policy track_b_scene_contracts_insert on public.track_b_scene_contracts for insert to authenticated with check (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  create policy track_b_scene_contracts_update on public.track_b_scene_contracts for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$
BEGIN
  create policy track_b_asset_provenance_select on public.track_b_asset_provenance for select to authenticated using (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  create policy track_b_asset_provenance_insert on public.track_b_asset_provenance for insert to authenticated with check (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$
BEGIN
  create policy track_b_asset_provenance_update on public.track_b_asset_provenance for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

comment on table public.track_b_performance_evidence is 'Post-publish evidence used to decide winners and learn what to replicate.';
comment on table public.track_b_learning_recommendations is 'Reusable learning context fed into future creative runs.';
comment on table public.track_b_scene_contracts is 'Machine-readable creative contract for pre-publish visual verification.';
comment on table public.track_b_asset_provenance is 'Full source-to-derived asset lineage with model, prompt and cost provenance.';

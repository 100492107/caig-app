create table if not exists public.track_b_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  workspace_type text not null default 'internal' check (workspace_type in ('internal','client')),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.track_b_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid null references public.track_b_workspaces(id) on delete set null,
  asset_type text not null check (asset_type in ('image','video','audio','logo','reference','document')),
  name text not null,
  provider text null,
  source_url text null,
  storage_path text null,
  public_url text null,
  prompt text null,
  metadata jsonb not null default '{}'::jsonb,
  approval_status text not null default 'approved' check (approval_status in ('draft','approved','rejected','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.track_b_characters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid null references public.track_b_workspaces(id) on delete set null,
  name text not null,
  description text null,
  voice_profile jsonb not null default '{}'::jsonb,
  style_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.track_b_character_assets (
  character_id uuid not null references public.track_b_characters(id) on delete cascade,
  asset_id uuid not null references public.track_b_assets(id) on delete cascade,
  role text not null default 'reference',
  sort_order integer not null default 0,
  primary key (character_id, asset_id)
);

create table if not exists public.track_b_brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid null references public.track_b_workspaces(id) on delete set null,
  name text not null,
  website_url text null,
  brand_voice jsonb not null default '{}'::jsonb,
  visual_guidelines jsonb not null default '{}'::jsonb,
  claims_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.track_b_products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid null references public.track_b_brands(id) on delete set null,
  name text not null,
  source_url text null,
  description text null,
  selling_points jsonb not null default '[]'::jsonb,
  claims_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.track_b_product_assets (
  product_id uuid not null references public.track_b_products(id) on delete cascade,
  asset_id uuid not null references public.track_b_assets(id) on delete cascade,
  role text not null default 'reference',
  sort_order integer not null default 0,
  primary key (product_id, asset_id)
);

create table if not exists public.track_b_content_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid null references public.track_b_workspaces(id) on delete set null,
  brand_id uuid null references public.track_b_brands(id) on delete set null,
  product_id uuid null references public.track_b_products(id) on delete set null,
  title text not null,
  source_type text not null default 'creative_brief' check (source_type in ('creative_brief','video','image','article','podcast','website','client_brief','other')),
  source_url text null,
  brief jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','planned','in_production','review','approved','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.track_b_production_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid null references public.track_b_content_projects(id) on delete cascade,
  mode text not null check (mode in ('static_image','carousel','cinematic_motion','multi_image_motion','ugc','short_form','long_form')),
  target_duration_seconds integer not null default 8 check (target_duration_seconds > 0 and target_duration_seconds <= 7200),
  output_count integer not null default 1 check (output_count > 0 and output_count <= 20),
  provider_strategy text not null default 'auto' check (provider_strategy in ('auto','local','mpt','premium')),
  estimated_credits numeric(10,2) not null default 0,
  estimated_compute_tier text not null default 'low' check (estimated_compute_tier in ('low','medium','high')),
  config jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','queued','processing','review','completed','error','cancelled')),
  source_job_id uuid null references public.mpt_video_jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null
);

create table if not exists public.track_b_production_shots (
  id uuid primary key default gen_random_uuid(),
  production_job_id uuid not null references public.track_b_production_jobs(id) on delete cascade,
  shot_order integer not null,
  duration_seconds numeric(8,2) not null default 3,
  purpose text null,
  visual_prompt text null,
  motion_prompt text null,
  voice_direction text null,
  sound_direction text null,
  reference_asset_ids jsonb not null default '[]'::jsonb,
  premium_generation boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(production_job_id, shot_order)
);

create table if not exists public.track_b_derivatives (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.track_b_content_projects(id) on delete cascade,
  parent_production_job_id uuid null references public.track_b_production_jobs(id) on delete set null,
  derivative_type text not null check (derivative_type in ('short','reel','carousel','still','clip','thumbnail','caption','metadata')),
  source_reference jsonb not null default '{}'::jsonb,
  output_url text null,
  output_path text null,
  status text not null default 'planned' check (status in ('planned','processing','completed','error')),
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists track_b_assets_workspace_idx on public.track_b_assets(workspace_id, created_at desc);
create index if not exists track_b_projects_workspace_idx on public.track_b_content_projects(workspace_id, created_at desc);
create index if not exists track_b_jobs_project_idx on public.track_b_production_jobs(project_id, created_at desc);
create index if not exists track_b_shots_job_idx on public.track_b_production_shots(production_job_id, shot_order);
create index if not exists track_b_derivatives_project_idx on public.track_b_derivatives(project_id, created_at desc);

create or replace function public.touch_track_b_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_track_b_workspaces_updated_at on public.track_b_workspaces;
create trigger trg_track_b_workspaces_updated_at before update on public.track_b_workspaces for each row execute function public.touch_track_b_updated_at();
drop trigger if exists trg_track_b_assets_updated_at on public.track_b_assets;
create trigger trg_track_b_assets_updated_at before update on public.track_b_assets for each row execute function public.touch_track_b_updated_at();
drop trigger if exists trg_track_b_characters_updated_at on public.track_b_characters;
create trigger trg_track_b_characters_updated_at before update on public.track_b_characters for each row execute function public.touch_track_b_updated_at();
drop trigger if exists trg_track_b_brands_updated_at on public.track_b_brands;
create trigger trg_track_b_brands_updated_at before update on public.track_b_brands for each row execute function public.touch_track_b_updated_at();
drop trigger if exists trg_track_b_products_updated_at on public.track_b_products;
create trigger trg_track_b_products_updated_at before update on public.track_b_products for each row execute function public.touch_track_b_updated_at();
drop trigger if exists trg_track_b_projects_updated_at on public.track_b_content_projects;
create trigger trg_track_b_projects_updated_at before update on public.track_b_content_projects for each row execute function public.touch_track_b_updated_at();
drop trigger if exists trg_track_b_jobs_updated_at on public.track_b_production_jobs;
create trigger trg_track_b_jobs_updated_at before update on public.track_b_production_jobs for each row execute function public.touch_track_b_updated_at();

alter table public.track_b_workspaces enable row level security;
alter table public.track_b_assets enable row level security;
alter table public.track_b_characters enable row level security;
alter table public.track_b_character_assets enable row level security;
alter table public.track_b_brands enable row level security;
alter table public.track_b_products enable row level security;
alter table public.track_b_product_assets enable row level security;
alter table public.track_b_content_projects enable row level security;
alter table public.track_b_production_jobs enable row level security;
alter table public.track_b_production_shots enable row level security;
alter table public.track_b_derivatives enable row level security;

-- The current application uses the anon Supabase client for operational tables.
-- These permissive policies are a development bridge and must be tightened when
-- authenticated client workspaces are introduced.
do $$
declare
  t text;
begin
  foreach t in array array[
    'track_b_workspaces','track_b_assets','track_b_characters','track_b_character_assets',
    'track_b_brands','track_b_products','track_b_product_assets','track_b_content_projects',
    'track_b_production_jobs','track_b_production_shots','track_b_derivatives'
  ] loop
    execute format('drop policy if exists %I_anon_select on public.%I', t, t);
    execute format('drop policy if exists %I_anon_insert on public.%I', t, t);
    execute format('drop policy if exists %I_anon_update on public.%I', t, t);
    execute format('create policy %I_anon_select on public.%I for select to anon, authenticated using (true)', t, t);
    execute format('create policy %I_anon_insert on public.%I for insert to anon, authenticated with check (true)', t, t);
    execute format('create policy %I_anon_update on public.%I for update to anon, authenticated using (true) with check (true)', t, t);
  end loop;
end;
$$;

comment on table public.track_b_workspaces is 'CornerstoneAIAssets Track B workspaces for internal media and future client accounts.';
comment on table public.track_b_assets is 'Persistent Track B visual/audio/reference assets used by Creative Engine and production.';
comment on table public.track_b_production_jobs is 'Cost-aware multi-format production jobs for CornerstoneAIAssets.';
comment on table public.track_b_production_shots is 'Director-level shot plan with reference assets and optional premium generation.';
comment on table public.track_b_derivatives is 'Repurposed outputs created from a source project or production job.';

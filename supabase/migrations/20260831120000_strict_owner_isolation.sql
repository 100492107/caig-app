-- Strict ownership hardening for the internal operator OS.
--
-- The previous hardening migrations intentionally tolerated NULL owner_id values
-- as a migration bridge. This migration removes that bridge for client access:
-- authenticated users may only read/write rows owned by auth.uid().
-- Service-role workers retain server-side access.
--
-- Existing NULL ownership is backfilled only when the database contains exactly
-- one non-deleted auth user (the current single-operator deployment). If there
-- is more than one user, NULL rows remain inaccessible to client roles until an
-- explicit ownership assignment is made by an operator/admin migration.

alter table if exists public.track_b_workspaces add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.track_b_assets add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.track_b_characters add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.track_b_brands add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.track_b_products add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.track_b_content_projects add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.track_b_production_jobs add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.track_b_derivatives add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.local_ai_jobs add column if not exists owner_id uuid references auth.users(id) on delete set null;

DO $$
declare
  v_user_count integer;
  v_owner uuid;
begin
  select count(*), min(id) into v_user_count, v_owner
  from auth.users
  where deleted_at is null;

  if v_user_count = 1 then
    update public.track_b_workspaces set owner_id = v_owner where owner_id is null;
    update public.track_b_assets set owner_id = v_owner where owner_id is null;
    update public.track_b_characters set owner_id = v_owner where owner_id is null;
    update public.track_b_brands set owner_id = v_owner where owner_id is null;
    update public.track_b_products set owner_id = v_owner where owner_id is null;
    update public.track_b_content_projects set owner_id = v_owner where owner_id is null;
    update public.track_b_production_jobs set owner_id = v_owner where owner_id is null;
    update public.track_b_derivatives set owner_id = v_owner where owner_id is null;
    update public.local_ai_jobs set owner_id = v_owner where owner_id is null;

    update public.track_b_research_runs set owner_id = v_owner where owner_id is null;
    update public.track_b_quality_gates set owner_id = v_owner where owner_id is null;
    update public.track_b_creative_dna set owner_id = v_owner where owner_id is null;
    update public.track_b_events set owner_id = v_owner where owner_id is null;
  end if;
end;
$$;

DO $$
declare t text;
begin
  foreach t in array array[
    'track_b_workspaces','track_b_assets','track_b_characters','track_b_brands',
    'track_b_products','track_b_content_projects','track_b_production_jobs',
    'track_b_derivatives','local_ai_jobs','track_b_research_runs',
    'track_b_quality_gates','track_b_creative_dna','track_b_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I_anon_select on public.%I', t, t);
    execute format('drop policy if exists %I_anon_insert on public.%I', t, t);
    execute format('drop policy if exists %I_anon_update on public.%I', t, t);
    execute format('drop policy if exists %I_authenticated_select on public.%I', t, t);
    execute format('drop policy if exists %I_authenticated_insert on public.%I', t, t);
    execute format('drop policy if exists %I_authenticated_update on public.%I', t, t);
    execute format('create policy %I_authenticated_select on public.%I for select to authenticated using (owner_id is not null and owner_id = auth.uid())', t, t);
    execute format('create policy %I_authenticated_insert on public.%I for insert to authenticated with check (owner_id = auth.uid())', t, t);
    execute format('create policy %I_authenticated_update on public.%I for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t, t);
  end loop;
end;
$$;

-- Link tables inherit access from their parent entities.
alter table public.track_b_character_assets enable row level security;
alter table public.track_b_product_assets enable row level security;
alter table public.track_b_production_shots enable row level security;
alter table public.track_b_research_signals enable row level security;

drop policy if exists track_b_character_assets_authenticated_select on public.track_b_character_assets;
drop policy if exists track_b_character_assets_authenticated_insert on public.track_b_character_assets;
drop policy if exists track_b_character_assets_authenticated_update on public.track_b_character_assets;
create policy track_b_character_assets_authenticated_select on public.track_b_character_assets
  for select to authenticated
  using (exists (select 1 from public.track_b_characters c where c.id = character_id and c.owner_id = auth.uid()) and exists (select 1 from public.track_b_assets a where a.id = asset_id and a.owner_id = auth.uid()));
create policy track_b_character_assets_authenticated_insert on public.track_b_character_assets
  for insert to authenticated
  with check (exists (select 1 from public.track_b_characters c where c.id = character_id and c.owner_id = auth.uid()) and exists (select 1 from public.track_b_assets a where a.id = asset_id and a.owner_id = auth.uid()));
create policy track_b_character_assets_authenticated_update on public.track_b_character_assets
  for update to authenticated
  using (exists (select 1 from public.track_b_characters c where c.id = character_id and c.owner_id = auth.uid()) and exists (select 1 from public.track_b_assets a where a.id = asset_id and a.owner_id = auth.uid()))
  with check (exists (select 1 from public.track_b_characters c where c.id = character_id and c.owner_id = auth.uid()) and exists (select 1 from public.track_b_assets a where a.id = asset_id and a.owner_id = auth.uid()));

drop policy if exists track_b_product_assets_authenticated_select on public.track_b_product_assets;
drop policy if exists track_b_product_assets_authenticated_insert on public.track_b_product_assets;
drop policy if exists track_b_product_assets_authenticated_update on public.track_b_product_assets;
create policy track_b_product_assets_authenticated_select on public.track_b_product_assets
  for select to authenticated
  using (exists (select 1 from public.track_b_products p where p.id = product_id and p.owner_id = auth.uid()) and exists (select 1 from public.track_b_assets a where a.id = asset_id and a.owner_id = auth.uid()));
create policy track_b_product_assets_authenticated_insert on public.track_b_product_assets
  for insert to authenticated
  with check (exists (select 1 from public.track_b_products p where p.id = product_id and p.owner_id = auth.uid()) and exists (select 1 from public.track_b_assets a where a.id = asset_id and a.owner_id = auth.uid()));
create policy track_b_product_assets_authenticated_update on public.track_b_product_assets
  for update to authenticated
  using (exists (select 1 from public.track_b_products p where p.id = product_id and p.owner_id = auth.uid()) and exists (select 1 from public.track_b_assets a where a.id = asset_id and a.owner_id = auth.uid()))
  with check (exists (select 1 from public.track_b_products p where p.id = product_id and p.owner_id = auth.uid()) and exists (select 1 from public.track_b_assets a where a.id = asset_id and a.owner_id = auth.uid()));

drop policy if exists track_b_production_shots_authenticated_select on public.track_b_production_shots;
drop policy if exists track_b_production_shots_authenticated_insert on public.track_b_production_shots;
drop policy if exists track_b_production_shots_authenticated_update on public.track_b_production_shots;
create policy track_b_production_shots_authenticated_select on public.track_b_production_shots
  for select to authenticated
  using (exists (select 1 from public.track_b_production_jobs j where j.id = production_job_id and j.owner_id = auth.uid()));
create policy track_b_production_shots_authenticated_insert on public.track_b_production_shots
  for insert to authenticated
  with check (exists (select 1 from public.track_b_production_jobs j where j.id = production_job_id and j.owner_id = auth.uid()));
create policy track_b_production_shots_authenticated_update on public.track_b_production_shots
  for update to authenticated
  using (exists (select 1 from public.track_b_production_jobs j where j.id = production_job_id and j.owner_id = auth.uid()))
  with check (exists (select 1 from public.track_b_production_jobs j where j.id = production_job_id and j.owner_id = auth.uid()));

drop policy if exists track_b_research_signals_authenticated_select on public.track_b_research_signals;
drop policy if exists track_b_research_signals_authenticated_insert on public.track_b_research_signals;
create policy track_b_research_signals_authenticated_select on public.track_b_research_signals
  for select to authenticated
  using (exists (select 1 from public.track_b_research_runs r where r.id = research_run_id and r.owner_id = auth.uid()));
create policy track_b_research_signals_authenticated_insert on public.track_b_research_signals
  for insert to authenticated
  with check (exists (select 1 from public.track_b_research_runs r where r.id = research_run_id and r.owner_id = auth.uid()));

-- Future writes are always owned by the current user.
alter table public.track_b_workspaces alter column owner_id set default auth.uid();
alter table public.track_b_assets alter column owner_id set default auth.uid();
alter table public.track_b_characters alter column owner_id set default auth.uid();
alter table public.track_b_brands alter column owner_id set default auth.uid();
alter table public.track_b_products alter column owner_id set default auth.uid();
alter table public.track_b_content_projects alter column owner_id set default auth.uid();
alter table public.track_b_production_jobs alter column owner_id set default auth.uid();
alter table public.track_b_derivatives alter column owner_id set default auth.uid();
alter table public.local_ai_jobs alter column owner_id set default auth.uid();
alter table public.track_b_research_runs alter column owner_id set default auth.uid();
alter table public.track_b_quality_gates alter column owner_id set default auth.uid();
alter table public.track_b_creative_dna alter column owner_id set default auth.uid();
alter table public.track_b_events alter column owner_id set default auth.uid();

create index if not exists track_b_workspaces_owner_strict_idx on public.track_b_workspaces(owner_id, created_at desc);
create index if not exists track_b_assets_owner_strict_idx on public.track_b_assets(owner_id, created_at desc);
create index if not exists track_b_jobs_owner_strict_idx on public.track_b_production_jobs(owner_id, created_at desc);
create index if not exists track_b_research_owner_strict_idx on public.track_b_research_runs(owner_id, created_at desc);
create index if not exists track_b_dna_owner_strict_idx on public.track_b_creative_dna(owner_id, created_at desc);
create index if not exists track_b_events_owner_strict_idx on public.track_b_events(owner_id, created_at desc);

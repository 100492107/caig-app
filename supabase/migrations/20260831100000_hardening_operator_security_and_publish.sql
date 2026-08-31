-- Cornerstone hardening migration.
-- Run after the existing Track B / Local AI migrations.

-- 1. Tie operator-created data to the authenticated user when possible.
alter table if exists public.track_b_workspaces add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.track_b_assets add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.track_b_characters add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.track_b_brands add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.track_b_products add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.track_b_content_projects add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.track_b_production_jobs add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.track_b_derivatives add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table if exists public.local_ai_jobs add column if not exists owner_id uuid references auth.users(id) on delete set null;

create index if not exists track_b_workspaces_owner_idx on public.track_b_workspaces(owner_id, created_at desc);
create index if not exists track_b_assets_owner_idx on public.track_b_assets(owner_id, created_at desc);
create index if not exists track_b_projects_owner_idx on public.track_b_content_projects(owner_id, created_at desc);
create index if not exists track_b_jobs_owner_idx on public.track_b_production_jobs(owner_id, created_at desc);
create index if not exists track_b_derivatives_owner_idx on public.track_b_derivatives(owner_id, created_at desc);
create index if not exists local_ai_jobs_owner_idx on public.local_ai_jobs(owner_id, created_at desc);

-- New writes default to the signed-in operator. Existing unowned internal rows remain
-- visible to authenticated operators so the hardening migration does not orphan current data.
alter table public.track_b_workspaces alter column owner_id set default auth.uid();
alter table public.track_b_assets alter column owner_id set default auth.uid();
alter table public.track_b_characters alter column owner_id set default auth.uid();
alter table public.track_b_brands alter column owner_id set default auth.uid();
alter table public.track_b_products alter column owner_id set default auth.uid();
alter table public.track_b_content_projects alter column owner_id set default auth.uid();
alter table public.track_b_production_jobs alter column owner_id set default auth.uid();
alter table public.track_b_derivatives alter column owner_id set default auth.uid();
alter table public.local_ai_jobs alter column owner_id set default auth.uid();

-- 2. Replace anonymous Track B policies with authenticated-only operator policies.
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
    execute format('drop policy if exists %I_authenticated_select on public.%I', t, t);
    execute format('drop policy if exists %I_authenticated_insert on public.%I', t, t);
    execute format('drop policy if exists %I_authenticated_update on public.%I', t, t);
    if t = 'track_b_character_assets' or t = 'track_b_product_assets' then
      execute format('create policy %I_authenticated_select on public.%I for select to authenticated using (true)', t, t);
      execute format('create policy %I_authenticated_insert on public.%I for insert to authenticated with check (true)', t, t);
      execute format('create policy %I_authenticated_update on public.%I for update to authenticated using (true) with check (true)', t, t);
    else
      execute format('create policy %I_authenticated_select on public.%I for select to authenticated using (owner_id is null or owner_id = auth.uid())', t, t);
      execute format('create policy %I_authenticated_insert on public.%I for insert to authenticated with check (owner_id = auth.uid())', t, t);
      execute format('create policy %I_authenticated_update on public.%I for update to authenticated using (owner_id is null or owner_id = auth.uid()) with check (owner_id = auth.uid())', t, t);
    end if;
  end loop;
end;
$$;

-- 3. Local AI jobs were already authenticated-only; make ownership explicit while preserving
-- unowned existing internal history for signed-in operators.
drop policy if exists "local ai jobs authenticated read" on public.local_ai_jobs;
drop policy if exists "local ai jobs authenticated insert" on public.local_ai_jobs;
drop policy if exists "local ai jobs authenticated update" on public.local_ai_jobs;
create policy "local ai jobs authenticated read" on public.local_ai_jobs
  for select to authenticated using (owner_id is null or owner_id = auth.uid());
create policy "local ai jobs authenticated insert" on public.local_ai_jobs
  for insert to authenticated with check (owner_id = auth.uid());
create policy "local ai jobs authenticated update" on public.local_ai_jobs
  for update to authenticated using (owner_id is null or owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 4. Durable publication state. This keeps retries/idempotency out of free-form notes.
alter table if exists public.content_queue add column if not exists publish_attempts integer not null default 0;
alter table if exists public.content_queue add column if not exists publishing_started_at timestamptz;
alter table if exists public.content_queue add column if not exists last_publish_error text;
alter table if exists public.content_queue add column if not exists last_publish_attempt_at timestamptz;
create index if not exists content_queue_publish_due_idx on public.content_queue(status, scheduled_date, scheduled_time);
create index if not exists content_queue_publishing_started_idx on public.content_queue(status, publishing_started_at);

comment on column public.content_queue.publish_attempts is 'Number of automated publish attempts for this queue row.';
comment on column public.content_queue.publishing_started_at is 'Timestamp at which the current publish attempt was claimed.';
comment on column public.content_queue.last_publish_error is 'Latest structured publication failure message.';
comment on column public.content_queue.last_publish_attempt_at is 'Timestamp of latest publication attempt.';

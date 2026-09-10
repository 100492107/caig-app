-- Canonical operator architecture hardening.
-- Tenant data is never globally visible to authenticated clients.

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$ select auth.uid() $$;

-- Add explicit ownership to legacy job tables so user-created work remains isolated.
alter table if exists public.caption_jobs add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists public.mpt_video_jobs add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists public.track_b_content_metrics add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table if exists public.caption_jobs alter column owner_id set default auth.uid();
alter table if exists public.mpt_video_jobs alter column owner_id set default auth.uid();
alter table if exists public.track_b_content_metrics alter column owner_id set default auth.uid();
alter table if exists public.local_ai_jobs alter column owner_id set default auth.uid();
alter table if exists public.track_b_creative_dna alter column owner_id set default auth.uid();

-- Backfill legacy rows only when there is exactly one non-deleted account.
do $$
declare
  sole_user uuid;
  user_count integer;
begin
  select count(*), min(id) into user_count, sole_user from auth.users where deleted_at is null;
  if user_count = 1 then
    update public.caption_jobs set owner_id = sole_user where owner_id is null;
    update public.mpt_video_jobs set owner_id = sole_user where owner_id is null;
    update public.track_b_content_metrics set owner_id = sole_user where owner_id is null;
    update public.local_ai_jobs set owner_id = sole_user where owner_id is null;
    update public.track_b_creative_dna set owner_id = sole_user where owner_id is null;
    update public.content_queue set client_id = sole_user where client_id is null;
  end if;
end $$;

-- Remove permissive policies before recreating owner-scoped access.
drop policy if exists "caption jobs authenticated insert" on public.caption_jobs;
drop policy if exists "caption jobs authenticated read" on public.caption_jobs;
drop policy if exists "mpt_video_jobs_anon_insert" on public.mpt_video_jobs;
drop policy if exists "mpt_video_jobs_anon_select" on public.mpt_video_jobs;
drop policy if exists "mpt_video_jobs_anon_update" on public.mpt_video_jobs;
drop policy if exists "Track B metrics authenticated delete" on public.track_b_content_metrics;
drop policy if exists "Track B metrics authenticated insert" on public.track_b_content_metrics;
drop policy if exists "Track B metrics authenticated read" on public.track_b_content_metrics;
drop policy if exists "Track B metrics authenticated update" on public.track_b_content_metrics;
drop policy if exists "local ai jobs authenticated delete" on public.local_ai_jobs;
drop policy if exists "local ai jobs authenticated insert" on public.local_ai_jobs;
drop policy if exists "local ai jobs authenticated read" on public.local_ai_jobs;
drop policy if exists "local ai jobs authenticated update" on public.local_ai_jobs;

alter table public.caption_jobs enable row level security;
alter table public.mpt_video_jobs enable row level security;
alter table public.track_b_content_metrics enable row level security;
alter table public.track_b_creative_dna enable row level security;
alter table public.local_ai_jobs enable row level security;
alter table public.content_queue enable row level security;

create policy "caption_jobs_owner_select" on public.caption_jobs
  for select to authenticated using (owner_id = auth.uid());
create policy "caption_jobs_owner_insert" on public.caption_jobs
  for insert to authenticated with check (owner_id = auth.uid());
create policy "caption_jobs_owner_update" on public.caption_jobs
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "caption_jobs_owner_delete" on public.caption_jobs
  for delete to authenticated using (owner_id = auth.uid());

create policy "mpt_video_jobs_owner_select" on public.mpt_video_jobs
  for select to authenticated using (owner_id = auth.uid());
create policy "mpt_video_jobs_owner_insert" on public.mpt_video_jobs
  for insert to authenticated with check (owner_id = auth.uid());
create policy "mpt_video_jobs_owner_update" on public.mpt_video_jobs
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "mpt_video_jobs_owner_delete" on public.mpt_video_jobs
  for delete to authenticated using (owner_id = auth.uid());

create policy "track_b_metrics_owner_select" on public.track_b_content_metrics
  for select to authenticated using (owner_id = auth.uid());
create policy "track_b_metrics_owner_insert" on public.track_b_content_metrics
  for insert to authenticated with check (owner_id = auth.uid());
create policy "track_b_metrics_owner_update" on public.track_b_content_metrics
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "track_b_metrics_owner_delete" on public.track_b_content_metrics
  for delete to authenticated using (owner_id = auth.uid());

-- Existing creative DNA policies were ineffective because RLS was disabled in production.
drop policy if exists "track_b_creative_dna_owner_select" on public.track_b_creative_dna;
drop policy if exists "track_b_creative_dna_owner_insert" on public.track_b_creative_dna;
drop policy if exists "track_b_creative_dna_owner_update" on public.track_b_creative_dna;
drop policy if exists "track_b_creative_dna_owner_delete" on public.track_b_creative_dna;
create policy "track_b_creative_dna_owner_select" on public.track_b_creative_dna
  for select to authenticated using (owner_id = auth.uid());
create policy "track_b_creative_dna_owner_insert" on public.track_b_creative_dna
  for insert to authenticated with check (owner_id = auth.uid());
create policy "track_b_creative_dna_owner_update" on public.track_b_creative_dna
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "track_b_creative_dna_owner_delete" on public.track_b_creative_dna
  for delete to authenticated using (owner_id = auth.uid());

-- Tighten local AI jobs completely to owner scope. Service-role workers bypass RLS.
create policy "local_ai_jobs_owner_delete" on public.local_ai_jobs
  for delete to authenticated using (owner_id = auth.uid());

create policy "content_queue_owner_insert" on public.content_queue
  for insert to authenticated with check (client_id = auth.uid());
create policy "content_queue_owner_update" on public.content_queue
  for update to authenticated using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "content_queue_owner_delete" on public.content_queue
  for delete to authenticated using (client_id = auth.uid());

create index if not exists caption_jobs_owner_id_idx on public.caption_jobs(owner_id);
create index if not exists mpt_video_jobs_owner_id_idx on public.mpt_video_jobs(owner_id);
create index if not exists track_b_content_metrics_owner_id_idx on public.track_b_content_metrics(owner_id);
create index if not exists track_b_creative_dna_owner_id_idx on public.track_b_creative_dna(owner_id);
create index if not exists local_ai_jobs_owner_id_idx on public.local_ai_jobs(owner_id);
create index if not exists content_queue_client_id_idx on public.content_queue(client_id);

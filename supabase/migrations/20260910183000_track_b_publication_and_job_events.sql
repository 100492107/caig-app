create table if not exists public.track_b_publications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid references public.track_b_content_projects(id) on delete set null,
  asset_id uuid references public.track_b_assets(id) on delete set null,
  production_job_id uuid references public.track_b_production_jobs(id) on delete set null,
  derivative_id uuid references public.track_b_derivatives(id) on delete set null,
  platform text not null,
  external_content_id text,
  title text,
  status text not null default 'draft',
  scheduled_at timestamptz,
  published_at timestamptz,
  publish_attempts integer not null default 0,
  last_attempt_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists track_b_publications_owner_idx on public.track_b_publications(owner_id);
create index if not exists track_b_publications_status_idx on public.track_b_publications(owner_id, status);
create index if not exists track_b_publications_schedule_idx on public.track_b_publications(status, scheduled_at);

alter table public.track_b_publications enable row level security;

drop policy if exists track_b_publications_owner_select on public.track_b_publications;
drop policy if exists track_b_publications_owner_insert on public.track_b_publications;
drop policy if exists track_b_publications_owner_update on public.track_b_publications;
drop policy if exists track_b_publications_owner_delete on public.track_b_publications;

create policy track_b_publications_owner_select on public.track_b_publications for select to authenticated using (owner_id = auth.uid());
create policy track_b_publications_owner_insert on public.track_b_publications for insert to authenticated with check (owner_id = auth.uid());
create policy track_b_publications_owner_update on public.track_b_publications for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy track_b_publications_owner_delete on public.track_b_publications for delete to authenticated using (owner_id = auth.uid());

create table if not exists public.track_b_job_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  job_id uuid,
  job_type text,
  stage text not null,
  event_type text not null,
  status text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists track_b_job_events_owner_idx on public.track_b_job_events(owner_id, created_at desc);
create index if not exists track_b_job_events_job_idx on public.track_b_job_events(job_id, created_at desc);

alter table public.track_b_job_events enable row level security;

drop policy if exists track_b_job_events_owner_select on public.track_b_job_events;
drop policy if exists track_b_job_events_owner_insert on public.track_b_job_events;
drop policy if exists track_b_job_events_owner_delete on public.track_b_job_events;

create policy track_b_job_events_owner_select on public.track_b_job_events for select to authenticated using (owner_id = auth.uid());
create policy track_b_job_events_owner_insert on public.track_b_job_events for insert to authenticated with check (owner_id = auth.uid());
create policy track_b_job_events_owner_delete on public.track_b_job_events for delete to authenticated using (owner_id = auth.uid());

alter table public.content_queue add column if not exists publication_id uuid references public.track_b_publications(id) on delete set null;
create index if not exists content_queue_publication_idx on public.content_queue(publication_id);

create or replace function public.track_b_touch_publication_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists track_b_publications_touch_updated_at on public.track_b_publications;
create trigger track_b_publications_touch_updated_at
before update on public.track_b_publications
for each row execute function public.track_b_touch_publication_updated_at();

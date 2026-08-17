create table if not exists public.mpt_video_jobs (
  id uuid primary key default gen_random_uuid(),
  content_queue_id uuid null,
  status text not null default 'queued' check (status in ('queued','processing','completed','error','cancelled')),
  provider text not null default 'moneyprinterturbo',
  payload jsonb not null,
  mpt_task_id text null,
  file_path text null,
  output_path text null,
  output_url text null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null
);

create index if not exists mpt_video_jobs_status_created_idx
  on public.mpt_video_jobs(status, created_at);

create index if not exists mpt_video_jobs_content_queue_idx
  on public.mpt_video_jobs(content_queue_id);

create or replace function public.touch_mpt_video_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_mpt_video_jobs_updated_at on public.mpt_video_jobs;
create trigger trg_mpt_video_jobs_updated_at
before update on public.mpt_video_jobs
for each row execute function public.touch_mpt_video_jobs_updated_at();

-- The existing app uses the anon Supabase client for operational tables.
-- Keep these policies aligned with that model; tighten them once auth is enforced.
alter table public.mpt_video_jobs enable row level security;
drop policy if exists mpt_video_jobs_anon_select on public.mpt_video_jobs;
drop policy if exists mpt_video_jobs_anon_insert on public.mpt_video_jobs;
drop policy if exists mpt_video_jobs_anon_update on public.mpt_video_jobs;
create policy mpt_video_jobs_anon_select on public.mpt_video_jobs for select to anon, authenticated using (true);
create policy mpt_video_jobs_anon_insert on public.mpt_video_jobs for insert to anon, authenticated with check (true);
create policy mpt_video_jobs_anon_update on public.mpt_video_jobs for update to anon, authenticated using (true) with check (true);

comment on table public.mpt_video_jobs is 'Queued local MoneyPrinterTurbo production jobs. Browser queues work here; the Mac worker executes the jobs against localhost:8080.';

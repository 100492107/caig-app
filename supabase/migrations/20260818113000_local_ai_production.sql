alter table public.local_ai_jobs
  add column if not exists persona_id text not null default 'cara',
  add column if not exists production_status text not null default 'not_started',
  add column if not exists video_url text,
  add column if not exists caption_job_id uuid,
  add column if not exists captioned_video_url text;

alter table public.local_ai_jobs
  drop constraint if exists local_ai_jobs_production_status_check;

alter table public.local_ai_jobs
  add constraint local_ai_jobs_production_status_check
  check (production_status in ('not_started','producing','video_ready','caption_queued','captioning','completed','error'));

drop policy if exists "local ai jobs authenticated delete" on public.local_ai_jobs;
create policy "local ai jobs authenticated delete"
  on public.local_ai_jobs
  for delete to authenticated using (true);

create index if not exists local_ai_jobs_production_status_idx
  on public.local_ai_jobs(production_status, created_at);

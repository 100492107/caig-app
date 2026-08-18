create table if not exists public.caption_jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Caption render',
  source_url text not null,
  transcript text,
  word_timestamps jsonb,
  hook text,
  style text not null default 'cara_editorial',
  aspect_ratio text not null default '9:16',
  position text not null default 'lower_center',
  options jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','processing','completed','error')),
  output_path text,
  output_url text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists caption_jobs_status_created_idx on public.caption_jobs(status, created_at);

alter table public.caption_jobs enable row level security;

drop policy if exists "caption jobs authenticated read" on public.caption_jobs;
create policy "caption jobs authenticated read" on public.caption_jobs
  for select to authenticated using (true);

drop policy if exists "caption jobs authenticated insert" on public.caption_jobs;
create policy "caption jobs authenticated insert" on public.caption_jobs
  for insert to authenticated with check (true);

-- The local worker uses the service-role key and therefore bypasses RLS.

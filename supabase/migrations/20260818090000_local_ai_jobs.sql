create table if not exists public.local_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Local AI job',
  job_type text not null default 'creative_director',
  model text not null default 'orcarouter/Qwen3.8-27B-Uncensored-MLX',
  system_prompt text,
  user_prompt text not null,
  options jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','processing','completed','error')),
  result text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists local_ai_jobs_status_created_idx on public.local_ai_jobs(status, created_at);

alter table public.local_ai_jobs enable row level security;

drop policy if exists "local ai jobs authenticated read" on public.local_ai_jobs;
create policy "local ai jobs authenticated read" on public.local_ai_jobs
  for select to authenticated using (true);

drop policy if exists "local ai jobs authenticated insert" on public.local_ai_jobs;
create policy "local ai jobs authenticated insert" on public.local_ai_jobs
  for insert to authenticated with check (true);

-- The local Qwen worker uses the service-role key and therefore bypasses RLS.

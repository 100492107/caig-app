drop policy if exists "local ai jobs authenticated update"
  on public.local_ai_jobs;

create policy "local ai jobs authenticated update"
  on public.local_ai_jobs
  for update
  to authenticated
  using (true)
  with check (true);

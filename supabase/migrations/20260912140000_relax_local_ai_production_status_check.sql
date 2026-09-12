-- production_status is an execution-stage label used by multiple specialist workers.
-- It is not the canonical job status (queued/processing/completed/error), so a hard-coded
-- finite enum caused otherwise valid YouTube/creator ingestion jobs to fail before workers
-- could run. Keep the column constrained to safe lowercase stage tokens while allowing
-- specialist pipelines to introduce new stages without breaking queue insertion.

alter table if exists public.local_ai_jobs
  drop constraint if exists local_ai_jobs_production_status_check;

alter table if exists public.local_ai_jobs
  add constraint local_ai_jobs_production_status_check
  check (
    production_status is null
    or production_status = ''
    or production_status ~ '^[a-z0-9_]+$'
  );

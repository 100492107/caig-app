-- Enforce the V10 quality gate at the data layer.
-- A production job may be drafted or queued without approval, but it may not
-- enter processing/completed unless an approved quality gate exists.

alter table if exists public.track_b_production_jobs
  add column if not exists cost_tier text not null default 'low'
    check (cost_tier in ('low','medium','high'));
alter table if exists public.track_b_production_jobs
  add column if not exists actual_credits numeric(10,2);
alter table if exists public.track_b_production_jobs
  add column if not exists failure_stage text;
alter table if exists public.track_b_production_jobs
  add column if not exists failure_code text;
alter table if exists public.track_b_production_jobs
  add column if not exists provider text;

create index if not exists track_b_jobs_status_cost_idx
  on public.track_b_production_jobs(status, cost_tier, created_at desc);

comment on column public.track_b_production_jobs.cost_tier is 'Selected production cost tier before inference spend.';
comment on column public.track_b_production_jobs.actual_credits is 'Observed provider/local compute cost after execution.';
comment on column public.track_b_production_jobs.failure_stage is 'Pipeline stage at which execution failed.';
comment on column public.track_b_production_jobs.failure_code is 'Stable machine-readable failure category.';
comment on column public.track_b_production_jobs.provider is 'Actual execution provider selected for the job.';

create or replace function public.enforce_track_b_quality_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('processing', 'completed')
     and coalesce(old.status, 'draft') <> new.status then
    if not exists (
      select 1
      from public.track_b_quality_gates g
      where g.production_job_id = new.id
        and g.status = 'approved'
    ) then
      raise exception 'QUALITY_GATE_REQUIRED: production job % cannot enter % before approval', new.id, new.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_track_b_quality_gate_before_processing on public.track_b_production_jobs;
create trigger trg_track_b_quality_gate_before_processing
before update on public.track_b_production_jobs
for each row execute function public.enforce_track_b_quality_gate();

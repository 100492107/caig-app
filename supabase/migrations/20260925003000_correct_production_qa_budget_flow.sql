-- Correct the final-QA lifecycle: production may start before final QA.
-- Budget is checked at the moment canonical production enters processing.
create or replace function public.enforce_track_b_quality_gate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'completed'
     and coalesce(old.status, 'draft') <> 'completed' then
    if not exists (
      select 1
      from public.track_b_quality_gates g
      where g.production_job_id = new.id
        and g.status = 'approved'
    ) then
      raise exception 'QUALITY_GATE_REQUIRED: production job % cannot complete before final QA approval', new.id;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.check_track_b_production_budget()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cap numeric;
  committed numeric;
begin
  if new.status = 'processing' and coalesce(old.status, 'draft') <> 'processing' then
    select daily_estimated_credits_cap
      into cap
    from public.track_b_operator_settings
    where owner_id = new.owner_id;

    cap := coalesce(cap, 50);

    select coalesce(sum(coalesce(estimated_credits, 0)), 0)
      into committed
    from public.track_b_production_jobs
    where owner_id = new.owner_id
      and id <> new.id
      and created_at >= date_trunc('day', timezone('utc', now()))
      and status in ('queued','processing','review','completed');

    if committed + coalesce(new.estimated_credits, 0) > cap then
      raise exception 'PRODUCTION_BUDGET_BLOCKED: daily estimated credits cap (%) would be exceeded', cap;
    end if;

    new.budget_status := 'allowed';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_track_b_quality_gate() from public, anon, authenticated;
revoke all on function public.check_track_b_production_budget() from public, anon, authenticated;

comment on function public.enforce_track_b_quality_gate() is 'Final QA enforcement: canonical production may run, but cannot become completed until the automated production QA gate is approved.';
comment on function public.check_track_b_production_budget() is 'Owner-scoped daily estimated-credit guard evaluated when canonical production starts.';

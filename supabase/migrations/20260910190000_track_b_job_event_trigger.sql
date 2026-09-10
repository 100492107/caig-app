create or replace function public.track_b_log_job_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.track_b_job_events(owner_id, job_id, job_type, stage, event_type, status, message, metadata)
    values (
      coalesce(new.owner_id, old.owner_id),
      new.id,
      new.job_type,
      case
        when new.job_type like '%media_ingestion%' then 'ingestion'
        when new.job_type like '%content%' then 'content'
        when new.job_type like '%scene%' then 'qa'
        when new.job_type like '%outreach%' or new.job_type = 'trend_scan' then 'revenue'
        else coalesce(new.production_status, 'job')
      end,
      case when tg_op = 'INSERT' then 'created' else 'status_changed' end,
      new.status,
      case when tg_op = 'INSERT' then 'Job created' else concat('Job status changed to ', new.status) end,
      jsonb_build_object('production_status', new.production_status)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists track_b_local_ai_job_events on public.local_ai_jobs;
create trigger track_b_local_ai_job_events
after insert or update of status, production_status on public.local_ai_jobs
for each row execute function public.track_b_log_job_event();

revoke execute on function public.track_b_log_job_event() from anon;
revoke execute on function public.track_b_log_job_event() from authenticated;

-- Automatic winner/learning decisions, production QA handoff and spend controls.
-- September 2026 Track B completion layer.

alter table public.track_b_performance_evidence
  add column if not exists baseline_views numeric,
  add column if not exists baseline_engagement_rate numeric,
  add column if not exists performance_multiple numeric,
  add column if not exists decision text not null default 'pending'
    check (decision in ('pending','winner','neutral','underperforming','insufficient_evidence')),
  add column if not exists decision_reason text,
  add column if not exists decision_confidence text
    check (decision_confidence in ('low','medium','high')),
  add column if not exists evaluated_at timestamptz,
  add column if not exists evaluation_version text not null default 'v1';

alter table public.track_b_quality_gates
  add column if not exists qa_type text not null default 'production',
  add column if not exists score numeric(6,2),
  add column if not exists qa_provider text,
  add column if not exists qa_model text,
  add column if not exists attempt_number integer not null default 0,
  add column if not exists failure_code text,
  add column if not exists media_url text;

alter table public.track_b_production_jobs
  add column if not exists quality_gate_id uuid references public.track_b_quality_gates(id) on delete set null,
  add column if not exists quality_status text not null default 'required'
    check (quality_status in ('required','processing','approved','rejected')),
  add column if not exists qa_attempts integer not null default 0,
  add column if not exists spend_cap_credits numeric(10,2) not null default 0,
  add column if not exists budget_status text not null default 'unassessed'
    check (budget_status in ('unassessed','allowed','blocked','completed')),
  add column if not exists estimated_cost_usd numeric(12,4),
  add column if not exists actual_cost_usd numeric(12,4);

create table if not exists public.track_b_learning_decisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  performance_evidence_id uuid not null unique references public.track_b_performance_evidence(id) on delete cascade,
  baseline_sample_count integer not null default 0,
  baseline_views numeric,
  current_views numeric,
  performance_multiple numeric,
  baseline_engagement_rate numeric,
  current_engagement_rate numeric,
  decision text not null check (decision in ('winner','neutral','underperforming','insufficient_evidence')),
  recommendation_type text not null check (recommendation_type in ('replicate','adapt','retire')),
  confidence text not null default 'low' check (confidence in ('low','medium','high')),
  reason text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  evaluated_at timestamptz not null default now()
);

create index if not exists track_b_learning_decisions_owner_idx
  on public.track_b_learning_decisions(owner_id, decision, created_at desc);

create table if not exists public.track_b_operator_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  daily_estimated_credits_cap numeric(10,2) not null default 50,
  max_qa_attempts integer not null default 1 check (max_qa_attempts between 1 and 5),
  require_visual_qa boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.track_b_learning_decisions enable row level security;
alter table public.track_b_operator_settings enable row level security;

drop policy if exists track_b_learning_decisions_select on public.track_b_learning_decisions;
drop policy if exists track_b_learning_decisions_insert on public.track_b_learning_decisions;
drop policy if exists track_b_learning_decisions_update on public.track_b_learning_decisions;
create policy track_b_learning_decisions_select on public.track_b_learning_decisions
  for select to authenticated using (owner_id = auth.uid());
create policy track_b_learning_decisions_insert on public.track_b_learning_decisions
  for insert to authenticated with check (owner_id = auth.uid());
create policy track_b_learning_decisions_update on public.track_b_learning_decisions
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists track_b_operator_settings_select on public.track_b_operator_settings;
drop policy if exists track_b_operator_settings_insert on public.track_b_operator_settings;
drop policy if exists track_b_operator_settings_update on public.track_b_operator_settings;
create policy track_b_operator_settings_select on public.track_b_operator_settings
  for select to authenticated using (owner_id = auth.uid());
create policy track_b_operator_settings_insert on public.track_b_operator_settings
  for insert to authenticated with check (owner_id = auth.uid());
create policy track_b_operator_settings_update on public.track_b_operator_settings
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.ensure_track_b_operator_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.track_b_operator_settings(owner_id)
  values (new.owner_id)
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_ensure_track_b_operator_settings on public.track_b_production_jobs;
create trigger trg_ensure_track_b_operator_settings
after insert on public.track_b_production_jobs
for each row execute function public.ensure_track_b_operator_settings();

create or replace function public.ensure_track_b_quality_gate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  gate_id uuid;
begin
  select id into gate_id
  from public.track_b_quality_gates
  where production_job_id = new.id
  order by created_at desc
  limit 1;

  if gate_id is null then
    insert into public.track_b_quality_gates(
      owner_id,
      project_id,
      production_job_id,
      status,
      qa_type,
      attempt_number
    )
    values (
      new.owner_id,
      new.project_id,
      new.id,
      'required',
      'production',
      0
    )
    returning id into gate_id;
  end if;

  update public.track_b_production_jobs
  set quality_gate_id = gate_id
  where id = new.id
    and quality_gate_id is null;

  return new;
end;
$$;

drop trigger if exists trg_ensure_track_b_quality_gate on public.track_b_production_jobs;
create trigger trg_ensure_track_b_quality_gate
after insert on public.track_b_production_jobs
for each row execute function public.ensure_track_b_quality_gate();

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

drop trigger if exists trg_check_track_b_production_budget on public.track_b_production_jobs;
create trigger trg_check_track_b_production_budget
before update of status on public.track_b_production_jobs
for each row execute function public.check_track_b_production_budget();

create or replace function public.evaluate_track_b_performance_evidence(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cur record;
  base_count integer := 0;
  base_views numeric;
  base_eng numeric;
  cur_eng numeric;
  multiple numeric;
  decision_value text;
  recommendation text;
  conf text;
  reason text;
  source_structure jsonb;
begin
  select *
    into cur
  from public.track_b_performance_evidence
  where id = p_id;

  if cur.id is null or cur.owner_id is null then
    return;
  end if;

  select
    count(*)::integer,
    percentile_cont(0.5) within group(order by views),
    percentile_cont(0.5) within group(
      order by (
        coalesce(saves,0) + coalesce(shares,0) + coalesce(comments,0) + coalesce(profile_actions,0)
      ) / nullif(views,0)
    )
  into base_count, base_views, base_eng
  from public.track_b_performance_evidence e
  where e.owner_id = cur.owner_id
    and e.creator_id = cur.creator_id
    and e.platform = cur.platform
    and e.proof_type = cur.proof_type
    and e.id <> cur.id
    and e.created_at < cur.created_at
    and e.views is not null
    and e.views > 0;

  cur_eng := (
    coalesce(cur.saves,0) + coalesce(cur.shares,0) +
    coalesce(cur.comments,0) + coalesce(cur.profile_actions,0)
  ) / nullif(cur.views,0);

  multiple := cur.views / nullif(base_views,0);

  if base_count < 3 or base_views is null then
    decision_value := 'insufficient_evidence';
    recommendation := 'adapt';
    conf := 'low';
    reason := format('Only %s comparable prior results exist; keep this result as a baseline candidate rather than declaring a winner.', base_count);
  elsif multiple >= 1.50
     or (multiple >= 1.00 and cur_eng is not null and base_eng is not null and cur_eng >= base_eng * 1.35) then
    decision_value := 'winner';
    recommendation := 'replicate';
    conf := case when base_count >= 8 then 'high' when base_count >= 5 then 'medium' else 'low' end;
    reason := format('Current result is %.2fx the comparable median view baseline, with engagement-rate evidence used as a secondary signal.', coalesce(multiple,0));
  elsif multiple <= 0.60
     and (base_eng is null or cur_eng is null or cur_eng < base_eng * 1.10) then
    decision_value := 'underperforming';
    recommendation := 'retire';
    conf := case when base_count >= 8 then 'high' when base_count >= 5 then 'medium' else 'low' end;
    reason := format('Current result is %.2fx the comparable median view baseline without a compensating engagement-rate signal.', coalesce(multiple,0));
  else
    decision_value := 'neutral';
    recommendation := 'adapt';
    conf := case when base_count >= 8 then 'high' when base_count >= 5 then 'medium' else 'low' end;
    reason := format('Current result is %.2fx the comparable median view baseline and does not clear the winner or underperformance threshold.', coalesce(multiple,0));
  end if;

  source_structure := coalesce(cur.structure, '{}'::jsonb);

  update public.track_b_performance_evidence
  set baseline_views = base_views,
      baseline_engagement_rate = base_eng,
      performance_multiple = multiple,
      decision = decision_value,
      decision_reason = reason,
      decision_confidence = conf,
      evaluated_at = now(),
      winner = decision_value = 'winner',
      winner_reason = case when decision_value = 'winner' then reason else null end,
      outcome_score = case
        when multiple is null then null
        else round((least(greatest(multiple * 50, 0), 100))::numeric, 2)
      end
  where id = p_id;

  insert into public.track_b_learning_decisions(
    owner_id,
    performance_evidence_id,
    baseline_sample_count,
    baseline_views,
    current_views,
    performance_multiple,
    baseline_engagement_rate,
    current_engagement_rate,
    decision,
    recommendation_type,
    confidence,
    reason,
    evidence
  )
  values (
    cur.owner_id,
    cur.id,
    base_count,
    base_views,
    cur.views,
    multiple,
    base_eng,
    cur_eng,
    decision_value,
    recommendation,
    conf,
    reason,
    jsonb_build_object(
      'evaluation_version','v1',
      'creator_id',cur.creator_id,
      'platform',cur.platform,
      'proof_type',cur.proof_type,
      'views',cur.views,
      'engagement_rate',cur_eng
    )
  )
  on conflict (performance_evidence_id) do update set
    baseline_sample_count = excluded.baseline_sample_count,
    baseline_views = excluded.baseline_views,
    current_views = excluded.current_views,
    performance_multiple = excluded.performance_multiple,
    baseline_engagement_rate = excluded.baseline_engagement_rate,
    current_engagement_rate = excluded.current_engagement_rate,
    decision = excluded.decision,
    recommendation_type = excluded.recommendation_type,
    confidence = excluded.confidence,
    reason = excluded.reason,
    evidence = excluded.evidence,
    evaluated_at = now();

  if decision_value in ('winner','underperforming') then
    insert into public.track_b_learning_recommendations(
      owner_id,
      proof_type,
      creator_id,
      platform,
      source_evidence_id,
      recommendation_type,
      hook_type,
      format,
      first_frame_behaviour,
      emotional_trigger,
      invariant_pattern,
      controlled_variations,
      reusable_prompt_context,
      confidence,
      status
    )
    values (
      cur.owner_id,
      cur.proof_type,
      cur.creator_id,
      cur.platform,
      cur.id,
      recommendation,
      source_structure->>'hook',
      source_structure->>'format',
      source_structure->>'first_frame',
      source_structure->>'emotional_trigger',
      coalesce(source_structure->>'invariant_pattern', cur.operator_note),
      case
        when decision_value = 'winner' then
          jsonb_build_array(
            jsonb_build_object('variation','hold the proven hook and change setting'),
            jsonb_build_object('variation','hold the proven format and change emotional trigger'),
            jsonb_build_object('variation','hold the proven emotional trigger and change opening image')
          )
        else
          jsonb_build_array(
            jsonb_build_object('variation','change the first frame'),
            jsonb_build_object('variation','change the hook/angle'),
            jsonb_build_object('variation','retire the current treatment if repeated')
          )
      end,
      jsonb_build_object(
        'decision',decision_value,
        'performance_multiple',multiple,
        'baseline_views',base_views,
        'baseline_engagement_rate',base_eng,
        'current_engagement_rate',cur_eng,
        'reason',reason,
        'source_structure',source_structure
      )::text,
      conf,
      'active'
    )
    on conflict (source_evidence_id) do update set
      recommendation_type = excluded.recommendation_type,
      hook_type = excluded.hook_type,
      format = excluded.format,
      first_frame_behaviour = excluded.first_frame_behaviour,
      emotional_trigger = excluded.emotional_trigger,
      invariant_pattern = excluded.invariant_pattern,
      controlled_variations = excluded.controlled_variations,
      reusable_prompt_context = excluded.reusable_prompt_context,
      confidence = excluded.confidence,
      status = 'active';
  end if;
end;
$$;

create or replace function public.trg_auto_evaluate_track_b_performance()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.evaluate_track_b_performance_evidence(new.id);
  return new;
end;
$$;

drop trigger if exists trg_auto_evaluate_track_b_performance on public.track_b_performance_evidence;
create trigger trg_auto_evaluate_track_b_performance
after insert or update of views, saves, shares, comments, profile_actions, revenue on public.track_b_performance_evidence
for each row execute function public.trg_auto_evaluate_track_b_performance();

comment on table public.track_b_learning_decisions is 'Automatic winner/neutral/underperforming decisions derived from comparable owned performance evidence.';
comment on table public.track_b_operator_settings is 'Per-owner production budget and QA controls.';
comment on column public.track_b_production_jobs.quality_status is 'Production QA state; completed means the automated QA gate has passed.';
comment on column public.track_b_production_jobs.spend_cap_credits is 'Operator/provider-specific credit ceiling for this production job.';

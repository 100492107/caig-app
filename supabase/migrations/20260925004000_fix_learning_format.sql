-- Fix PostgreSQL decision-reason formatting in automatic winner evaluation.
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
  select * into cur
  from public.track_b_performance_evidence
  where id = p_id;

  if cur.id is null or cur.owner_id is null then return; end if;

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
    reason := 'Only ' || base_count::text || ' comparable prior results exist; keep this result as a baseline candidate rather than declaring a winner.';
  elsif multiple >= 1.50
     or (multiple >= 1.00 and cur_eng is not null and base_eng is not null and cur_eng >= base_eng * 1.35) then
    decision_value := 'winner';
    recommendation := 'replicate';
    conf := case when base_count >= 8 then 'high' when base_count >= 5 then 'medium' else 'low' end;
    reason := 'Current result is ' || to_char(coalesce(multiple,0), 'FM990D00') || 'x the comparable median view baseline, with engagement-rate evidence used as a secondary signal.';
  elsif multiple <= 0.60
     and (base_eng is null or cur_eng is null or cur_eng < base_eng * 1.10) then
    decision_value := 'underperforming';
    recommendation := 'retire';
    conf := case when base_count >= 8 then 'high' when base_count >= 5 then 'medium' else 'low' end;
    reason := 'Current result is ' || to_char(coalesce(multiple,0), 'FM990D00') || 'x the comparable median view baseline without a compensating engagement-rate signal.';
  else
    decision_value := 'neutral';
    recommendation := 'adapt';
    conf := case when base_count >= 8 then 'high' when base_count >= 5 then 'medium' else 'low' end;
    reason := 'Current result is ' || to_char(coalesce(multiple,0), 'FM990D00') || 'x the comparable median view baseline and does not clear the winner or underperformance threshold.';
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
    owner_id, performance_evidence_id, baseline_sample_count, baseline_views,
    current_views, performance_multiple, baseline_engagement_rate,
    current_engagement_rate, decision, recommendation_type, confidence,
    reason, evidence
  )
  values (
    cur.owner_id, cur.id, base_count, base_views, cur.views, multiple,
    base_eng, cur_eng, decision_value, recommendation, conf, reason,
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
      owner_id, proof_type, creator_id, platform, source_evidence_id,
      recommendation_type, hook_type, format, first_frame_behaviour,
      emotional_trigger, invariant_pattern, controlled_variations,
      reusable_prompt_context, confidence, status
    )
    values (
      cur.owner_id, cur.proof_type, cur.creator_id, cur.platform, cur.id,
      recommendation, source_structure->>'hook', source_structure->>'format',
      source_structure->>'first_frame', source_structure->>'emotional_trigger',
      coalesce(source_structure->>'invariant_pattern', cur.operator_note),
      case when decision_value = 'winner' then
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
      conf, 'active'
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

revoke all on function public.evaluate_track_b_performance_evidence(uuid) from public, anon, authenticated;

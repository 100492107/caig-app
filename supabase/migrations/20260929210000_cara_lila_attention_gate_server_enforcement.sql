-- Server-side enforcement for the Cara + Lila Attention Gate.
-- The lane is carried inside the canonical Track B project brief JSON.
-- ATTENTION / CONTROVERSY packages cannot be persisted unless the gate clears.

CREATE OR REPLACE FUNCTION public.create_track_b_content_package(
  p_title text,
  p_source_url text DEFAULT NULL,
  p_source_type text DEFAULT 'creative_brief',
  p_brief jsonb DEFAULT '{}'::jsonb,
  p_source_evidence jsonb DEFAULT '{}'::jsonb,
  p_platform text DEFAULT 'YouTube',
  p_hook text DEFAULT NULL,
  p_caption text DEFAULT NULL,
  p_hashtags text DEFAULT NULL,
  p_cta text DEFAULT NULL,
  p_photo_idea text DEFAULT NULL,
  p_photo_direction text DEFAULT NULL,
  p_post_type text DEFAULT 'Long-form + Shorts',
  p_content_queue_id text DEFAULT NULL
)
RETURNS TABLE(project_id uuid, queue_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_project uuid;
  v_queue text := COALESCE(NULLIF(p_content_queue_id, ''), 'ce-' || gen_random_uuid()::text);
  v_brief jsonb := COALESCE(p_brief, '{}'::jsonb);
  v_lane text := lower(trim(COALESCE(v_brief->>'content_lane', v_brief->>'content_lane_label', '')));
  v_gate jsonb := COALESCE(
    v_brief->'attention_gate',
    v_brief->'operator_brief'->'attention_gate',
    '{}'::jsonb
  );
  v_hits integer := 0;
  v_score numeric := NULL;
  v_never_clear boolean := false;
  v_filters_clear boolean := false;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NULLIF(trim(COALESCE(p_title, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Package title required';
  END IF;

  IF v_lane IN ('attention', 'attention / controversy') THEN
    IF jsonb_typeof(v_gate->'must_hit') = 'number' THEN
      v_score := (v_gate->>'must_hit')::numeric;
      v_hits := floor(v_score);
    ELSIF jsonb_typeof(v_gate->'must_hit') = 'object' THEN
      SELECT COUNT(*) INTO v_hits
      FROM jsonb_each(v_gate->'must_hit') AS h(k, val)
      WHERE val IN ('1'::jsonb, 'true'::jsonb);
      v_score := v_hits;
    END IF;

    v_never_clear := CASE
      WHEN jsonb_typeof(v_gate->'never_do') = 'array' THEN jsonb_array_length(v_gate->'never_do') = 0
      WHEN jsonb_typeof(v_gate->'never_do') = 'object' THEN lower(COALESCE(v_gate->'never_do'->>'status','')) IN ('clear','none','pass')
      ELSE false
    END;

    v_filters_clear :=
      lower(COALESCE(v_gate->'three_filters'->>'A','')) IN ('yes','true')
      AND lower(COALESCE(v_gate->'three_filters'->>'B','')) IN ('yes','true')
      AND lower(COALESCE(v_gate->'three_filters'->>'C','')) IN ('yes','true');

    IF COALESCE(v_score, 0) < 5
       OR v_never_clear IS NOT TRUE
       OR v_filters_clear IS NOT TRUE THEN
      RAISE EXCEPTION 'CONTENT_BLOCKED: Attention Gate failed (requires >=5/8, no NEVER-DO, and three filters Y/Y/Y)';
    END IF;

    v_brief := jsonb_set(
      v_brief,
      '{qa,attention_gate_server_validated}',
      'true'::jsonb,
      true
    );
  END IF;

  INSERT INTO public.track_b_content_projects (
    owner_id,
    title,
    source_type,
    source_url,
    brief,
    source_evidence,
    status
  ) VALUES (
    v_owner,
    trim(p_title),
    CASE
      WHEN p_source_type IN ('creative_brief','video','image','article','podcast','website','client_brief','other')
      THEN p_source_type
      ELSE 'creative_brief'
    END,
    NULLIF(trim(COALESCE(p_source_url, '')), ''),
    v_brief,
    COALESCE(p_source_evidence, '{}'::jsonb),
    'planned'
  )
  RETURNING id INTO v_project;

  INSERT INTO public.content_queue (
    id, client_id, created_at, persona_id, persona_name, platform, pillar,
    hook, caption, hashtags, status, photo_idea, cta, photo_direction,
    post_type, content_label, trend_hook, shot_angle, wardrobe, style_ref,
    notes, post_format, project_id
  ) VALUES (
    v_queue, v_owner, now(), 'cornerstone', 'Cornerstone',
    COALESCE(NULLIF(trim(p_platform), ''), 'YouTube'),
    'Track B Content Engine',
    COALESCE(p_hook,''),
    COALESCE(p_caption,''),
    COALESCE(p_hashtags,''),
    'ready',
    COALESCE(p_photo_idea,''),
    COALESCE(p_cta,''),
    COALESCE(p_photo_direction,''),
    COALESCE(NULLIF(trim(p_post_type), ''), 'Long-form + Shorts'),
    trim(p_title),
    COALESCE(p_hook,''),
    '', '', 'original',
    jsonb_build_object(
      'canonical_project_id', v_project,
      'canonical_source', true,
      'package', v_brief
    )::text,
    'video',
    v_project
  );

  RETURN QUERY SELECT v_project, v_queue;
END;
$$;

REVOKE ALL ON FUNCTION public.create_track_b_content_package(text,text,text,jsonb,jsonb,text,text,text,text,text,text,text,text,text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_track_b_content_package(text,text,text,jsonb,jsonb,text,text,text,text,text,text,text,text,text)
  TO authenticated;

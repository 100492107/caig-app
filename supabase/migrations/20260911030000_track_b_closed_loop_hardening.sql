-- Close the Track B loop at the canonical layer.
-- Remake creates the canonical project first; content_queue is only an execution projection.
-- Production jobs and publications are idempotent for active work.

ALTER TABLE public.track_b_content_projects
  ADD COLUMN IF NOT EXISTS source_evidence jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tb_projects_owner_updated
  ON public.track_b_content_projects(owner_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tb_active_production_project_mode
  ON public.track_b_production_jobs(project_id, mode)
  WHERE project_id IS NOT NULL
    AND status IN ('queued','processing','review');

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
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NULLIF(trim(COALESCE(p_title, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Package title required';
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
    CASE WHEN p_source_type IN ('creative_brief','video','image','article','podcast','website','client_brief','other') THEN p_source_type ELSE 'creative_brief' END,
    NULLIF(trim(COALESCE(p_source_url, '')), ''),
    COALESCE(p_brief, '{}'::jsonb),
    COALESCE(p_source_evidence, '{}'::jsonb),
    'planned'
  )
  RETURNING id INTO v_project;

  -- Compatibility projection only. The canonical project is the source of truth.
  INSERT INTO public.content_queue (
    id, client_id, created_at, persona_id, persona_name, platform, pillar,
    hook, caption, hashtags, status, photo_idea, cta, photo_direction,
    post_type, content_label, trend_hook, shot_angle, wardrobe, style_ref,
    notes, post_format, project_id
  ) VALUES (
    v_queue, v_owner, now(), 'cornerstone', 'Cornerstone', COALESCE(NULLIF(trim(p_platform), ''), 'YouTube'),
    'Track B Content Engine', COALESCE(p_hook,''), COALESCE(p_caption,''), COALESCE(p_hashtags,''),
    'ready', COALESCE(p_photo_idea,''), COALESCE(p_cta,''), COALESCE(p_photo_direction,''),
    COALESCE(NULLIF(trim(p_post_type), ''), 'Long-form + Shorts'), trim(p_title), COALESCE(p_hook,''),
    '', '', 'original',
    jsonb_build_object('canonical_project_id', v_project, 'canonical_source', true, 'package', COALESCE(p_brief, '{}'::jsonb))::text,
    'video', v_project
  );

  RETURN QUERY SELECT v_project, v_queue;
END;
$$;

REVOKE ALL ON FUNCTION public.create_track_b_content_package(text,text,text,jsonb,jsonb,text,text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_track_b_content_package(text,text,text,jsonb,jsonb,text,text,text,text,text,text,text,text,text) TO authenticated;

-- Keep the legacy execution projection aligned with canonical publication state.
CREATE OR REPLACE FUNCTION public.sync_content_queue_from_track_b_publication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.content_queue q
  SET publication_id = NEW.id,
      scheduled_date = CASE WHEN NEW.scheduled_at IS NULL THEN NULL ELSE (NEW.scheduled_at AT TIME ZONE 'UTC')::date END,
      scheduled_time = CASE WHEN NEW.scheduled_at IS NULL THEN NULL ELSE to_char(NEW.scheduled_at AT TIME ZONE 'UTC', 'HH24:MI') END,
      status = CASE
        WHEN NEW.status IN ('scheduled','queued') THEN 'scheduled'
        WHEN NEW.status IN ('published','posted','live') THEN 'posted'
        WHEN NEW.status IN ('error','failed','blocked') THEN 'error'
        ELSE q.status
      END
  WHERE q.project_id = NEW.project_id
    AND (q.publication_id IS NULL OR q.publication_id = NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_queue_from_track_b_publication ON public.track_b_publications;
CREATE TRIGGER trg_sync_queue_from_track_b_publication
AFTER INSERT OR UPDATE OF status, scheduled_at
ON public.track_b_publications
FOR EACH ROW
EXECUTE FUNCTION public.sync_content_queue_from_track_b_publication();

-- Reflect execution outcomes back into canonical publication state.
CREATE OR REPLACE FUNCTION public.sync_track_b_publication_from_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.publication_id IS NOT NULL THEN
    UPDATE public.track_b_publications
    SET status = CASE
          WHEN NEW.status = 'posted' THEN 'published'
          WHEN NEW.status = 'error' THEN 'error'
          WHEN NEW.status = 'publishing' THEN 'publishing'
          WHEN NEW.status = 'scheduled' THEN 'scheduled'
          ELSE status
        END,
        published_at = CASE WHEN NEW.status = 'posted' THEN COALESCE(published_at, now()) ELSE published_at END,
        publish_attempts = COALESCE(NEW.publish_attempts, publish_attempts),
        last_attempt_at = COALESCE(NEW.last_publish_attempt_at, last_attempt_at),
        last_error = NEW.last_publish_error,
        updated_at = now()
    WHERE id = NEW.publication_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_publication_from_content_queue ON public.content_queue;
CREATE TRIGGER trg_sync_publication_from_content_queue
AFTER UPDATE OF status, publish_attempts, last_publish_attempt_at, last_publish_error, video_url, image_url
ON public.content_queue
FOR EACH ROW
EXECUTE FUNCTION public.sync_track_b_publication_from_queue();

REVOKE ALL ON FUNCTION public.sync_content_queue_from_track_b_publication() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_track_b_publication_from_queue() FROM anon, authenticated;

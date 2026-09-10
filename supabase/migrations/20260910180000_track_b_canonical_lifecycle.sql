-- Track B canonical lifecycle: make the normalized backbone the durable source of truth.
-- Legacy content_queue remains a projection for compatibility with existing adapters.

ALTER TABLE public.track_b_performance_evidence
  ADD COLUMN IF NOT EXISTS publication_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'track_b_performance_evidence_publication_id_fkey'
  ) THEN
    ALTER TABLE public.track_b_performance_evidence
      ADD CONSTRAINT track_b_performance_evidence_publication_id_fkey
      FOREIGN KEY (publication_id) REFERENCES public.track_b_publications(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tb_performance_publication
  ON public.track_b_performance_evidence(publication_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tb_publication_production_platform
  ON public.track_b_publications(production_job_id, platform)
  WHERE production_job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tb_projects_owner_status
  ON public.track_b_content_projects(owner_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tb_production_owner_status
  ON public.track_b_production_jobs(owner_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tb_publications_owner_status
  ON public.track_b_publications(owner_id, status, updated_at DESC);

CREATE OR REPLACE FUNCTION public.materialise_track_b_project_from_queue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  project_id uuid;
  note_json jsonb;
BEGIN
  -- Only materialise genuine Creative Engine package handoffs.
  -- Canonical production projections already carry project_id/canonical_source.
  IF NEW.project_id IS NOT NULL
     OR COALESCE(NEW.pillar, '') <> 'Track B Content Engine'
     OR COALESCE(NEW.content_label, '') NOT ILIKE 'Remake ·%'
  THEN
    RETURN NEW;
  END IF;

  BEGIN
    note_json := COALESCE(NULLIF(NEW.notes, '')::jsonb, '{}'::jsonb);
  EXCEPTION WHEN others THEN
    note_json := '{}'::jsonb;
  END;

  IF COALESCE((note_json ->> 'canonical_source')::boolean, false) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.track_b_content_projects (
    owner_id,
    title,
    source_type,
    source_url,
    brief,
    status
  ) VALUES (
    COALESCE(NEW.client_id, auth.uid()),
    COALESCE(NEW.content_label, 'Track B creative project'),
    'generated_package',
    NULL,
    jsonb_build_object(
      'content_queue_id', NEW.id,
      'platform', NEW.platform,
      'pillar', NEW.pillar,
      'hook', NEW.hook,
      'caption', NEW.caption,
      'hashtags', NEW.hashtags,
      'cta', NEW.cta,
      'photo_idea', NEW.photo_idea,
      'photo_direction', NEW.photo_direction,
      'post_type', NEW.post_type,
      'content_label', NEW.content_label,
      'notes', note_json
    ),
    'planned'
  )
  RETURNING id INTO project_id;

  NEW.project_id := project_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_materialise_track_b_project_from_queue
  ON public.content_queue;

CREATE TRIGGER trg_materialise_track_b_project_from_queue
BEFORE INSERT ON public.content_queue
FOR EACH ROW
EXECUTE FUNCTION public.materialise_track_b_project_from_queue();

CREATE OR REPLACE FUNCTION public.sync_track_b_project_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  project_uuid uuid;
BEGIN
  IF TG_TABLE_NAME = 'track_b_production_jobs' THEN
    project_uuid := NEW.project_id;
    IF project_uuid IS NOT NULL THEN
      UPDATE public.track_b_content_projects
      SET status = CASE
        WHEN NEW.status IN ('error','failed','blocked') THEN 'blocked'
        WHEN NEW.status IN ('completed','complete','ready') THEN 'production_complete'
        WHEN NEW.status IN ('queued','processing','rendering','in_progress','running') THEN 'in_production'
        ELSE status
      END,
      updated_at = now()
      WHERE id = project_uuid;
    END IF;
  ELSIF TG_TABLE_NAME = 'track_b_publications' THEN
    project_uuid := NEW.project_id;
    IF project_uuid IS NOT NULL THEN
      UPDATE public.track_b_content_projects
      SET status = CASE
        WHEN NEW.status IN ('failed','error','blocked') THEN 'blocked'
        WHEN NEW.status IN ('published','live') THEN 'published'
        WHEN NEW.status IN ('scheduled','queued','publishing','draft','ready') THEN 'ready_to_publish'
        ELSE status
      END,
      updated_at = now()
      WHERE id = project_uuid;
    END IF;
  ELSE
    project_uuid := NULL;
    IF NEW.publication_id IS NOT NULL THEN
      SELECT project_id INTO project_uuid
      FROM public.track_b_publications
      WHERE id = NEW.publication_id;
    END IF;
    IF project_uuid IS NOT NULL THEN
      UPDATE public.track_b_content_projects
      SET status = CASE WHEN NEW.winner THEN 'measured_winner' ELSE 'measured' END,
          updated_at = now()
      WHERE id = project_uuid;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_from_production
  ON public.track_b_production_jobs;
CREATE TRIGGER trg_sync_project_from_production
AFTER INSERT OR UPDATE OF status ON public.track_b_production_jobs
FOR EACH ROW EXECUTE FUNCTION public.sync_track_b_project_lifecycle();

DROP TRIGGER IF EXISTS trg_sync_project_from_publication
  ON public.track_b_publications;
CREATE TRIGGER trg_sync_project_from_publication
AFTER INSERT OR UPDATE OF status ON public.track_b_publications
FOR EACH ROW EXECUTE FUNCTION public.sync_track_b_project_lifecycle();

DROP TRIGGER IF EXISTS trg_sync_project_from_measurement
  ON public.track_b_performance_evidence;
CREATE TRIGGER trg_sync_project_from_measurement
AFTER INSERT OR UPDATE OF winner, publication_id ON public.track_b_performance_evidence
FOR EACH ROW EXECUTE FUNCTION public.sync_track_b_project_lifecycle();

-- Server-only tables/functions should not be callable through the public Data API.
REVOKE ALL ON FUNCTION public.materialise_track_b_project_from_queue() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_track_b_project_lifecycle() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_track_b_scene_verification() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_local_qwen_scene_verification() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

ALTER FUNCTION public.current_user_id() SET search_path = public, pg_temp;

-- Server-only memory/token tables remain inaccessible to Data API roles.
REVOKE ALL ON TABLE public.platform_tokens FROM anon, authenticated;
REVOKE ALL ON TABLE public.subscriber_memory FROM anon, authenticated;

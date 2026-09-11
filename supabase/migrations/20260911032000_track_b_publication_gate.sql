-- A canonical publication cannot be scheduled until production has actually passed its quality gate.
CREATE OR REPLACE FUNCTION public.enforce_track_b_publication_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job_status text;
BEGIN
  IF NEW.status IN ('scheduled','published','live') AND COALESCE(OLD.status,'draft') <> NEW.status THEN
    IF NEW.production_job_id IS NULL THEN
      RAISE EXCEPTION 'PUBLICATION_BLOCKED: no production job is linked';
    END IF;
    SELECT status INTO v_job_status
    FROM public.track_b_production_jobs
    WHERE id = NEW.production_job_id;
    IF COALESCE(v_job_status,'') <> 'completed' THEN
      RAISE EXCEPTION 'PUBLICATION_BLOCKED: production is not completed';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.track_b_quality_gates
      WHERE production_job_id = NEW.production_job_id
        AND status = 'approved'
    ) THEN
      RAISE EXCEPTION 'PUBLICATION_BLOCKED: production quality gate is not approved';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_b_publication_gate ON public.track_b_publications;
CREATE TRIGGER trg_track_b_publication_gate
BEFORE UPDATE OF status ON public.track_b_publications
FOR EACH ROW
EXECUTE FUNCTION public.enforce_track_b_publication_gate();

REVOKE ALL ON FUNCTION public.enforce_track_b_publication_gate() FROM PUBLIC, anon, authenticated;

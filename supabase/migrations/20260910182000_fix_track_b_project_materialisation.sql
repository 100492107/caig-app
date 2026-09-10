-- Correct the source_type used by the queue-to-project materialiser.
-- creative_brief is the existing canonical constraint value for generated package inputs.
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
    owner_id, title, source_type, source_url, brief, status
  ) VALUES (
    COALESCE(NEW.client_id, auth.uid()),
    COALESCE(NEW.content_label, 'Track B creative project'),
    'creative_brief',
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

REVOKE ALL ON FUNCTION public.materialise_track_b_project_from_queue() FROM anon, authenticated;

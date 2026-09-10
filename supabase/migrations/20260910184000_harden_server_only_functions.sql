-- Trigger/helper functions should execute only as triggers or server-side code.
-- PostgreSQL grants EXECUTE to PUBLIC by default when a function is created, so
-- revoking only anon/authenticated is insufficient for Data API exposure.

REVOKE EXECUTE ON FUNCTION public.enforce_track_b_scene_verification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.materialise_track_b_project_from_queue() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.queue_local_qwen_scene_verification() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_track_b_project_lifecycle() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.track_b_log_job_event() FROM PUBLIC, anon, authenticated;

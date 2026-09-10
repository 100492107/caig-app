alter function public.current_user_id() set search_path = public;

-- These are trigger/internal helpers, not public RPC entry points.
revoke execute on function public.handle_new_user() from anon, authenticated;

-- Scene verification may be callable by the signed-in operator, but never anonymously.
revoke execute on function public.enforce_track_b_scene_verification() from anon;
revoke execute on function public.queue_local_qwen_scene_verification() from anon;

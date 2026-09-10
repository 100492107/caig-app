comment on table public.content_queue is 'LEGACY PROJECTION only. Canonical Track B source of truth is project -> asset -> production -> publication -> performance evidence.';
comment on column public.content_queue.project_id is 'Canonical Track B project reference. Do not use content_queue as source of truth.';
comment on column public.content_queue.publication_id is 'Canonical Track B publication reference. Legacy queue mirrors publication execution state.';
create index if not exists content_queue_publication_id_idx on public.content_queue(publication_id) where publication_id is not null;
create index if not exists content_queue_project_id_idx on public.content_queue(project_id) where project_id is not null;
create index if not exists track_b_production_jobs_project_status_idx on public.track_b_production_jobs(project_id,status,updated_at desc);
create index if not exists track_b_publications_status_scheduled_idx on public.track_b_publications(owner_id,status,scheduled_at) where scheduled_at is not null;
create index if not exists track_b_performance_evidence_asset_created_idx on public.track_b_performance_evidence(owner_id,asset_id,created_at desc);

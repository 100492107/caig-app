alter table public.content_queue add column if not exists project_id uuid references public.track_b_content_projects(id) on delete set null;
alter table public.content_queue add column if not exists asset_id uuid references public.track_b_assets(id) on delete set null;
alter table public.content_queue add column if not exists production_job_id uuid references public.track_b_production_jobs(id) on delete set null;
create index if not exists content_queue_project_idx on public.content_queue(project_id);
create index if not exists content_queue_asset_idx on public.content_queue(asset_id);
create index if not exists content_queue_production_job_idx on public.content_queue(production_job_id);

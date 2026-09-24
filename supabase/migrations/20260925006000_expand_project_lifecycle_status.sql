-- Align the canonical project status enum with lifecycle states used by
-- the Track B synchronisation triggers.
alter table public.track_b_content_projects
  drop constraint if exists track_b_content_projects_status_check;

alter table public.track_b_content_projects
  add constraint track_b_content_projects_status_check
  check (status = any(array[
    'draft','planned','in_production','review','approved','archived',
    'blocked','production_complete','ready_to_publish','published',
    'measured','measured_winner'
  ]));

comment on column public.track_b_content_projects.status is 'Canonical Track B lifecycle state; includes production, publication and measurement outcomes.';

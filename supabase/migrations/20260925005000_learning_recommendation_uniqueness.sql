-- Make automatic learning recommendations idempotent per performance evidence.
create unique index if not exists uq_track_b_learning_recommendations_source_evidence
  on public.track_b_learning_recommendations(source_evidence_id);

comment on index uq_track_b_learning_recommendations_source_evidence is 'One active learning recommendation record per performance evidence item; supports automatic re-evaluation.';

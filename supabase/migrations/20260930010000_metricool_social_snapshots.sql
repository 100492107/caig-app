-- Metricool social snapshots reuse the canonical business metrics ledger.
-- One row per platform / period / sync day makes hourly syncs idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cornerstone_metric_snapshots_metricool_platform_period
  ON public.cornerstone_metric_snapshots(
    owner_id,
    snapshot_date,
    period_days,
    scope,
    platform,
    source_name
  )
  WHERE source_name IN ('Metricool','Metricool · 1d','Metricool · 7d');

-- Track B source media + performance measurement foundations.
-- Source media is private and scoped to the authenticated operator's user folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'track-b-source-media',
  'track-b-source-media',
  false,
  5368709120,
  array['video/*','audio/*','text/plain','text/markdown','application/x-subrip','text/vtt']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Track B source media authenticated upload') then
    create policy "Track B source media authenticated upload" on storage.objects for insert to authenticated
    with check (bucket_id='track-b-source-media' and (storage.foldername(name))[1]=(select auth.uid()::text));
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Track B source media owner read') then
    create policy "Track B source media owner read" on storage.objects for select to authenticated
    using (bucket_id='track-b-source-media' and owner_id=(select auth.uid()::text));
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Track B source media owner update') then
    create policy "Track B source media owner update" on storage.objects for update to authenticated
    using (bucket_id='track-b-source-media' and owner_id=(select auth.uid()::text))
    with check (bucket_id='track-b-source-media' and owner_id=(select auth.uid()::text));
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Track B source media owner delete') then
    create policy "Track B source media owner delete" on storage.objects for delete to authenticated
    using (bucket_id='track-b-source-media' and owner_id=(select auth.uid()::text));
  end if;
end $$;

create table if not exists public.track_b_content_metrics (
  id uuid primary key default gen_random_uuid(),
  content_queue_id text references public.content_queue(id) on delete cascade,
  platform text not null default 'youtube',
  captured_at timestamptz not null default now(),
  published_at timestamptz,
  views bigint,
  watch_time_seconds numeric,
  avg_view_duration_seconds numeric,
  retention_percent numeric,
  likes bigint,
  comments bigint,
  shares bigint,
  follows bigint,
  clicks bigint,
  revenue numeric,
  winner boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists track_b_content_metrics_queue_idx
  on public.track_b_content_metrics(content_queue_id, captured_at desc);
create index if not exists track_b_content_metrics_winner_idx
  on public.track_b_content_metrics(winner, captured_at desc);

alter table public.track_b_content_metrics enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='track_b_content_metrics' and policyname='Track B metrics authenticated read') then
    create policy "Track B metrics authenticated read" on public.track_b_content_metrics for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='track_b_content_metrics' and policyname='Track B metrics authenticated insert') then
    create policy "Track B metrics authenticated insert" on public.track_b_content_metrics for insert to authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='track_b_content_metrics' and policyname='Track B metrics authenticated update') then
    create policy "Track B metrics authenticated update" on public.track_b_content_metrics for update to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='track_b_content_metrics' and policyname='Track B metrics authenticated delete') then
    create policy "Track B metrics authenticated delete" on public.track_b_content_metrics for delete to authenticated using (true);
  end if;
end $$;

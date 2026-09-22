-- Cornerstone visual reference boards: reusable wardrobe, pose and environment inputs
create table if not exists public.cornerstone_visual_reference_boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  creator_id text default 'cara' check (creator_id in ('cara','lila','duo','both','neutral')),
  purpose text not null default 'mixed' check (purpose in ('wardrobe','pose','scene','shoot','mixed')),
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cornerstone_visual_references (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid not null references public.cornerstone_visual_reference_boards(id) on delete cascade,
  source_platform text not null default 'other' check (source_platform in ('pinterest','vinted','depop','other')),
  source_url text not null,
  canonical_url text,
  image_url text,
  title text,
  description text,
  media_type text default 'image',
  category text not null default 'mixed' check (category in ('wardrobe','pose','scene','accessory','mixed')),
  tags text[] not null default '{}',
  structured_data jsonb not null default '{}'::jsonb,
  recipe jsonb not null default '{}'::jsonb,
  analysis jsonb not null default '{}'::jsonb,
  analysis_status text not null default 'pending' check (analysis_status in ('pending','processing','complete','error','no_image')),
  analysis_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists cornerstone_visual_reference_boards_owner_idx
  on public.cornerstone_visual_reference_boards(owner_id, updated_at desc);
create index if not exists cornerstone_visual_references_board_idx
  on public.cornerstone_visual_references(owner_id, board_id, created_at desc);
create index if not exists cornerstone_visual_references_status_idx
  on public.cornerstone_visual_references(owner_id, analysis_status);

alter table public.cornerstone_visual_reference_boards enable row level security;
alter table public.cornerstone_visual_references enable row level security;

drop policy if exists "visual_reference_boards_owner_select" on public.cornerstone_visual_reference_boards;
drop policy if exists "visual_reference_boards_owner_insert" on public.cornerstone_visual_reference_boards;
drop policy if exists "visual_reference_boards_owner_update" on public.cornerstone_visual_reference_boards;
drop policy if exists "visual_reference_boards_owner_delete" on public.cornerstone_visual_reference_boards;
create policy "visual_reference_boards_owner_select" on public.cornerstone_visual_reference_boards for select to authenticated using (auth.uid() = owner_id);
create policy "visual_reference_boards_owner_insert" on public.cornerstone_visual_reference_boards for insert to authenticated with check (auth.uid() = owner_id);
create policy "visual_reference_boards_owner_update" on public.cornerstone_visual_reference_boards for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "visual_reference_boards_owner_delete" on public.cornerstone_visual_reference_boards for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "visual_references_owner_select" on public.cornerstone_visual_references;
drop policy if exists "visual_references_owner_insert" on public.cornerstone_visual_references;
drop policy if exists "visual_references_owner_update" on public.cornerstone_visual_references;
drop policy if exists "visual_references_owner_delete" on public.cornerstone_visual_references;
create policy "visual_references_owner_select" on public.cornerstone_visual_references for select to authenticated using (auth.uid() = owner_id);
create policy "visual_references_owner_insert" on public.cornerstone_visual_references for insert to authenticated with check (auth.uid() = owner_id);
create policy "visual_references_owner_update" on public.cornerstone_visual_references for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "visual_references_owner_delete" on public.cornerstone_visual_references for delete to authenticated using (auth.uid() = owner_id);

revoke all on public.cornerstone_visual_reference_boards from anon;
revoke all on public.cornerstone_visual_references from anon;
grant select, insert, update, delete on public.cornerstone_visual_reference_boards to authenticated;
grant select, insert, update, delete on public.cornerstone_visual_references to authenticated;

create or replace function public.set_updated_at_cornerstone_visual_reference_boards()
returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;
drop trigger if exists trg_cornerstone_visual_reference_boards_updated_at on public.cornerstone_visual_reference_boards;
create trigger trg_cornerstone_visual_reference_boards_updated_at before update on public.cornerstone_visual_reference_boards for each row execute function public.set_updated_at_cornerstone_visual_reference_boards();

create or replace function public.set_updated_at_cornerstone_visual_references()
returns trigger language plpgsql as $$
begin new.updated_at = timezone('utc', now()); return new; end;
$$;
drop trigger if exists trg_cornerstone_visual_references_updated_at on public.cornerstone_visual_references;
create trigger trg_cornerstone_visual_references_updated_at before update on public.cornerstone_visual_references for each row execute function public.set_updated_at_cornerstone_visual_references();

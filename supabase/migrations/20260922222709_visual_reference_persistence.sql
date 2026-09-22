alter table public.cornerstone_visual_references
  add column if not exists storage_path text;

create table if not exists public.cornerstone_visual_reference_recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid not null references public.cornerstone_visual_reference_boards(id) on delete cascade,
  creator_id text not null default 'cara' check (creator_id in ('cara','lila','duo','neutral')),
  purpose text not null default 'mixed',
  name text not null,
  source_reference_ids uuid[] not null default '{}',
  recipe jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists cornerstone_visual_reference_recipes_board_idx
  on public.cornerstone_visual_reference_recipes(owner_id, board_id, created_at desc);

alter table public.cornerstone_visual_reference_recipes enable row level security;

drop policy if exists "visual_reference_recipes_owner_select" on public.cornerstone_visual_reference_recipes;
drop policy if exists "visual_reference_recipes_owner_insert" on public.cornerstone_visual_reference_recipes;
drop policy if exists "visual_reference_recipes_owner_update" on public.cornerstone_visual_reference_recipes;
drop policy if exists "visual_reference_recipes_owner_delete" on public.cornerstone_visual_reference_recipes;

create policy "visual_reference_recipes_owner_select"
  on public.cornerstone_visual_reference_recipes for select to authenticated
  using (auth.uid() = owner_id);

create policy "visual_reference_recipes_owner_insert"
  on public.cornerstone_visual_reference_recipes for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "visual_reference_recipes_owner_update"
  on public.cornerstone_visual_reference_recipes for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "visual_reference_recipes_owner_delete"
  on public.cornerstone_visual_reference_recipes for delete to authenticated
  using (auth.uid() = owner_id);

revoke all on public.cornerstone_visual_reference_recipes from anon;
grant select, insert, update, delete on public.cornerstone_visual_reference_recipes to authenticated;
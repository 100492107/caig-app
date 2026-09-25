create table if not exists public.cornerstone_commerce_setup (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  tiktok_shop_ready boolean not null default false,
  showcase_ready boolean not null default false,
  creator_profile_url text,
  instagram_url text,
  tracking_destination text,
  samples_requested integer not null default 0 check (samples_requested >= 0),
  updated_at timestamptz not null default now()
);

alter table public.cornerstone_commerce_setup enable row level security;

drop policy if exists cornerstone_commerce_setup_select on public.cornerstone_commerce_setup;
drop policy if exists cornerstone_commerce_setup_insert on public.cornerstone_commerce_setup;
drop policy if exists cornerstone_commerce_setup_update on public.cornerstone_commerce_setup;

create policy cornerstone_commerce_setup_select on public.cornerstone_commerce_setup
  for select to authenticated using (owner_id = auth.uid());
create policy cornerstone_commerce_setup_insert on public.cornerstone_commerce_setup
  for insert to authenticated with check (owner_id = auth.uid());
create policy cornerstone_commerce_setup_update on public.cornerstone_commerce_setup
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create or replace function public.ensure_cornerstone_commerce_setup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.cornerstone_commerce_setup(owner_id)
  values (new.owner_id)
  on conflict (owner_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_ensure_cornerstone_commerce_setup on public.cornerstone_commerce_signals;
create trigger trg_ensure_cornerstone_commerce_setup
after insert on public.cornerstone_commerce_signals
for each row execute function public.ensure_cornerstone_commerce_setup();

revoke all on function public.ensure_cornerstone_commerce_setup() from public, anon, authenticated;

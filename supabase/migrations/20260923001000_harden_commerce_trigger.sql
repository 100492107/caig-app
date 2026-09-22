-- Harden Commerce Intelligence trigger function against mutable search_path
create or replace function public.set_updated_at_cornerstone_commerce()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

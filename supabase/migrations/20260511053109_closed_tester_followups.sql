begin;

alter table if exists public.bikes
  add column if not exists nickname text;

alter table if exists public.maintenance_tasks
  add column if not exists cost numeric(10, 2);

alter table if exists public.ride_listings
  add column if not exists title text,
  add column if not exists lobby_platform text;

update public.ride_listings
set title = coalesce(title, destination)
where title is null;

update public.ride_listings
set lobby_platform = coalesce(lobby_platform, 'messenger')
where lobby_platform is null;

alter table if exists public.ride_listings
  alter column lobby_platform set default 'messenger',
  alter column lobby_platform set not null,
  alter column lobby_link drop not null;

alter table if exists public.ride_listings
  drop constraint if exists ride_listings_lobby_platform_check;

alter table if exists public.ride_listings
  add constraint ride_listings_lobby_platform_check
  check (lobby_platform in ('messenger', 'telegram', 'none'));

grant update on public.ride_listings to authenticated;

drop policy if exists ride_listings_update on public.ride_listings;
create policy ride_listings_update on public.ride_listings
  for update
  using (host_user_id = (select auth.uid()))
  with check (host_user_id = (select auth.uid()));

commit;

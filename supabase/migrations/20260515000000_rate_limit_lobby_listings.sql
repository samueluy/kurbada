create or replace function public.count_recent_ride_listings(p_user_id uuid)
returns bigint
language sql
security definer
as $$
  select count(*) from public.ride_listings
  where host_user_id = p_user_id
  and created_at > now() - interval '1 hour';
$$;

grant execute on function public.count_recent_ride_listings(uuid) to authenticated;

drop policy if exists ride_listings_insert on public.ride_listings;
create policy ride_listings_insert on public.ride_listings
  for insert
  to authenticated
  with check (
    host_user_id = (select auth.uid())
    and public.count_recent_ride_listings((select auth.uid())) < 3
  );

-- Ride Listings (Public Board)
create table if not exists public.ride_listings (
  id uuid primary key default uuid_generate_v4(),
  host_user_id uuid not null references public.profiles(id) on delete cascade,
  meetup_point text not null,
  meetup_coordinates jsonb,
  destination text not null,
  ride_date timestamptz not null,
  pace text not null check (pace in ('chill', 'moderate', 'sporty')),
  lobby_link text not null,
  is_reported boolean not null default false,
  display_name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ride_listings_ride_date_idx on public.ride_listings (ride_date asc);
create index if not exists ride_listings_host_user_id_idx on public.ride_listings (host_user_id);

-- RPC: report a listing to hide it from the board
create or replace function public.report_ride_listing(listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ride_listings set is_reported = true where id = listing_id;
end;
$$;

-- RLS policies
alter table public.ride_listings enable row level security;
alter table public.ride_listings force row level security;

-- Anyone can read non-reported listings
drop policy if exists ride_listings_read on public.ride_listings;
create policy ride_listings_read on public.ride_listings
  for select
  using (is_reported = false);

-- Only host can delete
drop policy if exists ride_listings_delete on public.ride_listings;
create policy ride_listings_delete on public.ride_listings
  for delete
  using (host_user_id = (select auth.uid()));

-- Authenticated users can insert with their own user_id
drop policy if exists ride_listings_insert on public.ride_listings;
create policy ride_listings_insert on public.ride_listings
  for insert
  with check (host_user_id = (select auth.uid()));

grant select, insert, delete on public.ride_listings to authenticated;
grant execute on function public.report_ride_listing to authenticated;

-- Kurbada — Persona + Work Mode + Lobby v2 migration
-- Date: 2026-05-10
-- Adds: ride_earnings, ride_listing_rsvps, listings photos + city,
--       profiles.is_verified_host, profiles.home_city,
--       auto-hide trigger on report count, weekly referral leaderboard view.

begin;

-- ──────────────────────────────────────────────────────────────
-- profiles: verified host badge + home city
-- ──────────────────────────────────────────────────────────────
alter table if exists public.profiles
  add column if not exists is_verified_host boolean not null default false,
  add column if not exists home_city text;

-- ──────────────────────────────────────────────────────────────
-- ride_earnings (Work Mode)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.ride_earnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ride_id uuid references public.rides(id) on delete set null,
  bike_id uuid references public.bikes(id) on delete set null,
  earned_at date not null default current_date,
  amount numeric(10, 2) not null check (amount >= 0),
  platform text not null check (platform in ('grab', 'lalamove', 'foodpanda', 'moveit', 'joyride', 'other')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists ride_earnings_user_earned_idx on public.ride_earnings (user_id, earned_at desc);
create index if not exists ride_earnings_ride_idx on public.ride_earnings (ride_id);

alter table public.ride_earnings enable row level security;

drop policy if exists "earnings_select_own" on public.ride_earnings;
create policy "earnings_select_own" on public.ride_earnings
  for select using (auth.uid() = user_id);

drop policy if exists "earnings_insert_own" on public.ride_earnings;
create policy "earnings_insert_own" on public.ride_earnings
  for insert with check (auth.uid() = user_id);

drop policy if exists "earnings_update_own" on public.ride_earnings;
create policy "earnings_update_own" on public.ride_earnings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "earnings_delete_own" on public.ride_earnings;
create policy "earnings_delete_own" on public.ride_earnings
  for delete using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- ride_listings additions: city, photos, report counter, hidden flag
-- ──────────────────────────────────────────────────────────────
alter table if exists public.ride_listings
  add column if not exists city text,
  add column if not exists photo_urls text[] default '{}'::text[],
  add column if not exists report_count integer not null default 0,
  add column if not exists is_hidden boolean not null default false;

create index if not exists ride_listings_city_idx on public.ride_listings (city);

-- ──────────────────────────────────────────────────────────────
-- ride_listing_rsvps (Going / Maybe)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.ride_listing_rsvps (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.ride_listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  status text not null check (status in ('going', 'maybe')),
  created_at timestamptz not null default now(),
  unique (listing_id, user_id)
);

create index if not exists ride_listing_rsvps_listing_idx on public.ride_listing_rsvps (listing_id);

alter table public.ride_listing_rsvps enable row level security;

drop policy if exists "rsvps_select_all" on public.ride_listing_rsvps;
create policy "rsvps_select_all" on public.ride_listing_rsvps
  for select using (true);

drop policy if exists "rsvps_upsert_own" on public.ride_listing_rsvps;
create policy "rsvps_upsert_own" on public.ride_listing_rsvps
  for insert with check (auth.uid() = user_id);

drop policy if exists "rsvps_update_own" on public.ride_listing_rsvps;
create policy "rsvps_update_own" on public.ride_listing_rsvps
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "rsvps_delete_own" on public.ride_listing_rsvps;
create policy "rsvps_delete_own" on public.ride_listing_rsvps
  for delete using (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────
-- Auto-hide a listing when it crosses the report threshold
-- ──────────────────────────────────────────────────────────────
create or replace function public.report_ride_listing(listing_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
  threshold integer := 3; -- auto-hide after 3 reports
begin
  update public.ride_listings
    set report_count = report_count + 1,
        is_reported = true
  where id = listing_id
  returning report_count into new_count;

  if new_count is null then
    return;
  end if;

  if new_count >= threshold then
    update public.ride_listings
      set is_hidden = true
    where id = listing_id;
  end if;
end;
$$;

grant execute on function public.report_ride_listing(uuid) to authenticated;

-- ──────────────────────────────────────────────────────────────
-- Weekly referral leaderboard view
-- ──────────────────────────────────────────────────────────────
create or replace view public.weekly_referral_leaderboard as
select
  r.referrer_user_id,
  coalesce(p.display_name, 'Kurbada Rider') as display_name,
  count(*)::int as referral_count,
  coalesce(p.is_verified_host, false) as is_verified_host
from public.referrals r
left join public.profiles p on p.id = r.referrer_user_id
where r.status = 'rewarded'
  and r.rewarded_at >= date_trunc('week', now())
group by r.referrer_user_id, p.display_name, p.is_verified_host
order by referral_count desc
limit 50;

grant select on public.weekly_referral_leaderboard to authenticated, anon;

commit;

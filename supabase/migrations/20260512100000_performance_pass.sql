begin;

alter table if exists public.rides
  add column if not exists route_preview_geojson jsonb not null default '{}'::jsonb;

update public.rides
set route_preview_geojson = route_geojson
where route_preview_geojson = '{}'::jsonb
  and route_geojson <> '{}'::jsonb;

create index if not exists rides_user_started_at_idx
on public.rides (user_id, started_at desc);

create index if not exists fuel_logs_user_logged_at_idx
on public.fuel_logs (user_id, logged_at desc);

create index if not exists ride_listings_visible_ride_date_idx
on public.ride_listings (ride_date asc)
where is_reported = false and is_hidden = false;

create index if not exists ride_listings_host_ride_date_idx
on public.ride_listings (host_user_id, ride_date desc);

create index if not exists ride_listing_rsvps_listing_status_idx
on public.ride_listing_rsvps (listing_id, status);

create or replace view public.ride_listings_feed as
select
  rl.id,
  rl.host_user_id,
  rl.title,
  rl.meetup_point,
  rl.meetup_coordinates,
  rl.destination,
  rl.ride_date,
  rl.pace,
  rl.lobby_platform,
  rl.lobby_link,
  rl.is_reported,
  rl.display_name,
  rl.created_at,
  rl.city,
  rl.photo_urls,
  rl.report_count,
  rl.is_hidden,
  coalesce(p.is_verified_host, false) as is_verified_host,
  count(*) filter (where rsvp.status = 'going')::int as rsvp_going_count,
  count(*) filter (where rsvp.status = 'maybe')::int as rsvp_maybe_count
from public.ride_listings rl
left join public.profiles p
  on p.id = rl.host_user_id
left join public.ride_listing_rsvps rsvp
  on rsvp.listing_id = rl.id
where rl.is_reported = false
  and rl.is_hidden = false
group by
  rl.id,
  rl.host_user_id,
  rl.title,
  rl.meetup_point,
  rl.meetup_coordinates,
  rl.destination,
  rl.ride_date,
  rl.pace,
  rl.lobby_platform,
  rl.lobby_link,
  rl.is_reported,
  rl.display_name,
  rl.created_at,
  rl.city,
  rl.photo_urls,
  rl.report_count,
  rl.is_hidden,
  p.is_verified_host;

grant select on public.ride_listings_feed to authenticated;

create or replace function public.user_maintenance_overview(p_user_id uuid default auth.uid())
returns table (
  id uuid,
  bike_id uuid,
  task_name text,
  cost numeric,
  interval_km integer,
  interval_days integer,
  last_done_odometer_km numeric,
  last_done_date date,
  bike_make text,
  bike_model text,
  bike_nickname text,
  current_odometer_km numeric,
  bike_created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'You do not have access to this maintenance overview.';
  end if;

  return query
  select
    mt.id,
    mt.bike_id,
    mt.task_name,
    mt.cost,
    mt.interval_km,
    mt.interval_days,
    mt.last_done_odometer_km,
    mt.last_done_date,
    b.make,
    b.model,
    b.nickname,
    b.current_odometer_km,
    b.created_at
  from public.maintenance_tasks mt
  join public.bikes b
    on b.id = mt.bike_id
  where b.user_id = p_user_id
  order by b.created_at desc, mt.task_name asc;
end;
$$;

grant execute on function public.user_maintenance_overview(uuid) to authenticated;

create or replace function public.ride_dashboard_metrics(p_user_id uuid default auth.uid())
returns table (
  latest_ride_id uuid,
  latest_ride_distance_km numeric,
  latest_ride_max_speed_kmh numeric,
  latest_ride_fuel_used_liters numeric,
  latest_ride_started_at timestamptz,
  latest_fuel_price numeric,
  today_earnings numeric,
  today_fuel_cost numeric,
  today_trip_count integer,
  month_distance_km numeric,
  month_fuel_cost numeric,
  month_maintenance_accrual numeric,
  month_total_cost numeric,
  month_cost_per_km numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  month_start timestamptz;
  today_start date;
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'You do not have access to these dashboard metrics.';
  end if;

  month_start := date_trunc('month', timezone('Asia/Manila', now())) at time zone 'Asia/Manila';
  today_start := timezone('Asia/Manila', now())::date;

  return query
  with latest_ride as (
    select
      r.id,
      r.distance_km,
      r.max_speed_kmh,
      r.fuel_used_liters,
      r.started_at
    from public.rides r
    where r.user_id = p_user_id
    order by r.started_at desc
    limit 1
  ),
  latest_fuel as (
    select fl.price_per_liter
    from public.fuel_logs fl
    where fl.user_id = p_user_id
    order by fl.logged_at desc
    limit 1
  ),
  today_earnings_rollup as (
    select
      coalesce(sum(re.amount), 0)::numeric as gross,
      count(*)::int as trip_count
    from public.ride_earnings re
    where re.user_id = p_user_id
      and re.earned_at = today_start
  ),
  today_rides as (
    select
      coalesce(sum(coalesce(r.fuel_used_liters, 0)), 0)::numeric as fuel_liters
    from public.rides r
    where r.user_id = p_user_id
      and timezone('Asia/Manila', r.started_at)::date = today_start
  ),
  month_rides as (
    select
      coalesce(sum(r.distance_km), 0)::numeric as distance_km,
      coalesce(sum(coalesce(r.fuel_used_liters, 0)), 0)::numeric as fuel_liters
    from public.rides r
    where r.user_id = p_user_id
      and r.started_at >= month_start
  ),
  month_fuel_logs as (
    select
      coalesce(sum(fl.total_cost), 0)::numeric as fuel_cost
    from public.fuel_logs fl
    where fl.user_id = p_user_id
      and fl.logged_at >= month_start::date
  ),
  maintenance_costs as (
    select
      coalesce(sum(coalesce(mt.cost, 500) / nullif(mt.interval_km, 0)), 0)::numeric as cost_per_km
    from public.maintenance_tasks mt
    join public.bikes b
      on b.id = mt.bike_id
    where b.user_id = p_user_id
  )
  select
    lr.id as latest_ride_id,
    lr.distance_km as latest_ride_distance_km,
    lr.max_speed_kmh as latest_ride_max_speed_kmh,
    lr.fuel_used_liters as latest_ride_fuel_used_liters,
    lr.started_at as latest_ride_started_at,
    coalesce(lf.price_per_liter, 65)::numeric as latest_fuel_price,
    te.gross as today_earnings,
    round(tr.fuel_liters * coalesce(lf.price_per_liter, 65), 2)::numeric as today_fuel_cost,
    te.trip_count as today_trip_count,
    mr.distance_km as month_distance_km,
    coalesce(nullif(mfl.fuel_cost, 0), round(mr.fuel_liters * coalesce(lf.price_per_liter, 65), 2))::numeric as month_fuel_cost,
    round(mr.distance_km * mc.cost_per_km, 2)::numeric as month_maintenance_accrual,
    round(
      coalesce(nullif(mfl.fuel_cost, 0), round(mr.fuel_liters * coalesce(lf.price_per_liter, 65), 2))
      + (mr.distance_km * mc.cost_per_km),
      2
    )::numeric as month_total_cost,
    case
      when mr.distance_km > 0 then round(
        (
          coalesce(nullif(mfl.fuel_cost, 0), round(mr.fuel_liters * coalesce(lf.price_per_liter, 65), 2))
          + (mr.distance_km * mc.cost_per_km)
        ) / mr.distance_km,
        2
      )::numeric
      else 0::numeric
    end as month_cost_per_km
  from latest_ride lr
  full join latest_fuel lf on true
  cross join today_earnings_rollup te
  cross join today_rides tr
  cross join month_rides mr
  cross join month_fuel_logs mfl
  cross join maintenance_costs mc;
end;
$$;

grant execute on function public.ride_dashboard_metrics(uuid) to authenticated;

create or replace function public.leaderboard_weekly_km()
returns table (
  user_id uuid,
  display_name text,
  total_km numeric,
  rank integer
)
language sql
security definer
set search_path = public
as $$
  with week_rollup as (
    select
      r.user_id,
      round(sum(r.distance_km)::numeric, 1) as total_km
    from public.rides r
    where r.started_at >= date_trunc('week', timezone('Asia/Manila', now())) at time zone 'Asia/Manila'
    group by r.user_id
  )
  select
    wr.user_id,
    coalesce(p.display_name, 'Kurbada Rider') as display_name,
    wr.total_km,
    row_number() over (order by wr.total_km desc, wr.user_id) as rank
  from week_rollup wr
  left join public.profiles p
    on p.id = wr.user_id
  order by rank
  limit 50;
$$;

grant execute on function public.leaderboard_weekly_km() to authenticated;

commit;

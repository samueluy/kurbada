begin;

-- Drop functions
drop function if exists public.leaderboard_weekly_km();
drop function if exists public.ride_dashboard_metrics(uuid);
drop function if exists public.user_maintenance_overview(uuid);

-- Drop view
drop view if exists public.ride_listings_feed;

-- Drop indexes
drop index if exists public.ride_listing_rsvps_listing_status_idx;
drop index if exists public.ride_listings_host_ride_date_idx;
drop index if exists public.ride_listings_visible_ride_date_idx;
drop index if exists public.fuel_logs_user_logged_at_idx;
drop index if exists public.rides_user_started_at_idx;

-- Drop column
alter table if exists public.rides
  drop column if exists route_preview_geojson;

commit;

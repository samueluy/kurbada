create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  subscription_status text not null default 'inactive' check (subscription_status in ('inactive', 'trialing', 'active', 'grace_period', 'canceled')),
  subscription_expires_at timestamptz,
  access_override text not null default 'none' check (access_override in ('none', 'development', 'apple_review'))
);

create table if not exists public.bikes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  make text not null,
  model text not null,
  year int not null,
  engine_cc int not null,
  current_odometer_km numeric not null default 0,
  mount_profile_id text,
  category text not null default 'naked',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.maintenance_tasks (
  id uuid primary key default uuid_generate_v4(),
  bike_id uuid not null references public.bikes (id) on delete cascade,
  task_name text not null,
  interval_km int not null,
  last_done_odometer_km numeric not null default 0,
  last_done_date date not null default current_date
);

create table if not exists public.rides (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  bike_id uuid not null references public.bikes (id) on delete cascade,
  mode text not null check (mode in ('weekend', 'hustle')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  distance_km numeric not null default 0,
  max_speed_kmh numeric not null default 0,
  avg_speed_kmh numeric not null default 0,
  max_lean_angle_deg numeric,
  fuel_used_liters numeric,
  route_geojson jsonb not null default '{}'::jsonb,
  route_point_count_raw int not null default 0,
  route_point_count_simplified int not null default 0,
  route_bounds jsonb not null default '{}'::jsonb
);

create table if not exists public.fuel_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  bike_id uuid not null references public.bikes (id) on delete cascade,
  logged_at date not null default current_date,
  liters numeric not null,
  price_per_liter numeric not null,
  total_cost numeric not null,
  octane_rating int not null,
  station_name text
);

create table if not exists public.emergency_info (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  full_name text not null,
  blood_type text not null,
  allergies text,
  conditions text,
  contact1_name text not null,
  contact1_phone text not null,
  contact2_name text,
  contact2_phone text
);

create index if not exists bikes_user_id_idx on public.bikes (user_id);
create index if not exists maintenance_tasks_bike_id_idx on public.maintenance_tasks (bike_id);
create index if not exists rides_user_id_idx on public.rides (user_id);
create index if not exists rides_bike_id_idx on public.rides (bike_id);
create index if not exists rides_started_at_idx on public.rides (started_at desc);
create index if not exists fuel_logs_user_id_idx on public.fuel_logs (user_id);
create index if not exists fuel_logs_bike_id_idx on public.fuel_logs (bike_id);
create index if not exists fuel_logs_logged_at_idx on public.fuel_logs (logged_at desc);
create index if not exists emergency_info_user_id_idx on public.emergency_info (user_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.seed_default_maintenance_tasks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.maintenance_tasks (bike_id, task_name, interval_km, last_done_odometer_km, last_done_date)
  values
    (new.id, 'Engine Oil Change', 3000, new.current_odometer_km, current_date),
    (new.id, 'Chain Tension & Lube', 600, new.current_odometer_km, current_date),
    (new.id, 'Brake Fluid', 12000, new.current_odometer_km, current_date),
    (new.id, 'Air Filter', 9000, new.current_odometer_km, current_date),
    (new.id, 'Spark Plugs', 12000, new.current_odometer_km, current_date),
    (new.id, 'Coolant', 18000, new.current_odometer_km, current_date),
    (new.id, 'Tire Pressure reminder', 200, new.current_odometer_km, current_date)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists bikes_seed_maintenance on public.bikes;
create trigger bikes_seed_maintenance
after insert on public.bikes
for each row execute function public.seed_default_maintenance_tasks();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.bikes to authenticated;
grant select, insert, update, delete on public.maintenance_tasks to authenticated;
grant select, insert, update, delete on public.rides to authenticated;
grant select, insert, update, delete on public.fuel_logs to authenticated;
grant select, insert, update, delete on public.emergency_info to authenticated;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.bikes enable row level security;
alter table public.bikes force row level security;
alter table public.maintenance_tasks enable row level security;
alter table public.maintenance_tasks force row level security;
alter table public.rides enable row level security;
alter table public.rides force row level security;
alter table public.fuel_logs enable row level security;
alter table public.fuel_logs force row level security;
alter table public.emergency_info enable row level security;
alter table public.emergency_info force row level security;

drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all on public.profiles
for all to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists bikes_owner_all on public.bikes;
create policy bikes_owner_all on public.bikes
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists maintenance_tasks_owner_all on public.maintenance_tasks;
create policy maintenance_tasks_owner_all on public.maintenance_tasks
for all to authenticated
using (
  exists (
    select 1 from public.bikes
    where bikes.id = maintenance_tasks.bike_id
      and bikes.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.bikes
    where bikes.id = maintenance_tasks.bike_id
      and bikes.user_id = (select auth.uid())
  )
);

drop policy if exists rides_owner_all on public.rides;
create policy rides_owner_all on public.rides
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists fuel_logs_owner_all on public.fuel_logs;
create policy fuel_logs_owner_all on public.fuel_logs
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists emergency_info_owner_all on public.emergency_info;
create policy emergency_info_owner_all on public.emergency_info
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

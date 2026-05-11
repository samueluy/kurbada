-- Kurbada — Weekend Rider Kit migration
-- Date: 2026-05-10
-- Adds: rides.mood, rides.elevation_gain_m, gear_items table

begin;

-- ──────────────────────────────────────────────────────────────
-- rides: mood tag + elevation gain
-- ──────────────────────────────────────────────────────────────
alter table if exists public.rides
  add column if not exists mood text
    check (mood is null or mood in ('send_it', 'epic', 'chill', 'brutal', 'meh')),
  add column if not exists elevation_gain_m numeric(7, 1);

create index if not exists rides_mood_idx on public.rides (user_id, mood);

-- ──────────────────────────────────────────────────────────────
-- gear_items: helmets, jackets, gloves, tires, chain, battery...
-- ──────────────────────────────────────────────────────────────
create table if not exists public.gear_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bike_id uuid references public.bikes(id) on delete set null,
  name text not null,
  category text not null check (
    category in (
      'helmet', 'jacket', 'gloves', 'boots', 'pants',
      'tire_front', 'tire_rear', 'chain', 'battery', 'other'
    )
  ),
  install_date date not null,
  install_odometer_km numeric(10, 1),
  expected_lifetime_months integer,
  expected_lifetime_km integer,
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists gear_items_user_idx on public.gear_items (user_id, archived);
create index if not exists gear_items_bike_idx on public.gear_items (bike_id);

alter table public.gear_items enable row level security;

drop policy if exists "gear_select_own" on public.gear_items;
create policy "gear_select_own" on public.gear_items
  for select using (auth.uid() = user_id);

drop policy if exists "gear_insert_own" on public.gear_items;
create policy "gear_insert_own" on public.gear_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "gear_update_own" on public.gear_items;
create policy "gear_update_own" on public.gear_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "gear_delete_own" on public.gear_items;
create policy "gear_delete_own" on public.gear_items
  for delete using (auth.uid() = user_id);

commit;

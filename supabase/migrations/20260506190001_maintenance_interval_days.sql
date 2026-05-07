-- Add interval_days to maintenance_tasks for date-based tracking
alter table public.maintenance_tasks
  add column if not exists interval_days integer;

-- Update seed function to include interval_days
create or replace function public.seed_default_maintenance_tasks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.maintenance_tasks (bike_id, task_name, interval_km, interval_days, last_done_odometer_km, last_done_date)
  values
    (new.id, 'Engine Oil Change', 3000, 180, new.current_odometer_km, current_date),
    (new.id, 'Chain Tension & Lube', 600, 90, new.current_odometer_km, current_date),
    (new.id, 'Brake Fluid', 12000, 730, new.current_odometer_km, current_date),
    (new.id, 'Air Filter', 9000, 365, new.current_odometer_km, current_date),
    (new.id, 'Spark Plugs', 12000, 730, new.current_odometer_km, current_date),
    (new.id, 'Coolant', 18000, 730, new.current_odometer_km, current_date),
    (new.id, 'Tire Pressure reminder', 200, 14, new.current_odometer_km, current_date)
  on conflict do nothing;
  return new;
end;
$$;

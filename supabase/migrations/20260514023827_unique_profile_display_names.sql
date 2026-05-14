create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to anon;
grant usage on schema private to authenticated;

create or replace function private.normalize_display_name(value text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(btrim(coalesce(value, '')), '\s+', ' ', 'g'), '');
$$;

create or replace function private.sync_profile_display_name()
returns trigger
language plpgsql
as $$
begin
  if new.display_name is distinct from old.display_name then
    update public.ride_listings
    set display_name = new.display_name
    where host_user_id = new.id;

    update public.ride_listing_rsvps
    set display_name = new.display_name
    where user_id = new.id;
  end if;

  return new;
end;
$$;

create or replace function private.is_display_name_available_internal(
  p_display_name text,
  p_exclude_user_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select not exists (
    select 1
    from public.profiles
    where lower(private.normalize_display_name(display_name)) = lower(private.normalize_display_name(p_display_name))
      and (p_exclude_user_id is null or id <> p_exclude_user_id)
  );
$$;

revoke all on function private.is_display_name_available_internal(text, uuid) from public;
grant execute on function private.is_display_name_available_internal(text, uuid) to anon;
grant execute on function private.is_display_name_available_internal(text, uuid) to authenticated;

create or replace function public.is_display_name_available(
  p_display_name text,
  p_exclude_user_id uuid default null
)
returns boolean
language sql
stable
as $$
  select private.is_display_name_available_internal(p_display_name, p_exclude_user_id);
$$;

grant execute on function public.is_display_name_available(text, uuid) to anon;
grant execute on function public.is_display_name_available(text, uuid) to authenticated;

update public.profiles
set display_name = private.normalize_display_name(display_name);

with profile_candidates as (
  select
    p.id,
    p.created_at,
    coalesce(
      private.normalize_display_name(p.display_name),
      private.normalize_display_name(u.raw_user_meta_data ->> 'display_name'),
      private.normalize_display_name(split_part(coalesce(u.email, ''), '@', 1)),
      'Rider'
    ) as base_display_name
  from public.profiles p
  left join auth.users u
    on u.id = p.id
),
profile_rankings as (
  select
    id,
    case
      when row_number() over (
        partition by lower(base_display_name)
        order by created_at nulls last, id
      ) = 1 then base_display_name
      else base_display_name || '-' || row_number() over (
        partition by lower(base_display_name)
        order by created_at nulls last, id
      )::text
    end as final_display_name
  from profile_candidates
)
update public.profiles p
set display_name = r.final_display_name
from profile_rankings r
where p.id = r.id
  and p.display_name is distinct from r.final_display_name;

alter table public.profiles
  drop constraint if exists profiles_display_name_not_blank;

alter table public.profiles
  add constraint profiles_display_name_not_blank
  check (private.normalize_display_name(display_name) is not null);

drop index if exists profiles_display_name_ci_unique;
create unique index profiles_display_name_ci_unique
  on public.profiles ((lower(private.normalize_display_name(display_name))));

update public.ride_listings rl
set display_name = p.display_name
from public.profiles p
where p.id = rl.host_user_id
  and rl.display_name is distinct from p.display_name;

update public.ride_listing_rsvps rsvp
set display_name = p.display_name
from public.profiles p
where p.id = rsvp.user_id
  and rsvp.display_name is distinct from p.display_name;

drop trigger if exists profiles_sync_display_name on public.profiles;
create trigger profiles_sync_display_name
after update of display_name on public.profiles
for each row
execute function private.sync_profile_display_name();

create or replace view public.ride_listings_feed
with (security_invoker = true) as
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
  coalesce(p.display_name, rl.display_name) as display_name,
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
  p.display_name,
  p.is_verified_host;

grant select on public.ride_listings_feed to authenticated;

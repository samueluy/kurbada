create or replace function public.generate_referral_code(source_display_name text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text;
  candidate text;
begin
  cleaned := regexp_replace(upper(coalesce(source_display_name, 'RIDER')), '[^A-Z0-9]+', '', 'g');
  cleaned := left(nullif(cleaned, ''), 8);

  if cleaned is null then
    cleaned := 'RIDER';
  end if;

  loop
    candidate := cleaned || upper(substr(md5(random()::text || clock_timestamp()::text || uuid_generate_v4()::text), 1, 4));
    exit when not exists (
      select 1
      from public.profiles
      where referral_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

alter table public.profiles
add column if not exists referral_code text;

alter table public.profiles
alter column referral_code set default public.generate_referral_code(null);

update public.profiles
set referral_code = public.generate_referral_code(display_name)
where referral_code is null;

alter table public.profiles
alter column referral_code set not null;

create unique index if not exists profiles_referral_code_idx
on public.profiles (referral_code);

alter table public.profiles
drop constraint if exists profiles_access_override_check;

alter table public.profiles
add constraint profiles_access_override_check
check (access_override in ('none', 'development', 'apple_review', 'closed_testing'));

create table if not exists public.referrals (
  id uuid primary key default uuid_generate_v4(),
  referrer_user_id uuid not null references public.profiles (id) on delete cascade,
  referred_user_id uuid not null unique references public.profiles (id) on delete cascade,
  referral_code text not null,
  referred_display_name text,
  status text not null default 'pending' check (status in ('pending', 'rewarded', 'rejected')),
  rewarded_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.revenuecat_webhook_events (
  event_id text primary key,
  event_type text not null,
  app_user_id text not null,
  processed_at timestamptz not null default timezone('utc', now()),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists referrals_referrer_user_id_idx on public.referrals (referrer_user_id);
create index if not exists referrals_referred_user_id_idx on public.referrals (referred_user_id);
create index if not exists referrals_status_idx on public.referrals (status);

create or replace function public.lookup_referral_code(input_code text)
returns table (
  referrer_user_id uuid,
  display_name text,
  referral_code text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id as referrer_user_id,
    coalesce(p.display_name, 'Kurbada Rider') as display_name,
    p.referral_code
  from public.profiles p
  where p.referral_code = regexp_replace(upper(trim(coalesce(input_code, ''))), '[^A-Z0-9]+', '', 'g')
  limit 1;
$$;

create or replace function public.validate_referral_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_match uuid;
begin
  new.referral_code := regexp_replace(upper(trim(coalesce(new.referral_code, ''))), '[^A-Z0-9]+', '', 'g');

  if new.referrer_user_id = new.referred_user_id then
    raise exception 'You cannot use your own referral code.';
  end if;

  select id
  into profile_match
  from public.profiles
  where referral_code = new.referral_code;

  if profile_match is null then
    raise exception 'Referral code does not exist.';
  end if;

  if profile_match <> new.referrer_user_id then
    raise exception 'Referral code does not match the referrer.';
  end if;

  return new;
end;
$$;

create or replace function public.guard_referral_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if auth.uid() = old.referrer_user_id then
    if new.referrer_user_id <> old.referrer_user_id
      or new.referred_user_id <> old.referred_user_id
      or new.referral_code <> old.referral_code
      or new.status <> old.status
      or new.rewarded_at is distinct from old.rewarded_at
      or new.referred_display_name is distinct from old.referred_display_name then
      raise exception 'Referrers may only mark referral notifications.';
    end if;
  elsif auth.uid() = old.referred_user_id then
    if old.status <> 'pending'
      or new.status <> 'pending'
      or new.rewarded_at is distinct from old.rewarded_at
      or new.notified_at is distinct from old.notified_at
      or new.referred_user_id <> old.referred_user_id then
      raise exception 'This referral can no longer be changed.';
    end if;
  else
    raise exception 'You do not have access to update this referral.';
  end if;

  return new;
end;
$$;

drop trigger if exists referrals_validate_record on public.referrals;
create trigger referrals_validate_record
before insert or update on public.referrals
for each row execute function public.validate_referral_record();

drop trigger if exists referrals_guard_updates on public.referrals;
create trigger referrals_guard_updates
before update on public.referrals
for each row execute function public.guard_referral_updates();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    public.generate_referral_code(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  )
  on conflict (id) do update
  set display_name = excluded.display_name
  where public.profiles.display_name is null;
  return new;
end;
$$;

grant select, insert, update, delete on public.referrals to authenticated;
grant execute on function public.lookup_referral_code(text) to anon, authenticated;

alter table public.referrals enable row level security;
alter table public.referrals force row level security;
alter table public.revenuecat_webhook_events enable row level security;
alter table public.revenuecat_webhook_events force row level security;

drop policy if exists referrals_participant_select on public.referrals;
create policy referrals_participant_select on public.referrals
for select to authenticated
using ((select auth.uid()) in (referrer_user_id, referred_user_id));

drop policy if exists referrals_referred_insert on public.referrals;
create policy referrals_referred_insert on public.referrals
for insert to authenticated
with check ((select auth.uid()) = referred_user_id);

drop policy if exists referrals_participant_update on public.referrals;
create policy referrals_participant_update on public.referrals
for update to authenticated
using ((select auth.uid()) in (referrer_user_id, referred_user_id))
with check ((select auth.uid()) in (referrer_user_id, referred_user_id));

drop policy if exists revenuecat_webhook_events_none on public.revenuecat_webhook_events;
create policy revenuecat_webhook_events_none on public.revenuecat_webhook_events
for all to authenticated
using (false)
with check (false);

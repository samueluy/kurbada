begin;

alter table if exists public.bikes
  drop column if exists mount_profile_id;

commit;

-- 0) Notes:
-- - Postgres does not support CREATE POLICY IF NOT EXISTS. We create policies conditionally using DO blocks.
-- - Adjust READ_FOR_AVATARS to anon if you want truly public avatars; currently it's restricted to authenticated for safety.
-- - If your DB doesn't have schema "extensions", either create it or change extension install schema to public.

-- 1) Extensions (no-op if already installed)
-- Keep these simple; Supabase typically already has them installed.
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- 2) Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  custom_photo_url text,
  avatar_storage_path text,
  avatar_updated_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2a) Helpful indexes
create index if not exists idx_profiles_avatar_storage_path on public.profiles (avatar_storage_path);

-- 2b) Trigger function to maintain timestamps (idempotent)
create or replace function public.set_timestamps()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    if new.created_at is null then
      new.created_at := now();
    end if;
    if new.updated_at is null then
      new.updated_at := now();
    end if;
    return new;
  elsif (tg_op = 'UPDATE') then
    new.updated_at := now();
    return new;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_set_timestamps on public.profiles;
create trigger trg_profiles_set_timestamps
before insert or update on public.profiles
for each row execute function public.set_timestamps();

-- 2c) Enable RLS on profiles
alter table if exists public.profiles enable row level security;

-- 2d) Profiles policies (create only if not already present)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_anyone_read'
  ) then
    execute $policy$CREATE POLICY profiles_anyone_read ON public.profiles FOR SELECT TO public USING (true);$policy$;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_user_update_own'
  ) then
    execute $policy$
      CREATE POLICY profiles_user_update_own
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING ((SELECT auth.uid()) = id)
      WITH CHECK ((SELECT auth.uid()) = id);
    $policy$;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_user_insert_own'
  ) then
    execute $policy$
      CREATE POLICY profiles_user_insert_own
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK ((SELECT auth.uid()) = id);
    $policy$;
  end if;
end;
$$;

-- 2f) Upsert helper function for ensuring profile row
create or replace function public.ensure_profile()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id)
  values ((SELECT auth.uid()))
  on conflict (id) do nothing;
end; $$;

-- Grant to authenticated only (avoid anon)
grant execute on function public.ensure_profile() to authenticated;
revoke execute on function public.ensure_profile() from anon;

-- 3) Storage bucket for avatars (idempotent)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- 4) Storage policies for avatars — create only if current role owns storage.objects
do $$
declare
  owner_name text;
begin
  select rolname into owner_name
  from pg_roles
  where oid = (select relowner from pg_class where relname = 'objects' and relnamespace = 'storage'::regnamespace);

  if owner_name = session_user then
    -- Enable RLS on storage.objects
    execute 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';

    -- Create conditional policies
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_anyone_read') then
      execute 'CREATE POLICY avatars_anyone_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''avatars'')';
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_list_own') then
      execute 'CREATE POLICY avatars_list_own ON storage.objects FOR SELECT TO authenticated USING (bucket_id = ''avatars'' AND owner = (SELECT auth.uid()))';
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_insert_own') then
      execute 'CREATE POLICY avatars_insert_own ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''avatars'' AND name LIKE ((SELECT auth.uid())::text || ''/%''))';
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_update_own') then
      execute 'CREATE POLICY avatars_update_own ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''avatars'' AND owner = (SELECT auth.uid())) WITH CHECK (bucket_id = ''avatars'' AND owner = (SELECT auth.uid()))';
    end if;

    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_delete_own') then
      execute 'CREATE POLICY avatars_delete_own ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''avatars'' AND owner = (SELECT auth.uid()))';
    end if;

  else
    raise notice 'Skipping storage.objects RLS/policy creation: current role (%) is not owner (%). Run these steps as the owner to install storage policies.', session_user, owner_name;
  end if;
end;
$$;

-- 5) Public view for profile avatar reference
create or replace view public.profile_public as
select
  p.id,
  coalesce(p.custom_photo_url, p.avatar_storage_path) as avatar_ref,
  p.display_name,
  p.username
from public.profiles p;

-- 6) Recommendation: revoke execute on helper functions from public/anon if undesired
-- revoke execute on function public.ensure_profile() from public; -- optional
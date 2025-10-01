-- Owner-only: Run this as the owner of schema "storage" (or as the DB superuser).
-- Paste into Supabase SQL editor and execute, or run via psql as the database owner.
-- This file is idempotent (drops policies if they exist then recreates them).

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- avatars_anyone_read
DROP POLICY IF EXISTS avatars_anyone_read ON storage.objects;
CREATE POLICY avatars_anyone_read ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

-- avatars_list_own
DROP POLICY IF EXISTS avatars_list_own ON storage.objects;
CREATE POLICY avatars_list_own ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = (SELECT auth.uid()));

-- avatars_insert_own
DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;
CREATE POLICY avatars_insert_own ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND name LIKE ((SELECT auth.uid())::text || '/%'));

-- avatars_update_own
DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
CREATE POLICY avatars_update_own ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = (SELECT auth.uid()))
  WITH CHECK (bucket_id = 'avatars' AND owner = (SELECT auth.uid()));

-- avatars_delete_own
DROP POLICY IF EXISTS avatars_delete_own ON storage.objects;
CREATE POLICY avatars_delete_own ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = (SELECT auth.uid()));

-- Notes:
-- Run this as the owner (the Supabase project SQL interface often runs as the owner). If you still get "must be owner" errors, run via the platform's DB owner console or ask Supabase support to execute.

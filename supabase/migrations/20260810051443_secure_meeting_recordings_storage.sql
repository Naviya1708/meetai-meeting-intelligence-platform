/*
# Secure meeting recordings storage

Adds owner-scoped access rules for the existing private `meeting-recordings` bucket.

## Storage Rules
- Users may upload only inside a folder named with their own authenticated user ID.
- Users may read, update, and delete only files inside their own folder.
- The bucket remains private and is accessed through authenticated Supabase sessions.
*/

DROP POLICY IF EXISTS "Users upload own meeting recordings" ON storage.objects;
CREATE POLICY "Users upload own meeting recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meeting-recordings'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

DROP POLICY IF EXISTS "Users read own meeting recordings" ON storage.objects;
CREATE POLICY "Users read own meeting recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-recordings'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

DROP POLICY IF EXISTS "Users update own meeting recordings" ON storage.objects;
CREATE POLICY "Users update own meeting recordings"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'meeting-recordings'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'meeting-recordings'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

DROP POLICY IF EXISTS "Users delete own meeting recordings" ON storage.objects;
CREATE POLICY "Users delete own meeting recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'meeting-recordings'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
);

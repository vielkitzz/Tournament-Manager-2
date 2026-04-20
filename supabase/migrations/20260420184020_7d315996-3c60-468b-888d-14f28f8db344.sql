-- Add missing SELECT policy on storage.objects for the logos bucket
-- This is required for upsert operations to work, as Supabase needs to read
-- the existing object before performing an update.
CREATE POLICY "Anyone can view logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'logos');
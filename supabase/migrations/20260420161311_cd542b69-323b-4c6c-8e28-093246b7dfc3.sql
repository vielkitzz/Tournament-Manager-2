DROP POLICY IF EXISTS "Owners can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update their logos" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete their logos" ON storage.objects;

CREATE POLICY "Owners can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND auth.uid() IS NOT NULL
  AND public.check_logo_ownership(name)
);

CREATE POLICY "Owners can update their logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos'
  AND auth.uid() IS NOT NULL
  AND public.check_logo_ownership(name)
)
WITH CHECK (
  bucket_id = 'logos'
  AND auth.uid() IS NOT NULL
  AND public.check_logo_ownership(name)
);

CREATE POLICY "Owners can delete their logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos'
  AND auth.uid() IS NOT NULL
  AND public.check_logo_ownership(name)
);
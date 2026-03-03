CREATE POLICY "Admins can upload branding assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'branding'
  AND is_admin(auth.uid())
);

CREATE POLICY "Admins can update branding assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = 'branding'
  AND is_admin(auth.uid())
);
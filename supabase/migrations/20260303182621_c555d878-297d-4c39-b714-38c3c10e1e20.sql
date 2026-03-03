
-- Allow authenticated users to upload wiki attachments
CREATE POLICY "Admins can upload wiki attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'wiki-attachments'
  AND is_admin(auth.uid())
);

-- Allow all authenticated users to read wiki attachments
CREATE POLICY "Authenticated users can read wiki attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'wiki-attachments'
);

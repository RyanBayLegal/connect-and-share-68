CREATE POLICY "Allow public read access to branding_settings"
ON public.branding_settings
FOR SELECT
TO anon, authenticated
USING (true);

CREATE TABLE public.branding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Bay Legal, PC',
  company_slogan text NOT NULL DEFAULT 'Your Knowledge Base for Policies, Resources, and Support',
  logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read branding
CREATE POLICY "Everyone can view branding" ON public.branding_settings
  FOR SELECT TO authenticated USING (true);

-- Only super admins can manage
CREATE POLICY "Super admins can manage branding" ON public.branding_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Insert default row
INSERT INTO public.branding_settings (company_name, company_slogan) VALUES ('Bay Legal, PC', 'Your Knowledge Base for Policies, Resources, and Support');

-- Add date_of_birth and date_hired columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS date_hired DATE;

-- Create google_reviews table for static reviews
CREATE TABLE IF NOT EXISTS public.google_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_name TEXT NOT NULL,
  review_text TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_date DATE,
  is_featured BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read featured reviews
CREATE POLICY "Authenticated users can read reviews" 
ON public.google_reviews FOR SELECT 
TO authenticated USING (is_featured = true);

-- Only super_admin can manage reviews
CREATE POLICY "Super admins can manage reviews" 
ON public.google_reviews FOR ALL 
TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_google_reviews_updated_at
BEFORE UPDATE ON public.google_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample reviews
INSERT INTO public.google_reviews (reviewer_name, review_text, rating, review_date) VALUES
('Maria Santos', 'Excellent legal services! The team was professional and responsive throughout the entire process.', 5, '2025-01-15'),
('Robert Chen', 'Very knowledgeable attorneys. They explained everything clearly and achieved great results.', 5, '2025-01-10'),
('Jennifer Walsh', 'Outstanding experience. Would highly recommend to anyone needing legal assistance.', 4, '2025-01-05');
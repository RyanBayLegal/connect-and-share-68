
-- 1. Add parent_id to departments for hierarchy
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

-- 2. Create profile_departments join table for many-to-many
CREATE TABLE public.profile_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(profile_id, department_id)
);

-- 3. Enable RLS
ALTER TABLE public.profile_departments ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies
CREATE POLICY "Authenticated users can view profile departments"
ON public.profile_departments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage profile departments"
ON public.profile_departments FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 5. Migrate existing department assignments to the join table
INSERT INTO public.profile_departments (profile_id, department_id, is_primary)
SELECT id, department_id, true
FROM public.profiles
WHERE department_id IS NOT NULL
ON CONFLICT (profile_id, department_id) DO NOTHING;

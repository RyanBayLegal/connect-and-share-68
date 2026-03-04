
-- Drop the restrictive super_admin-only manage policy on profiles
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;

-- Create a new policy that allows both super_admin and department_manager to manage profiles
CREATE POLICY "Admins can manage profiles"
ON public.profiles FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Drop the restrictive super_admin-only manage policy on departments
DROP POLICY IF EXISTS "Super admins can manage departments" ON public.departments;

-- Create a new policy that allows both super_admin and department_manager to manage departments
CREATE POLICY "Admins can manage departments"
ON public.departments FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

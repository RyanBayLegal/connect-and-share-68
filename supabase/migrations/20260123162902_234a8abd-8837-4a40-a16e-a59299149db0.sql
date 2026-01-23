-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Onboarding Templates
CREATE TABLE public.onboarding_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  is_default boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage onboarding templates" ON public.onboarding_templates
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Employees can view templates" ON public.onboarding_templates
  FOR SELECT USING (true);

-- Onboarding Template Items
CREATE TABLE public.onboarding_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.onboarding_templates(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  category text DEFAULT 'general',
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.onboarding_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage template items" ON public.onboarding_template_items
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Employees can view template items" ON public.onboarding_template_items
  FOR SELECT USING (true);

-- Employee Onboarding
CREATE TABLE public.employee_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  template_id uuid REFERENCES public.onboarding_templates(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  start_date date DEFAULT CURRENT_DATE,
  target_completion_date date,
  status text DEFAULT 'in_progress',
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.employee_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own onboarding" ON public.employee_onboarding
  FOR SELECT USING (
    employee_id = public.get_profile_id(auth.uid()) OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can manage onboarding" ON public.employee_onboarding
  FOR ALL USING (public.is_admin(auth.uid()));

-- Onboarding Progress
CREATE TABLE public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id uuid REFERENCES public.employee_onboarding(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES public.onboarding_template_items(id) ON DELETE CASCADE NOT NULL,
  is_completed boolean DEFAULT false,
  completed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  notes text,
  UNIQUE(onboarding_id, item_id)
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant progress" ON public.onboarding_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employee_onboarding eo
      WHERE eo.id = onboarding_id
      AND (eo.employee_id = public.get_profile_id(auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Admins and managers can update progress" ON public.onboarding_progress
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Employees can update own progress" ON public.onboarding_progress
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.employee_onboarding eo
      WHERE eo.id = onboarding_id
      AND eo.employee_id = public.get_profile_id(auth.uid())
    )
  );

-- Training Courses
CREATE TABLE public.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text DEFAULT 'general',
  duration_hours numeric,
  is_mandatory boolean DEFAULT false,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Training managers and admins can manage courses" ON public.training_courses
  FOR ALL USING (
    public.is_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'training_manager')
  );

CREATE POLICY "Employees can view active courses" ON public.training_courses
  FOR SELECT USING (is_active = true);

-- Training Enrollments (before materials so policy can reference it)
CREATE TABLE public.training_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.training_courses(id) ON DELETE CASCADE NOT NULL,
  employee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date date,
  status text DEFAULT 'assigned',
  progress_percent integer DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(course_id, employee_id)
);

ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own enrollments" ON public.training_enrollments
  FOR SELECT USING (employee_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Employees can update own enrollment progress" ON public.training_enrollments
  FOR UPDATE USING (employee_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Training managers and admins can manage enrollments" ON public.training_enrollments
  FOR ALL USING (
    public.is_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'training_manager')
  );

-- Training Materials
CREATE TABLE public.training_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.training_courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  type text DEFAULT 'document',
  file_path text,
  external_url text,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.training_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Training managers and admins can manage materials" ON public.training_materials
  FOR ALL USING (
    public.is_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'training_manager')
  );

CREATE POLICY "Employees can view materials for enrolled courses" ON public.training_materials
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.training_enrollments te
      WHERE te.course_id = training_materials.course_id
      AND te.employee_id = public.get_profile_id(auth.uid())
    ) OR
    public.is_admin(auth.uid()) OR
    public.has_role(auth.uid(), 'training_manager')
  );

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('training-materials', 'training-materials', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Training managers can upload materials" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'training-materials' AND
    (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'training_manager'))
  );

CREATE POLICY "Training managers can update materials" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'training-materials' AND
    (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'training_manager'))
  );

CREATE POLICY "Training managers can delete materials" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'training-materials' AND
    (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'training_manager'))
  );

CREATE POLICY "Enrolled employees can view training materials" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'training-materials' AND
    (
      public.is_admin(auth.uid()) OR
      public.has_role(auth.uid(), 'training_manager') OR
      EXISTS (
        SELECT 1 FROM public.training_materials tm
        JOIN public.training_enrollments te ON te.course_id = tm.course_id
        WHERE tm.file_path LIKE '%' || name || '%'
        AND te.employee_id = public.get_profile_id(auth.uid())
      )
    )
  );

-- Triggers
CREATE TRIGGER update_onboarding_templates_updated_at
  BEFORE UPDATE ON public.onboarding_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_onboarding_updated_at
  BEFORE UPDATE ON public.employee_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_courses_updated_at
  BEFORE UPDATE ON public.training_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_enrollments_updated_at
  BEFORE UPDATE ON public.training_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
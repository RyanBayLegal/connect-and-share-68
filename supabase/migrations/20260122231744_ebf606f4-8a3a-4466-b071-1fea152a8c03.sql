-- Create projects table for task management
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  department_id UUID REFERENCES public.departments(id),
  created_by UUID REFERENCES public.profiles(id),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  assignee_id UUID REFERENCES public.profiles(id),
  created_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create wiki_categories table
CREATE TABLE public.wiki_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create wiki_articles table
CREATE TABLE public.wiki_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES public.wiki_categories(id),
  author_id UUID REFERENCES public.profiles(id),
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_type TEXT NOT NULL DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'holiday', 'team_event', 'training', 'other')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule TEXT,
  department_id UUID REFERENCES public.departments(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create event_attendees table
CREATE TABLE public.event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'maybe')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Insert default wiki categories
INSERT INTO public.wiki_categories (name, description, icon, position) VALUES
  ('Company Policies', 'Official company policies and guidelines', 'Shield', 1),
  ('HR & Benefits', 'Human resources information and employee benefits', 'Users', 2),
  ('IT & Security', 'Technical guides and security protocols', 'Lock', 3),
  ('Onboarding', 'New employee resources and orientation', 'Rocket', 4),
  ('FAQs', 'Frequently asked questions', 'HelpCircle', 5);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- Projects RLS
CREATE POLICY "Users can view projects in their department or public"
  ON public.projects FOR SELECT TO authenticated
  USING (department_id IS NULL OR department_id = public.get_user_department(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage projects"
  ON public.projects FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Employees can create projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (created_by = public.get_profile_id(auth.uid()));

-- Tasks RLS
CREATE POLICY "Users can view tasks in accessible projects"
  ON public.tasks FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.projects WHERE department_id IS NULL OR department_id = public.get_user_department(auth.uid()) OR public.is_admin(auth.uid())));

CREATE POLICY "Project members can create tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (project_id IN (SELECT id FROM public.projects WHERE department_id IS NULL OR department_id = public.get_user_department(auth.uid()) OR public.is_admin(auth.uid())));

CREATE POLICY "Users can update tasks they created or are assigned to"
  ON public.tasks FOR UPDATE TO authenticated
  USING (created_by = public.get_profile_id(auth.uid()) OR assignee_id = public.get_profile_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR created_by = public.get_profile_id(auth.uid()));

-- Wiki categories RLS
CREATE POLICY "Anyone can view wiki categories"
  ON public.wiki_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage wiki categories"
  ON public.wiki_categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Wiki articles RLS
CREATE POLICY "Users can view published articles"
  ON public.wiki_articles FOR SELECT TO authenticated
  USING (is_published = true OR author_id = public.get_profile_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage articles"
  ON public.wiki_articles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Events RLS
CREATE POLICY "Users can view events"
  ON public.events FOR SELECT TO authenticated
  USING (department_id IS NULL OR department_id = public.get_user_department(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage events"
  ON public.events FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can create events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (created_by = public.get_profile_id(auth.uid()));

-- Event attendees RLS
CREATE POLICY "Users can view event attendees"
  ON public.event_attendees FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage own attendance"
  ON public.event_attendees FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wiki_articles_updated_at BEFORE UPDATE ON public.wiki_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
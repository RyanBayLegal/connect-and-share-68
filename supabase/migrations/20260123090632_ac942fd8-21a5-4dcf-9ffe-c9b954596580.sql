-- Create task_comments table
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_activity table
CREATE TABLE public.task_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_reminders_sent table to track sent reminders
CREATE TABLE public.task_reminders_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- 'due_3_days', 'due_1_day', 'due_today'
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, reminder_type)
);

-- Enable RLS on all tables
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reminders_sent ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_comments
CREATE POLICY "Users can view comments on accessible tasks"
  ON public.task_comments FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.department_id IS NULL 
        OR p.department_id = get_user_department(auth.uid())
        OR is_admin(auth.uid())
    )
  );

CREATE POLICY "Users can create comments on accessible tasks"
  ON public.task_comments FOR INSERT
  WITH CHECK (
    author_id = get_profile_id(auth.uid()) AND
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.department_id IS NULL 
        OR p.department_id = get_user_department(auth.uid())
        OR is_admin(auth.uid())
    )
  );

CREATE POLICY "Users can update own comments"
  ON public.task_comments FOR UPDATE
  USING (author_id = get_profile_id(auth.uid()))
  WITH CHECK (author_id = get_profile_id(auth.uid()));

CREATE POLICY "Users can delete own comments or admins"
  ON public.task_comments FOR DELETE
  USING (author_id = get_profile_id(auth.uid()) OR is_admin(auth.uid()));

-- RLS policies for task_activity
CREATE POLICY "Users can view activity on accessible tasks"
  ON public.task_activity FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.department_id IS NULL 
        OR p.department_id = get_user_department(auth.uid())
        OR is_admin(auth.uid())
    )
  );

CREATE POLICY "System can insert activity"
  ON public.task_activity FOR INSERT
  WITH CHECK (true);

-- RLS policies for task_reminders_sent (only accessible by service role)
CREATE POLICY "Service role can manage reminders"
  ON public.task_reminders_sent FOR ALL
  USING (true);

-- Create indexes for performance
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_created_at ON public.task_comments(created_at DESC);
CREATE INDEX idx_task_activity_task_id ON public.task_activity(task_id);
CREATE INDEX idx_task_activity_created_at ON public.task_activity(created_at DESC);
CREATE INDEX idx_task_reminders_task_id ON public.task_reminders_sent(task_id);

-- Create trigger function to log task changes
CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the profile id of the current user
  v_user_id := get_profile_id(auth.uid());
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activity (task_id, user_id, action, new_value)
    VALUES (NEW.id, v_user_id, 'created', NEW.title);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.task_activity (task_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'status_changed', OLD.status, NEW.status);
    END IF;
    
    -- Log assignee changes
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      INSERT INTO public.task_activity (task_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'assigned', OLD.assignee_id::text, NEW.assignee_id::text);
    END IF;
    
    -- Log priority changes
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO public.task_activity (task_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'priority_changed', OLD.priority, NEW.priority);
    END IF;
    
    -- Log due date changes
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      INSERT INTO public.task_activity (task_id, user_id, action, old_value, new_value)
      VALUES (NEW.id, v_user_id, 'due_date_changed', OLD.due_date::text, NEW.due_date::text);
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on tasks table
CREATE TRIGGER task_activity_trigger
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_task_activity();

-- Create trigger for updated_at on task_comments
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
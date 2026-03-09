
CREATE TABLE public.time_entry_edits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL REFERENCES public.profiles(id),
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.time_entry_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HR and admins can manage edit logs"
  ON public.time_entry_edits
  FOR ALL
  TO public
  USING (is_hr_or_admin(auth.uid()));

CREATE POLICY "Employees can view edits on own entries"
  ON public.time_entry_edits
  FOR SELECT
  TO public
  USING (
    time_entry_id IN (
      SELECT id FROM public.time_entries
      WHERE employee_id = get_profile_id(auth.uid())
    )
  );

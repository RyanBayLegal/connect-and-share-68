-- Fix the permissive RLS policies

-- Drop the overly permissive policy on task_activity
DROP POLICY IF EXISTS "System can insert activity" ON public.task_activity;

-- Create a more restrictive insert policy - only authenticated users can insert activity for their own actions
CREATE POLICY "Authenticated users can insert activity"
  ON public.task_activity FOR INSERT
  WITH CHECK (
    user_id IS NULL OR user_id = get_profile_id(auth.uid())
  );

-- Drop the overly permissive policy on task_reminders_sent  
DROP POLICY IF EXISTS "Service role can manage reminders" ON public.task_reminders_sent;

-- Create restrictive policies for task_reminders_sent (service role bypasses RLS anyway)
-- Regular users shouldn't be able to access this table
CREATE POLICY "No user access to reminders"
  ON public.task_reminders_sent FOR SELECT
  USING (false);

CREATE POLICY "No user insert to reminders"
  ON public.task_reminders_sent FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No user update to reminders"
  ON public.task_reminders_sent FOR UPDATE
  USING (false);

CREATE POLICY "No user delete to reminders"
  ON public.task_reminders_sent FOR DELETE
  USING (false);
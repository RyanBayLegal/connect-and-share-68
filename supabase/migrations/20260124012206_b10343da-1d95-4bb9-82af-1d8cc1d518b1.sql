-- Create time_off_requests table for employee leave requests
CREATE TABLE public.time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'pto',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  hours_requested NUMERIC DEFAULT 8,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

-- Employees can view their own requests, HR can view all
CREATE POLICY "Employees can view own requests" ON public.time_off_requests
  FOR SELECT USING (employee_id = get_profile_id(auth.uid()) OR is_hr_or_admin(auth.uid()));

-- Employees can create their own requests
CREATE POLICY "Employees can create requests" ON public.time_off_requests
  FOR INSERT WITH CHECK (employee_id = get_profile_id(auth.uid()));

-- Employees can update their pending requests, HR can update any
CREATE POLICY "Employees can update pending requests" ON public.time_off_requests
  FOR UPDATE USING (
    (employee_id = get_profile_id(auth.uid()) AND status = 'pending')
    OR is_hr_or_admin(auth.uid())
  );

-- HR can delete requests
CREATE POLICY "HR can delete requests" ON public.time_off_requests
  FOR DELETE USING (is_hr_or_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_time_off_requests_updated_at
  BEFORE UPDATE ON public.time_off_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
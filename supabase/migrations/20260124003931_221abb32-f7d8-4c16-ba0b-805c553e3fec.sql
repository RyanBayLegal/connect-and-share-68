-- Custom status types configurable by HR
CREATE TABLE public.time_tracking_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3B82F6',
  is_paid boolean DEFAULT true,
  is_active boolean DEFAULT true,
  position integer DEFAULT 0,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Time entries (clock in/out records)
CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  clock_in timestamptz NOT NULL,
  clock_out timestamptz,
  status_id uuid REFERENCES public.time_tracking_statuses(id),
  notes text,
  is_manual_entry boolean DEFAULT false,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Timesheet summaries (weekly/bi-weekly)
CREATE TABLE public.timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_regular_hours numeric(10,2) DEFAULT 0,
  total_overtime_hours numeric(10,2) DEFAULT 0,
  total_pto_hours numeric(10,2) DEFAULT 0,
  status text DEFAULT 'draft',
  submitted_at timestamptz,
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payroll configuration per employee
CREATE TABLE public.payroll_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id),
  pay_type text DEFAULT 'hourly',
  hourly_rate numeric(10,2),
  annual_salary numeric(12,2),
  overtime_multiplier numeric(3,2) DEFAULT 1.5,
  standard_hours_per_week integer DEFAULT 40,
  tax_withholding_percent numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payroll runs (pay periods)
CREATE TABLE public.payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start date NOT NULL,
  period_end date NOT NULL,
  pay_date date NOT NULL,
  status text DEFAULT 'draft',
  created_by uuid REFERENCES public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Individual pay stubs
CREATE TABLE public.pay_stubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id uuid NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  regular_hours numeric(10,2) DEFAULT 0,
  overtime_hours numeric(10,2) DEFAULT 0,
  pto_hours numeric(10,2) DEFAULT 0,
  gross_pay numeric(12,2) DEFAULT 0,
  deductions jsonb DEFAULT '{}',
  net_pay numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Deduction types (configurable by HR)
CREATE TABLE public.payroll_deduction_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_percentage boolean DEFAULT false,
  default_amount numeric(10,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Employee deductions
CREATE TABLE public.employee_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.profiles(id),
  deduction_type_id uuid NOT NULL REFERENCES public.payroll_deduction_types(id),
  amount numeric(10,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.time_tracking_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_stubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_deduction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_deductions ENABLE ROW LEVEL SECURITY;

-- Create helper function for HR access check
CREATE OR REPLACE FUNCTION public.is_hr_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'hr_manager')
  )
$$;

-- Time Tracking Statuses Policies
CREATE POLICY "Everyone can view active statuses"
ON public.time_tracking_statuses FOR SELECT
USING (is_active = true OR is_hr_or_admin(auth.uid()));

CREATE POLICY "HR and admins can manage statuses"
ON public.time_tracking_statuses FOR ALL
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

-- Time Entries Policies
CREATE POLICY "Employees can view own time entries"
ON public.time_entries FOR SELECT
USING (employee_id = get_profile_id(auth.uid()) OR is_hr_or_admin(auth.uid()));

CREATE POLICY "Employees can create own time entries"
ON public.time_entries FOR INSERT
WITH CHECK (employee_id = get_profile_id(auth.uid()) OR is_hr_or_admin(auth.uid()));

CREATE POLICY "Employees can update own unapproved entries"
ON public.time_entries FOR UPDATE
USING (
  (employee_id = get_profile_id(auth.uid()) AND approved_at IS NULL) 
  OR is_hr_or_admin(auth.uid())
);

CREATE POLICY "HR can delete time entries"
ON public.time_entries FOR DELETE
USING (is_hr_or_admin(auth.uid()));

-- Timesheets Policies
CREATE POLICY "Employees can view own timesheets"
ON public.timesheets FOR SELECT
USING (employee_id = get_profile_id(auth.uid()) OR is_hr_or_admin(auth.uid()));

CREATE POLICY "System can create timesheets"
ON public.timesheets FOR INSERT
WITH CHECK (employee_id = get_profile_id(auth.uid()) OR is_hr_or_admin(auth.uid()));

CREATE POLICY "Employees can update own draft timesheets"
ON public.timesheets FOR UPDATE
USING (
  (employee_id = get_profile_id(auth.uid()) AND status = 'draft')
  OR is_hr_or_admin(auth.uid())
);

CREATE POLICY "HR can delete timesheets"
ON public.timesheets FOR DELETE
USING (is_hr_or_admin(auth.uid()));

-- Payroll Settings Policies
CREATE POLICY "Employees can view own payroll settings"
ON public.payroll_settings FOR SELECT
USING (employee_id = get_profile_id(auth.uid()) OR is_hr_or_admin(auth.uid()));

CREATE POLICY "HR can manage payroll settings"
ON public.payroll_settings FOR ALL
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

-- Payroll Runs Policies
CREATE POLICY "HR can view payroll runs"
ON public.payroll_runs FOR SELECT
USING (is_hr_or_admin(auth.uid()));

CREATE POLICY "HR can manage payroll runs"
ON public.payroll_runs FOR ALL
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

-- Pay Stubs Policies
CREATE POLICY "Employees can view own pay stubs"
ON public.pay_stubs FOR SELECT
USING (employee_id = get_profile_id(auth.uid()) OR is_hr_or_admin(auth.uid()));

CREATE POLICY "HR can manage pay stubs"
ON public.pay_stubs FOR ALL
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

-- Payroll Deduction Types Policies
CREATE POLICY "Employees can view active deduction types"
ON public.payroll_deduction_types FOR SELECT
USING (is_active = true OR is_hr_or_admin(auth.uid()));

CREATE POLICY "HR can manage deduction types"
ON public.payroll_deduction_types FOR ALL
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

-- Employee Deductions Policies
CREATE POLICY "Employees can view own deductions"
ON public.employee_deductions FOR SELECT
USING (employee_id = get_profile_id(auth.uid()) OR is_hr_or_admin(auth.uid()));

CREATE POLICY "HR can manage employee deductions"
ON public.employee_deductions FOR ALL
USING (is_hr_or_admin(auth.uid()))
WITH CHECK (is_hr_or_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_time_entries_employee_id ON public.time_entries(employee_id);
CREATE INDEX idx_time_entries_clock_in ON public.time_entries(clock_in);
CREATE INDEX idx_timesheets_employee_id ON public.timesheets(employee_id);
CREATE INDEX idx_timesheets_period ON public.timesheets(period_start, period_end);
CREATE INDEX idx_pay_stubs_employee_id ON public.pay_stubs(employee_id);
CREATE INDEX idx_pay_stubs_payroll_run_id ON public.pay_stubs(payroll_run_id);
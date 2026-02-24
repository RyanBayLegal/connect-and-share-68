
-- PTO Balance Tracking
CREATE TABLE public.pto_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance_type TEXT NOT NULL DEFAULT 'pto', -- pto, sick, personal
  total_allocated NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_used NUMERIC(6,2) NOT NULL DEFAULT 0,
  accrual_rate NUMERIC(6,2) NOT NULL DEFAULT 0, -- hours per pay period
  last_accrual_date DATE,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, balance_type, year)
);

ALTER TABLE public.pto_balances ENABLE ROW LEVEL SECURITY;

-- Employees can view their own balances
CREATE POLICY "Employees can view own PTO balances"
  ON public.pto_balances FOR SELECT
  USING (
    employee_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- HR Managers and Super Admins can view all
CREATE POLICY "HR managers can view all PTO balances"
  ON public.pto_balances FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('hr_manager', 'super_admin'))
  );

-- HR Managers and Super Admins can manage all
CREATE POLICY "HR managers can manage PTO balances"
  ON public.pto_balances FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('hr_manager', 'super_admin'))
  );

-- Trigger for updated_at
CREATE TRIGGER update_pto_balances_updated_at
  BEFORE UPDATE ON public.pto_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

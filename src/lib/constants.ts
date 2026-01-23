export const APP_NAME = "Bay Legal Hub";
export const COMPANY_NAME = "Bay Legal, PC";
export const COMPANY_TAGLINE = "Your Knowledge Base for Policies, Resources, and Support";

export const PRIORITIES = {
  critical: { label: "Critical", color: "destructive" },
  important: { label: "Important", color: "warning" },
  general: { label: "General", color: "secondary" },
} as const;

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  department_manager: "Department Manager",
  employee: "Employee",
  contractor: "Contractor/Guest",
  training_manager: "Training Manager",
} as const;

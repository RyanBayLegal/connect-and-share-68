export const APP_NAME = "IntraConnect";

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
} as const;

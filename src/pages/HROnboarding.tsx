import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { AdminOnboarding } from "@/components/admin/AdminOnboarding";
import { ClipboardList } from "lucide-react";

export default function HROnboarding() {
  const { profile, isSuperAdmin } = useAuth();
  
  // Department-based access check
  const departmentName = profile?.department?.name?.toLowerCase() || "";
  const isHRDepartment = departmentName.includes("hr") || departmentName.includes("human resources");
  const canAccess = isSuperAdmin() || isHRDepartment;
  
  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ClipboardList className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HR Onboarding</h1>
          <p className="text-muted-foreground mt-1">
            Manage employee onboarding templates and track new hire progress
          </p>
        </div>
      </div>
      <AdminOnboarding />
    </div>
  );
}

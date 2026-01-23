import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, ListChecks, GraduationCap } from "lucide-react";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminDepartments } from "@/components/admin/AdminDepartments";
import { AdminOnboarding } from "@/components/admin/AdminOnboarding";
import { AdminTraining } from "@/components/admin/AdminTraining";
import { useAuth } from "@/contexts/AuthContext";

export default function Admin() {
  const { profile, hasRole, isSuperAdmin } = useAuth();

  // Check department-based access
  const departmentName = profile?.department?.name?.toLowerCase() || "";
  const isHRDepartment = departmentName.includes("hr") || departmentName.includes("human resources");
  const isTrainingDepartment = departmentName.includes("training");
  const isTrainingManager = hasRole("training_manager");

  // Access rules: super_admins see all, otherwise department-specific
  const canSeeOnboarding = isSuperAdmin() || isHRDepartment;
  const canSeeTraining = isSuperAdmin() || isTrainingDepartment || isTrainingManager;

  // Determine default tab based on access
  const getDefaultTab = () => {
    if (canSeeOnboarding || canSeeTraining) return "users";
    return "users";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">
          Manage users, departments, onboarding, and training
        </p>
      </div>

      <Tabs defaultValue={getDefaultTab()}>
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" />
            Departments
          </TabsTrigger>
          {canSeeOnboarding && (
            <TabsTrigger value="onboarding" className="gap-2">
              <ListChecks className="h-4 w-4" />
              Onboarding
            </TabsTrigger>
          )}
          {canSeeTraining && (
            <TabsTrigger value="training" className="gap-2">
              <GraduationCap className="h-4 w-4" />
              Training
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="departments" className="mt-6">
          <AdminDepartments />
        </TabsContent>

        {canSeeOnboarding && (
          <TabsContent value="onboarding" className="mt-6">
            <AdminOnboarding />
          </TabsContent>
        )}

        {canSeeTraining && (
          <TabsContent value="training" className="mt-6">
            <AdminTraining />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

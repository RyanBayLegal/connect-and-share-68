import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { AdminTraining } from "@/components/admin/AdminTraining";
import { TrainingAnalytics } from "@/components/admin/TrainingAnalytics";
import { GraduationCap, BarChart3, BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TrainingManagement() {
  const { profile, hasRole, isSuperAdmin } = useAuth();
  
  // Access check: super_admin, training department, or training_manager role
  const departmentName = profile?.department?.name?.toLowerCase() || "";
  const isTrainingDepartment = departmentName.includes("training");
  const isTrainingManager = hasRole("training_manager");
  const canAccess = isSuperAdmin() || isTrainingDepartment || isTrainingManager;
  
  if (!canAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <GraduationCap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training Management</h1>
          <p className="text-muted-foreground mt-1">
            Create courses, manage enrollments, and track employee training progress
          </p>
        </div>
      </div>

      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="courses" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Courses & Enrollments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-6">
          <TrainingAnalytics />
        </TabsContent>

        <TabsContent value="courses" className="mt-6">
          <AdminTraining />
        </TabsContent>
      </Tabs>
    </div>
  );
}

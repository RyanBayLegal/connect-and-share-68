import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, ListChecks, GraduationCap } from "lucide-react";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminDepartments } from "@/components/admin/AdminDepartments";
import { AdminOnboarding } from "@/components/admin/AdminOnboarding";
import { AdminTraining } from "@/components/admin/AdminTraining";

export default function Admin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">
          Manage users, departments, onboarding, and training
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="gap-2">
            <ListChecks className="h-4 w-4" />
            Onboarding
          </TabsTrigger>
          <TabsTrigger value="training" className="gap-2">
            <GraduationCap className="h-4 w-4" />
            Training
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="departments" className="mt-6">
          <AdminDepartments />
        </TabsContent>

        <TabsContent value="onboarding" className="mt-6">
          <AdminOnboarding />
        </TabsContent>

        <TabsContent value="training" className="mt-6">
          <AdminTraining />
        </TabsContent>
      </Tabs>
    </div>
  );
}

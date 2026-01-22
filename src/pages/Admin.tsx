import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2, Megaphone } from "lucide-react";
import { AdminUsers } from "@/components/admin/AdminUsers";
import { AdminDepartments } from "@/components/admin/AdminDepartments";

export default function Admin() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground mt-1">
          Manage users, departments, and system settings
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
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="departments" className="mt-6">
          <AdminDepartments />
        </TabsContent>
      </Tabs>
    </div>
  );
}

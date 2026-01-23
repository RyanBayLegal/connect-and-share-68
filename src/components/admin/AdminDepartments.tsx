import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Users } from "lucide-react";
import { toast } from "sonner";
import type { Department, Profile } from "@/types/database";
import { ManagerSelect } from "@/components/directory/ManagerSelect";

interface DepartmentWithManager extends Department {
  manager?: Profile | null;
}

export function AdminDepartments() {
  const [departments, setDepartments] = useState<DepartmentWithManager[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [managerId, setManagerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: deptData }, { data: profileData }] = await Promise.all([
      supabase.from("departments").select("*").order("name"),
      supabase
        .from("profiles")
        .select("*, department:departments(*)")
        .eq("is_active", true)
        .order("first_name"),
    ]);

    const deptsRaw = (deptData || []) as any[];
    const profilesRaw = (profileData || []) as unknown as Profile[];

    // Map manager info to departments
    const deptsWithManagers: DepartmentWithManager[] = deptsRaw.map((dept) => {
      const manager = dept.manager_id
        ? profilesRaw.find((p) => p.id === dept.manager_id) || null
        : null;
      return { ...dept, manager };
    });

    setDepartments(deptsWithManagers);
    setEmployees(profilesRaw);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("departments")
          .update({ name, description, manager_id: managerId })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Department updated!");
      } else {
        const { error } = await supabase
          .from("departments")
          .insert({ name, description, manager_id: managerId });
        if (error) throw error;
        toast.success("Department created!");
      }
      setIsOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save department");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setManagerId(null);
    setEditingId(null);
  };

  const openEdit = (dept: DepartmentWithManager) => {
    setEditingId(dept.id);
    setName(dept.name);
    setDescription(dept.description || "");
    setManagerId(dept.manager?.id || null);
    setIsOpen(true);
  };

  const getManagerName = (manager: Profile | null | undefined) => {
    if (!manager) return "Not assigned";
    return `${manager.first_name} ${manager.last_name}`;
  };

  const getMemberCount = (deptId: string) => {
    return employees.filter((e) => e.department_id === deptId).length;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Departments</CardTitle>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Create"} Department</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Department Manager</Label>
                <ManagerSelect
                  value={managerId}
                  onValueChange={setManagerId}
                  employees={employees}
                  placeholder="Select department manager"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.map((dept) => (
              <TableRow key={dept.id}>
                <TableCell className="font-medium">{dept.name}</TableCell>
                <TableCell>{dept.description || "-"}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {getMemberCount(dept.id)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {dept.manager ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={dept.manager.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                          {dept.manager.first_name[0]}
                          {dept.manager.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{getManagerName(dept.manager)}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Not assigned</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(dept)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

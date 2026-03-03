import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Power } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ROLE_LABELS } from "@/lib/constants";
import type { Profile, Department, AppRole } from "@/types/database";
import { useAuth } from "@/contexts/AuthContext";

export function AdminUsers() {
  const { isSuperAdmin } = useAuth();
  const [users, setUsers] = useState<(Profile & { roles: AppRole[] })[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit user state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<(Profile & { roles: AppRole[] }) | null>(null);
  const [editRoles, setEditRoles] = useState<AppRole[]>([]);
  const [editDepartment, setEditDepartment] = useState<string>("");

  // Status toggle state
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [statusToggleUser, setStatusToggleUser] = useState<(Profile & { roles: AppRole[] }) | null>(null);
  const [offboardedDate, setOffboardedDate] = useState("");

  // New user form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("employee");
  const [newJobTitle, setNewJobTitle] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [{ data: profilesData }, { data: rolesData }, { data: deptsData }] = await Promise.all([
        supabase.from("profiles").select("*, department:departments!profiles_department_id_fkey(*)").order("first_name"),
        supabase.from("user_roles").select("*"),
        supabase.from("departments").select("*").order("name"),
      ]);

      const usersWithRoles = (profilesData || []).map((p: any) => ({
        ...p,
        roles: (rolesData || []).filter((r: any) => r.user_id === p.user_id).map((r: any) => r.role),
      }));

      setUsers(usersWithRoles);
      setDepartments((deptsData as unknown as Department[]) || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Use edge function to create user (keeps admin logged in)
      const { data, error } = await supabase.functions.invoke("create-admin-user", {
        body: {
          email: newEmail,
          password: newPassword,
          firstName: newFirstName,
          lastName: newLastName,
          role: newRole,
          departmentId: newDepartment || null,
          jobTitle: newJobTitle || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`${newFirstName} ${newLastName} has been added successfully!`);
      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewEmail("");
    setNewPassword("");
    setNewFirstName("");
    setNewLastName("");
    setNewDepartment("");
    setNewRole("employee");
    setNewJobTitle("");
  };

  const openEditDialog = (user: Profile & { roles: AppRole[] }) => {
    setEditingUser(user);
    setEditRoles(user.roles);
    setEditDepartment(user.department_id || "");
    setIsEditOpen(true);
  };

  const handleRoleToggle = (role: AppRole) => {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    setIsSubmitting(true);

    try {
      // Update department
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ department_id: editDepartment || null })
        .eq("id", editingUser.id);

      if (profileError) throw profileError;

      // Delete existing roles
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", editingUser.user_id);

      if (deleteError) throw deleteError;

      // Insert new roles
      if (editRoles.length > 0) {
        const { error: insertError } = await supabase.from("user_roles").insert(
          editRoles.map((role) => ({
            user_id: editingUser.user_id,
            role,
          }))
        );

        if (insertError) throw insertError;
      }

      toast.success("User updated successfully!");
      setIsEditOpen(false);
      setEditingUser(null);
      fetchData();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = (user: Profile & { roles: AppRole[] }) => {
    setStatusToggleUser(user);
    if (user.is_active) {
      // Deactivating — ask for offboarded date
      setOffboardedDate(new Date().toISOString().split("T")[0]);
      setIsStatusDialogOpen(true);
    } else {
      // Reactivating — do it immediately
      updateUserStatus(user, true, null);
    }
  };

  const confirmDeactivate = () => {
    if (!statusToggleUser) return;
    updateUserStatus(statusToggleUser, false, offboardedDate || null);
    setIsStatusDialogOpen(false);
  };

  const updateUserStatus = async (user: Profile & { roles: AppRole[] }, isActive: boolean, offboardDate: string | null) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_active: isActive,
          offboarded_at: isActive ? null : offboardDate,
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success(`${user.first_name} ${user.last_name} has been ${isActive ? "reactivated" : "deactivated"}.`);
      fetchData();
    } catch (error: any) {
      console.error("Error updating user status:", error);
      toast.error(error.message || "Failed to update user status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && u.is_active) ||
      (statusFilter === "inactive" && !u.is_active);
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>User Management</CardTitle>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={newDepartment} onValueChange={setNewDepartment}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="department_manager">Dept Manager</SelectItem>
                      <SelectItem value="training_manager">Training Manager</SelectItem>
                      <SelectItem value="hr_manager">HR Manager</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Job Title</Label>
                <Input value={newJobTitle} onChange={(e) => setNewJobTitle(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating..." : "Create User"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 max-w-sm" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Offboarded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {isSuperAdmin() && <TableHead className="w-[80px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.department?.name || "-"}</TableCell>
                <TableCell>
                  {user.roles.map((r) => (
                    <Badge key={r} variant="secondary" className="mr-1">{ROLE_LABELS[r]}</Badge>
                  ))}
                </TableCell>
                <TableCell>
                  {isSuperAdmin() ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={() => handleStatusToggle(user)}
                        disabled={isSubmitting}
                      />
                      <span className={`text-sm ${user.is_active ? "text-foreground" : "text-destructive"}`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  ) : (
                    <Badge variant={user.is_active ? "default" : "destructive"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  )}
                </TableCell>
                {isSuperAdmin() && (
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Edit Roles Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Edit {editingUser?.first_name} {editingUser?.last_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={editDepartment} onValueChange={setEditDepartment}>
                  <SelectTrigger><SelectValue placeholder="No department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Select the roles you want to assign to this user.
              </p>
              <div className="space-y-2">
                {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={editRoles.includes(role)}
                      onChange={() => handleRoleToggle(role)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <div>
                      <span className="font-medium">{ROLE_LABELS[role]}</span>
                      {role === "training_manager" && (
                        <p className="text-xs text-muted-foreground">Can manage training courses and enrollments</p>
                      )}
                      {role === "super_admin" && (
                        <p className="text-xs text-muted-foreground">Full system access</p>
                      )}
                      {role === "department_manager" && (
                        <p className="text-xs text-muted-foreground">Can manage their department</p>
                      )}
                      {role === "hr_manager" && (
                        <p className="text-xs text-muted-foreground">Can manage time tracking, payroll, and sensitive employee data</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateUser} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        {/* Deactivate User Dialog */}
        <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deactivate {statusToggleUser?.first_name} {statusToggleUser?.last_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will mark the user as inactive. Please provide the offboarding date.
              </p>
              <div className="space-y-2">
                <Label>Offboarded Date</Label>
                <Input
                  type="date"
                  value={offboardedDate}
                  onChange={(e) => setOffboardedDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={confirmDeactivate} disabled={isSubmitting || !offboardedDate}>
                  {isSubmitting ? "Deactivating..." : "Deactivate User"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

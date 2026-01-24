import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Mail, Phone, MapPin, Building2, User, Network, MessageSquare, LayoutGrid, List, Crown, Camera, Loader2, Plus, Pencil, X, Save, Users, ChevronRight } from "lucide-react";
import type { Profile, Department } from "@/types/database";
import { OrgChart } from "@/components/directory/OrgChart";
import { AddMemberDialog } from "@/components/directory/AddMemberDialog";
import { ManagerSelect } from "@/components/directory/ManagerSelect";

export default function Directory() {
  const { user, isAdmin } = useAuth();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "dept" | "org">("grid");
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editManagerId, setEditManagerId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [{ data: employeesData }, { data: departmentsData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("*, department:departments!profiles_department_id_fkey(*)")
          .eq("is_active", true)
          .order("first_name"),
        supabase.from("departments").select("*").order("name"),
      ]);

      setEmployees((employeesData as unknown as Profile[]) || []);
      setDepartments((departmentsData as unknown as Department[]) || []);
    } catch (error) {
      console.error("Error fetching directory data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Check if current user can edit the selected employee's profile
  const canEditProfile = (employee: Profile) => {
    if (!user) return false;
    // User can edit their own profile OR admin can edit anyone's
    return employee.user_id === user.id || isAdmin();
  };

  // Check if current user can edit the selected employee's avatar
  const canEditAvatar = (employee: Profile) => {
    if (!user) return false;
    // User can edit their own avatar OR admin can edit anyone's
    return employee.user_id === user.id || isAdmin();
  };

  // Enter edit mode with current values
  const enterEditMode = () => {
    if (!selectedEmployee) return;
    setEditJobTitle(selectedEmployee.job_title || "");
    setEditPhone(selectedEmployee.phone || "");
    setEditLocation(selectedEmployee.location || "");
    setEditBio(selectedEmployee.bio || "");
    setEditManagerId(selectedEmployee.manager_id || null);
    setIsEditMode(true);
  };

  // Cancel edit mode
  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditJobTitle("");
    setEditPhone("");
    setEditLocation("");
    setEditBio("");
    setEditManagerId(null);
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!selectedEmployee) return;

    setIsSaving(true);
    try {
      const updateData: Record<string, any> = {
        job_title: editJobTitle || null,
        phone: editPhone || null,
        location: editLocation || null,
        bio: editBio || null,
      };

      // Only admins can update manager_id
      if (isAdmin()) {
        updateData.manager_id = editManagerId || null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", selectedEmployee.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      
      // Refresh data and update selected employee
      await fetchData();
      setSelectedEmployee((prev) => 
        prev ? { 
          ...prev, 
          job_title: editJobTitle || null,
          phone: editPhone || null,
          location: editLocation || null,
          bio: editBio || null,
          manager_id: isAdmin() ? (editManagerId || null) : prev.manager_id,
        } : null
      );
      setIsEditMode(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  // Close dialog and reset edit mode
  const handleCloseDialog = () => {
    setSelectedEmployee(null);
    setIsEditMode(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedEmployee || !e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split(".").pop();
    const filePath = `${selectedEmployee.user_id}/avatar.${fileExt}`;

    setIsAvatarLoading(true);

    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: `${publicUrlData.publicUrl}?t=${Date.now()}` })
        .eq("id", selectedEmployee.id);

      if (updateError) throw updateError;

      toast.success("Avatar updated successfully!");
      
      // Refresh employee list and update selected employee
      await fetchData();
      setSelectedEmployee((prev) => 
        prev ? { ...prev, avatar_url: `${publicUrlData.publicUrl}?t=${Date.now()}` } : null
      );
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      toast.error(error.message || "Failed to upload avatar");
    } finally {
      setIsAvatarLoading(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      searchQuery === "" ||
      `${employee.first_name} ${employee.last_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.job_title?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment =
      departmentFilter === "all" || employee.department_id === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  // Group employees by first letter of first name
  const groupedEmployees = useMemo(() => {
    const groups: Record<string, Profile[]> = {};
    
    filteredEmployees.forEach((employee) => {
      const letter = employee.first_name.charAt(0).toUpperCase();
      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(employee);
    });

    // Sort the keys alphabetically
    const sortedKeys = Object.keys(groups).sort();
    const sortedGroups: Record<string, Profile[]> = {};
    sortedKeys.forEach((key) => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [filteredEmployees]);

  // Group employees by department
  const groupedByDepartment = useMemo(() => {
    const groups: Record<string, { name: string; employees: Profile[] }> = {};
    
    filteredEmployees.forEach((employee) => {
      const deptId = employee.department_id || 'no-department';
      const deptName = employee.department?.name || 'No Department';
      
      if (!groups[deptId]) {
        groups[deptId] = { name: deptName, employees: [] };
      }
      groups[deptId].employees.push(employee);
    });

    return groups;
  }, [filteredEmployees]);

  // Check if employee is a manager (has direct reports)
  const isManager = (employeeId: string) => {
    return employees.some((e) => e.manager_id === employeeId);
  };

  // Get manager name for an employee
  const getManagerName = (managerId: string | null) => {
    if (!managerId) return null;
    const manager = employees.find((e) => e.id === managerId);
    return manager ? `${manager.first_name} ${manager.last_name}` : null;
  };

  // Get direct reports for an employee
  const getDirectReports = (employeeId: string) => {
    return employees.filter((e) => e.manager_id === employeeId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const EmployeeCard = ({ employee }: { employee: Profile }) => (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30"
      onClick={() => setSelectedEmployee(employee)}
    >
      <CardContent className="p-6 flex flex-col items-center text-center">
        {/* Avatar with ring */}
        <div className="relative mb-4">
          <div className="rounded-full p-1 bg-gradient-to-br from-primary/20 to-accent/20">
            <Avatar className="h-24 w-24 ring-2 ring-background">
              <AvatarImage src={employee.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                {employee.first_name[0]}
                {employee.last_name[0]}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Name */}
        <h3 className="font-semibold text-foreground text-lg">
          {employee.first_name} {employee.last_name}
        </h3>

        {/* Department Lead Badge */}
        {isManager(employee.id) && (
          <Badge className="mt-2 bg-accent text-accent-foreground border-accent/50 gap-1">
            <Crown className="h-3 w-3" />
            Department Lead
          </Badge>
        )}

        {/* Job Title */}
        <p className="text-sm text-muted-foreground mt-1">
          {employee.job_title || "Employee"}
          {employee.department && ` | ${employee.department.name}`}
        </p>

        {/* Contact Icons */}
        <div className="flex items-center gap-3 mt-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `mailto:${employee.email}`;
            }}
          >
            <Mail className="h-4 w-4" />
          </Button>
          {employee.phone && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `tel:${employee.phone}`;
              }}
            >
              <Phone className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/messages?to=${employee.user_id}`;
            }}
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderAlphabeticalGrid = () => (
    <div className="space-y-8">
      {Object.entries(groupedEmployees).map(([letter, letterEmployees]) => (
        <div key={letter}>
          {/* Letter Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold text-lg">
              {letter}
            </div>
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-accent font-medium">
              {letterEmployees.length} {letterEmployees.length === 1 ? 'person' : 'people'}
            </span>
          </div>

          {/* Employee Cards Grid */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {letterEmployees.map((employee) => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-2">
      {filteredEmployees.map((employee) => (
        <Card
          key={employee.id}
          className="cursor-pointer hover:shadow-md transition-all duration-200 bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30"
          onClick={() => setSelectedEmployee(employee)}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-full p-0.5 bg-gradient-to-br from-primary/20 to-accent/20">
              <Avatar className="h-12 w-12 ring-1 ring-background">
                <AvatarImage src={employee.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {employee.first_name[0]}
                  {employee.last_name[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate">
                  {employee.first_name} {employee.last_name}
                </h3>
                {isManager(employee.id) && (
                  <Badge className="bg-accent text-accent-foreground border-accent/50 gap-1 text-xs">
                    <Crown className="h-3 w-3" />
                    Lead
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {employee.job_title || "Employee"}
                {employee.department && ` • ${employee.department.name}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `mailto:${employee.email}`;
                }}
              >
                <Mail className="h-4 w-4" />
              </Button>
              {employee.phone && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `tel:${employee.phone}`;
                  }}
                >
                  <Phone className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/messages?to=${employee.user_id}`;
                }}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderDepartmentView = () => (
    <div className="space-y-8">
      {Object.entries(groupedByDepartment).map(([deptId, { name, employees: deptEmployees }]) => (
        <div key={deptId}>
          {/* Department Header */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center justify-center h-10 px-4 rounded-full bg-primary text-primary-foreground font-semibold">
              <Building2 className="h-4 w-4 mr-2" />
              {name}
            </div>
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-accent font-medium">
              {deptEmployees.length} {deptEmployees.length === 1 ? 'member' : 'members'}
            </span>
          </div>

          {/* Employee Cards Grid */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {deptEmployees.map((employee) => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 px-6 md:px-10 lg:px-16 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Directory</h1>
          <p className="text-muted-foreground mt-1">
            Find and connect with colleagues across the organization
          </p>
        </div>
        {isAdmin() && (
          <Button onClick={() => setIsAddMemberOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        )}
      </div>

      {/* Search, Filter, and View Mode Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        {/* Search Input */}
        <div className="relative flex-1 w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background/50"
          />
        </div>

        {/* Department Filter */}
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full lg:w-[180px] bg-background/50">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="grid" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Grid
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="dept" className="gap-2">
              <Building2 className="h-4 w-4" />
              Dept
            </TabsTrigger>
            <TabsTrigger value="org" className="gap-2">
              <Network className="h-4 w-4" />
              Org Chart
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredEmployees.length} of {employees.length} team members
      </p>

      {/* Content based on view mode */}
      {viewMode === "grid" && renderAlphabeticalGrid()}
      {viewMode === "list" && renderListView()}
      {viewMode === "dept" && renderDepartmentView()}
      {viewMode === "org" && <OrgChart employees={filteredEmployees} />}

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No team members found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Employee Detail Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {isEditMode ? "Edit Profile" : "Employee Profile"}
              </DialogTitle>
              {!isEditMode && selectedEmployee && canEditProfile(selectedEmployee) && (
                <Button variant="ghost" size="sm" onClick={enterEditMode}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center">
                {/* Avatar with upload option */}
                <div className="relative group">
                  <div className="rounded-full p-1 bg-gradient-to-br from-primary/20 to-accent/20">
                    <Avatar className="h-24 w-24 ring-2 ring-background">
                      <AvatarImage src={selectedEmployee.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {selectedEmployee.first_name[0]}
                        {selectedEmployee.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  {/* Camera overlay for editable avatars */}
                  {canEditAvatar(selectedEmployee) && (
                    <label
                      htmlFor="avatar-input"
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      {isAvatarLoading ? (
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                    </label>
                  )}
                  <input
                    ref={avatarInputRef}
                    id="avatar-input"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={isAvatarLoading}
                  />
                </div>

                {!isEditMode && (
                  <>
                    <h3 className="text-xl font-semibold mt-4">
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </h3>
                    {isManager(selectedEmployee.id) && (
                      <Badge className="mt-2 bg-accent text-accent-foreground border-accent/50 gap-1">
                        <Crown className="h-3 w-3" />
                        Department Lead
                      </Badge>
                    )}
                    <p className="text-muted-foreground mt-1">
                      {selectedEmployee.job_title || "Employee"}
                    </p>
                    {selectedEmployee.department && (
                      <Badge variant="secondary" className="mt-2">
                        {selectedEmployee.department.name}
                      </Badge>
                    )}
                  </>
                )}
              </div>

              {isEditMode ? (
                /* Edit Mode Form */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-job-title">Job Title</Label>
                    <Input
                      id="edit-job-title"
                      value={editJobTitle}
                      onChange={(e) => setEditJobTitle(e.target.value)}
                      placeholder="Software Engineer"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-location">Location</Label>
                    <Input
                      id="edit-location"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="San Francisco, CA"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-bio">Bio</Label>
                    <Textarea
                      id="edit-bio"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  </div>

                  {/* Manager selection - admin only */}
                  {isAdmin() && (
                    <div className="space-y-2">
                      <Label>Reports To</Label>
                      <ManagerSelect
                        value={editManagerId}
                        onValueChange={setEditManagerId}
                        employees={employees}
                        excludeId={selectedEmployee.id}
                        placeholder="Select manager"
                      />
                    </div>
                  )}

                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={cancelEditMode} disabled={isSaving}>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                /* View Mode */
                <>
                  {selectedEmployee.bio && (
                    <p className="text-sm text-muted-foreground text-center">
                      {selectedEmployee.bio}
                    </p>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={`mailto:${selectedEmployee.email}`}
                        className="text-primary hover:underline"
                      >
                        {selectedEmployee.email}
                      </a>
                    </div>
                    {selectedEmployee.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={`tel:${selectedEmployee.phone}`}
                          className="text-primary hover:underline"
                        >
                          {selectedEmployee.phone}
                        </a>
                      </div>
                    )}
                    {selectedEmployee.location && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedEmployee.location}</span>
                      </div>
                    )}
                    {selectedEmployee.department && (
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedEmployee.department.name}</span>
                      </div>
                    )}
                    {selectedEmployee.manager_id && (
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Reports to: {getManagerName(selectedEmployee.manager_id)}</span>
                      </div>
                    )}
                  </div>

                  {/* Direct Reports Section */}
                  {getDirectReports(selectedEmployee.id).length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>Direct Reports ({getDirectReports(selectedEmployee.id).length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <TooltipProvider>
                          {getDirectReports(selectedEmployee.id).slice(0, 6).map((report) => (
                            <Tooltip key={report.id}>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setSelectedEmployee(report)}
                                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={report.avatar_url || undefined} />
                                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                      {report.first_name[0]}
                                      {report.last_name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium truncate max-w-[100px]">
                                    {report.first_name}
                                  </span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{report.first_name} {report.last_name}</p>
                                <p className="text-xs text-muted-foreground">{report.job_title || "Employee"}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                          {getDirectReports(selectedEmployee.id).length > 6 && (
                            <div className="flex items-center gap-1 p-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                              <span>+{getDirectReports(selectedEmployee.id).length - 6} more</span>
                              <ChevronRight className="h-4 w-4" />
                            </div>
                          )}
                        </TooltipProvider>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button className="flex-1" asChild>
                      <a href={`mailto:${selectedEmployee.email}`}>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </a>
                    </Button>
                    <Button variant="outline" className="flex-1" asChild>
                      <a href={`/messages?to=${selectedEmployee.user_id}`}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Message
                      </a>
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
        departments={departments}
        onMemberAdded={fetchData}
      />
    </div>
  );
}

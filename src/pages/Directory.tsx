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
} from "@/components/ui/dialog";
import { Search, Mail, Phone, MapPin, Building2, User, Network, MessageSquare, LayoutGrid, List, Crown, Camera, Loader2, Plus } from "lucide-react";
import type { Profile, Department } from "@/types/database";
import { OrgChart } from "@/components/directory/OrgChart";
import { AddMemberDialog } from "@/components/directory/AddMemberDialog";

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

  const fetchData = async () => {
    try {
      const [{ data: employeesData }, { data: departmentsData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("*, department:departments(*)")
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

  // Check if current user can edit the selected employee's avatar
  const canEditAvatar = (employee: Profile) => {
    if (!user) return false;
    // User can edit their own avatar OR admin can edit anyone's
    return employee.user_id === user.id || isAdmin();
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
    <div className="space-y-6 px-4 md:px-6 lg:px-8 py-6">
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
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Employee Profile</DialogTitle>
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
              </div>

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
              </div>

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

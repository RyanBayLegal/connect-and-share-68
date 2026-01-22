import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { Search, Mail, Phone, MapPin, Building2, User } from "lucide-react";
import type { Profile, Department } from "@/types/database";

export default function Directory() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

    fetchData();
  }, []);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Employee Directory</h1>
        <p className="text-muted-foreground mt-1">
          Find and connect with colleagues across the organization
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or job title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
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
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredEmployees.length} of {employees.length} employees
      </p>

      {/* Employee Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEmployees.map((employee) => (
          <Card
            key={employee.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedEmployee(employee)}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={employee.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {employee.first_name[0]}
                    {employee.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">
                    {employee.first_name} {employee.last_name}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {employee.job_title || "Employee"}
                  </p>
                  {employee.department && (
                    <Badge variant="secondary" className="mt-2">
                      {employee.department.name}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{employee.email}</span>
                </div>
                {employee.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{employee.location}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No employees found</h3>
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
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedEmployee.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {selectedEmployee.first_name[0]}
                    {selectedEmployee.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </h3>
                  <p className="text-muted-foreground">
                    {selectedEmployee.job_title || "Employee"}
                  </p>
                  {selectedEmployee.department && (
                    <Badge variant="secondary" className="mt-2">
                      {selectedEmployee.department.name}
                    </Badge>
                  )}
                </div>
              </div>

              {selectedEmployee.bio && (
                <p className="text-sm text-muted-foreground">
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
    </div>
  );
}

import { MessageSquare } from "lucide-react";

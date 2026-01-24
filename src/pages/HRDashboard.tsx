import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, Navigate } from "react-router-dom";
import { 
  Users, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  UserCheck,
  UserX,
  ArrowRight,
  ClipboardList,
  Settings,
  Search,
  LayoutDashboard
} from "lucide-react";
import { format } from "date-fns";
import type { Profile, TimeEntry, Timesheet, PayrollRun, TimeTrackingStatus } from "@/types/database";

interface EmployeeStatus {
  employee: Profile;
  currentEntry: TimeEntry | null;
  status: TimeTrackingStatus | null;
}

export default function HRDashboard() {
  const { isHRManager, rolesLoaded } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeStatus[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState<(Timesheet & { employee?: Profile })[]>([]);
  const [pendingPayrollRuns, setPendingPayrollRuns] = useState<PayrollRun[]>([]);
  const [statuses, setStatuses] = useState<TimeTrackingStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Stats
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [clockedInCount, setClockedInCount] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    if (isHRManager()) {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch statuses
      const { data: statusData } = await supabase
        .from("time_tracking_statuses")
        .select("*")
        .eq("is_active", true);

      if (statusData) {
        setStatuses(statusData as TimeTrackingStatus[]);
      }

      // Fetch active employees
      const { data: employees } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("first_name");

      if (employees) {
        setTotalEmployees(employees.length);

        // Fetch current time entries for all employees
        const { data: currentEntries } = await supabase
          .from("time_entries")
          .select("*")
          .is("clock_out", null);

        const employeeStatusList: EmployeeStatus[] = (employees as unknown as Profile[]).map((emp) => {
          const currentEntry = (currentEntries as unknown as TimeEntry[])?.find(
            (e) => e.employee_id === emp.id
          ) || null;
          const status = currentEntry && statusData
            ? statusData.find((s) => s.id === currentEntry.status_id) as TimeTrackingStatus | undefined
            : null;
          return { employee: emp, currentEntry, status: status || null };
        });

        setEmployeeStatuses(employeeStatusList);
        setClockedInCount(employeeStatusList.filter((e) => e.currentEntry).length);
      }

      // Fetch pending timesheets
      const { data: timesheets } = await supabase
        .from("timesheets")
        .select("*")
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false });

      if (timesheets) {
        const employeeIds = [...new Set(timesheets.map((t) => t.employee_id))];
        const { data: empData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", employeeIds);

        const timesheetsWithEmployees = timesheets.map((ts) => ({
          ...(ts as unknown as Timesheet),
          employee: empData?.find((e) => e.id === ts.employee_id) as unknown as Profile,
        }));
        setPendingTimesheets(timesheetsWithEmployees);
        setPendingApprovals(timesheetsWithEmployees.length);
      }

      // Fetch pending payroll runs
      const { data: payrollRuns } = await supabase
        .from("payroll_runs")
        .select("*")
        .eq("status", "draft")
        .order("created_at", { ascending: false });

      if (payrollRuns) {
        setPendingPayrollRuns(payrollRuns as PayrollRun[]);
      }
    } catch (error) {
      console.error("Error fetching HR dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusById = (id: string | null) => statuses.find((s) => s.id === id);

  const filteredEmployees = employeeStatuses.filter((es) => {
    const name = `${es.employee.first_name} ${es.employee.last_name}`.toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  // Wait for roles to load before checking access
  if (!rolesLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isHRManager()) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <LayoutDashboard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HR Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Consolidated view of time tracking, payroll, and employee management
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              Currently Working
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{clockedInCount}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingApprovals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Off Clock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees - clockedInCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-4">
        <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
          <Link to="/time-management">
            <Clock className="h-5 w-5" />
            <span>Time Management</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
          <Link to="/payroll">
            <DollarSign className="h-5 w-5" />
            <span>Payroll</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
          <Link to="/hr-onboarding">
            <ClipboardList className="h-5 w-5" />
            <span>HR Onboarding</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto py-4 flex-col gap-2">
          <Link to="/hr-settings">
            <Settings className="h-5 w-5" />
            <span>HR Settings</span>
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live Employee Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Live Employee Status
            </CardTitle>
            <CardDescription>Real-time clock status of employees</CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredEmployees.slice(0, 10).map((es) => (
                <div
                  key={es.employee.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={es.employee.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {es.employee.first_name[0]}
                        {es.employee.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {es.employee.first_name} {es.employee.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {es.employee.job_title || "Employee"}
                      </p>
                    </div>
                  </div>
                  {es.currentEntry ? (
                    <Badge
                      style={{
                        backgroundColor: es.status?.color || "hsl(var(--primary))",
                        color: "#fff",
                      }}
                    >
                      {es.status?.name || "Working"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Off Clock</Badge>
                  )}
                </div>
              ))}
              {filteredEmployees.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No employees found
                </p>
              )}
              {filteredEmployees.length > 10 && (
                <Button asChild variant="ghost" className="w-full mt-2">
                  <Link to="/time-management">
                    View all {filteredEmployees.length} employees
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Pending Actions
            </CardTitle>
            <CardDescription>Items requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Pending Timesheets */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Timesheet Approvals ({pendingTimesheets.length})
                </h4>
                {pendingTimesheets.length > 0 ? (
                  <div className="space-y-2">
                    {pendingTimesheets.slice(0, 5).map((ts) => (
                      <div
                        key={ts.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {ts.employee?.first_name} {ts.employee?.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(ts.period_start), "MMM d")} -{" "}
                            {format(new Date(ts.period_end), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          Pending
                        </Badge>
                      </div>
                    ))}
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to="/time-management">
                        Review All <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-2">No pending timesheets</p>
                )}
              </div>

              {/* Pending Payroll Runs */}
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Draft Payroll Runs ({pendingPayrollRuns.length})
                </h4>
                {pendingPayrollRuns.length > 0 ? (
                  <div className="space-y-2">
                    {pendingPayrollRuns.slice(0, 3).map((run) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {format(new Date(run.period_start), "MMM d")} -{" "}
                            {format(new Date(run.period_end), "MMM d, yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Pay Date: {format(new Date(run.pay_date), "MMM d, yyyy")}
                          </p>
                        </div>
                        <Badge variant="outline">Draft</Badge>
                      </div>
                    ))}
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link to="/payroll">
                        Manage Payroll <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-2">No pending payroll runs</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigate } from "react-router-dom";
import { 
  Users, Clock, DollarSign, CheckCircle, AlertCircle, UserCheck, UserX,
  Search, LayoutDashboard, Calendar, TreePalm, ThumbsUp, ThumbsDown,
  ClipboardList, Settings, ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Profile, TimeEntry, Timesheet, PayrollRun, TimeTrackingStatus } from "@/types/database";

import { TimeManagementModal } from "@/components/hr/TimeManagementModal";
import { LeaveManagementModal } from "@/components/hr/LeaveManagementModal";
import { PayrollModal } from "@/components/hr/PayrollModal";
import { HRSettingsModal } from "@/components/hr/HRSettingsModal";
import { OffboardingModal } from "@/components/hr/OffboardingModal";

interface EmployeeStatus {
  employee: Profile;
  currentEntry: TimeEntry | null;
  status: TimeTrackingStatus | null;
}

interface TimeOffRequest {
  id: string;
  employee_id: string;
  request_type: string;
  start_date: string;
  end_date: string;
  hours_requested: number;
  reason: string | null;
  status: string;
  created_at: string;
  employee?: Profile;
}

export default function HRDashboard() {
  const { isHRManager, rolesLoaded } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeStatus[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState<(Timesheet & { employee?: Profile })[]>([]);
  const [pendingPayrollRuns, setPendingPayrollRuns] = useState<PayrollRun[]>([]);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState<TimeOffRequest[]>([]);
  const [leaveStats, setLeaveStats] = useState({ pending: 0, approved: 0, denied: 0 });
  const [statuses, setStatuses] = useState<TimeTrackingStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [totalEmployees, setTotalEmployees] = useState(0);
  const [clockedInCount, setClockedInCount] = useState(0);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  // Modal states
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [payrollModalOpen, setPayrollModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [offboardingModalOpen, setOffboardingModalOpen] = useState(false);

  useEffect(() => {
    if (rolesLoaded && isHRManager()) {
      fetchData();
    }
  }, [rolesLoaded]);

  // Realtime subscriptions for live updates
  useEffect(() => {
    if (!rolesLoaded || !isHRManager()) return;

    const channel = supabase
      .channel('hr-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_entries' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_off_requests' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timesheets' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rolesLoaded]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: statusData } = await supabase
        .from("time_tracking_statuses").select("*").eq("is_active", true);
      if (statusData) setStatuses(statusData as TimeTrackingStatus[]);

      const { data: employees } = await supabase
        .from("profiles").select("*").eq("is_active", true).order("first_name");

      if (employees) {
        setTotalEmployees(employees.length);
        const { data: currentEntries } = await supabase
          .from("time_entries").select("*").is("clock_out", null);

        const list: EmployeeStatus[] = (employees as unknown as Profile[]).map((emp) => {
          const currentEntry = (currentEntries as unknown as TimeEntry[])?.find((e) => e.employee_id === emp.id) || null;
          const status = currentEntry && statusData
            ? statusData.find((s) => s.id === currentEntry.status_id) as TimeTrackingStatus | undefined
            : null;
          return { employee: emp, currentEntry, status: status || null };
        });
        setEmployeeStatuses(list);
        setClockedInCount(list.filter((e) => e.currentEntry).length);
      }

      const { data: timesheets } = await supabase
        .from("timesheets").select("*").eq("status", "submitted").order("submitted_at", { ascending: false });
      if (timesheets) {
        const ids = [...new Set(timesheets.map((t) => t.employee_id))];
        const { data: empData } = ids.length > 0 ? await supabase.from("profiles").select("*").in("id", ids) : { data: [] };
        const mapped = timesheets.map((ts) => ({
          ...(ts as unknown as Timesheet),
          employee: empData?.find((e) => e.id === ts.employee_id) as unknown as Profile,
        }));
        setPendingTimesheets(mapped);
        setPendingApprovals(mapped.length);
      }

      const { data: payrollRuns } = await supabase
        .from("payroll_runs").select("*").eq("status", "draft").order("created_at", { ascending: false });
      if (payrollRuns) setPendingPayrollRuns(payrollRuns as PayrollRun[]);

      const { data: leaveRequests } = await supabase
        .from("time_off_requests").select("*").eq("status", "pending").order("created_at", { ascending: false });
      if (leaveRequests) {
        const ids = [...new Set(leaveRequests.map((r) => r.employee_id))];
        const { data: empData } = ids.length > 0 ? await supabase.from("profiles").select("*").in("id", ids) : { data: [] };
        setPendingLeaveRequests(leaveRequests.map((req) => ({
          ...req,
          employee: (empData as unknown as Profile[])?.find((e) => e.id === req.employee_id),
        })) as TimeOffRequest[]);
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: recentLeaves } = await supabase
        .from("time_off_requests").select("status").gte("created_at", thirtyDaysAgo.toISOString());
      if (recentLeaves) {
        setLeaveStats({
          pending: recentLeaves.filter((r) => r.status === "pending").length,
          approved: recentLeaves.filter((r) => r.status === "approved").length,
          denied: recentLeaves.filter((r) => r.status === "denied").length,
        });
      }
    } catch (error) {
      console.error("Error fetching HR dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveAction = async (requestId: string, action: "approved" | "denied") => {
    try {
      const { error } = await supabase
        .from("time_off_requests")
        .update({ status: action, reviewed_at: new Date().toISOString() })
        .eq("id", requestId);
      if (error) throw error;
      toast({ title: action === "approved" ? "Request Approved" : "Request Denied" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const getRequestTypeName = (type: string) => {
    const types: Record<string, string> = { pto: "PTO", sick: "Sick Leave", personal: "Personal Day", bereavement: "Bereavement", unpaid: "Unpaid Leave" };
    return types[type] || type;
  };

  const filteredEmployees = employeeStatuses.filter((es) =>
    `${es.employee.first_name} ${es.employee.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!rolesLoaded) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!isHRManager()) return <Navigate to="/" replace />;
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 md:grid-cols-5">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <LayoutDashboard className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HR Dashboard</h1>
          <p className="text-muted-foreground mt-1">All HR tools in one place — everything opens right here</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Active Employees
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalEmployees}</div></CardContent>
        </Card>
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-primary" /> Currently Working
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{clockedInCount}</div></CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" /> Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{pendingApprovals}</div></CardContent>
        </Card>
        <Card className="border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TreePalm className="h-4 w-4 text-accent-foreground" /> Pending Leave
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-accent-foreground">{leaveStats.pending}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserX className="h-4 w-4" /> Off Clock
            </CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalEmployees - clockedInCount}</div></CardContent>
        </Card>
      </div>

      {/* Tool Buttons — open modals */}
      <div className="grid gap-4 md:grid-cols-5">
        <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setTimeModalOpen(true)}>
          <Clock className="h-5 w-5" /><span>Time Management</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setLeaveModalOpen(true)}>
          <Calendar className="h-5 w-5" /><span>Leave Management</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setPayrollModalOpen(true)}>
          <DollarSign className="h-5 w-5" /><span>Payroll</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setSettingsModalOpen(true)}>
          <Settings className="h-5 w-5" /><span>HR Settings</span>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => setOffboardingModalOpen(true)}>
          <UserX className="h-5 w-5" /><span>Offboarding</span>
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live Employee Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Live Employee Status</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setTimeModalOpen(true)}>
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <CardDescription>Real-time clock status</CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {filteredEmployees.slice(0, 10).map((es) => (
                <div key={es.employee.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={es.employee.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{es.employee.first_name[0]}{es.employee.last_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{es.employee.first_name} {es.employee.last_name}</p>
                      <p className="text-xs text-muted-foreground">{es.employee.job_title || "Employee"}</p>
                    </div>
                  </div>
                  {es.currentEntry ? (
                    <Badge style={{ backgroundColor: es.status?.color || "hsl(var(--primary))", color: "#fff" }}>
                      {es.status?.name || "Working"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Off Clock</Badge>
                  )}
                </div>
              ))}
              {filteredEmployees.length === 0 && <p className="text-center text-muted-foreground py-4">No employees found</p>}
              {filteredEmployees.length > 10 && (
                <Button variant="ghost" className="w-full mt-2" onClick={() => setTimeModalOpen(true)}>
                  View all {filteredEmployees.length} employees <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Leave Requests */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Pending Leave Requests</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLeaveModalOpen(true)}>
                Manage <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <CardDescription>{pendingLeaveRequests.length} request{pendingLeaveRequests.length !== 1 ? "s" : ""} awaiting review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[350px] overflow-y-auto">
              {pendingLeaveRequests.length > 0 ? (
                pendingLeaveRequests.slice(0, 6).map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={req.employee?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{req.employee?.first_name?.[0]}{req.employee?.last_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{req.employee?.first_name} {req.employee?.last_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {getRequestTypeName(req.request_type)} · {format(new Date(req.start_date), "MMM d")} - {format(new Date(req.end_date), "MMM d")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-primary hover:text-primary/80 hover:bg-primary/10" onClick={() => handleLeaveAction(req.id, "approved")}>
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleLeaveAction(req.id, "denied")}>
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No pending leave requests</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Timesheets & Payroll */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Pending Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Timesheets ({pendingTimesheets.length})
              </h4>
              {pendingTimesheets.length > 0 ? (
                <div className="space-y-2">
                  {pendingTimesheets.slice(0, 3).map((ts) => (
                    <div key={ts.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                      <div>
                        <p className="font-medium">{ts.employee?.first_name} {ts.employee?.last_name}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(ts.period_start), "MMM d")} - {format(new Date(ts.period_end), "MMM d")}</p>
                      </div>
                      <Badge variant="outline" className="text-destructive border-destructive/30">Pending</Badge>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setTimeModalOpen(true)}>
                    Review All <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              ) : <p className="text-muted-foreground text-sm py-2">No pending timesheets</p>}
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Draft Payroll ({pendingPayrollRuns.length})
              </h4>
              {pendingPayrollRuns.length > 0 ? (
                <div className="space-y-2">
                  {pendingPayrollRuns.slice(0, 3).map((run) => (
                    <div key={run.id} className="flex items-center justify-between p-2 rounded-lg bg-muted text-sm">
                      <div>
                        <p className="font-medium">{format(new Date(run.period_start), "MMM d")} - {format(new Date(run.period_end), "MMM d")}</p>
                        <p className="text-xs text-muted-foreground">Pay: {format(new Date(run.pay_date), "MMM d, yyyy")}</p>
                      </div>
                      <Badge variant="outline">Draft</Badge>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setPayrollModalOpen(true)}>
                    Manage Payroll <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              ) : <p className="text-muted-foreground text-sm py-2">No pending payroll runs</p>}
            </div>
          </CardContent>
        </Card>

        {/* Leave Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TreePalm className="h-5 w-5" /> Leave Overview (30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-destructive/10">
                <p className="text-2xl font-bold text-destructive">{leaveStats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/10">
                <p className="text-2xl font-bold text-primary">{leaveStats.approved}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-destructive">{leaveStats.denied}</p>
                <p className="text-xs text-muted-foreground">Denied</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => setLeaveModalOpen(true)}>
              View All Leave Requests <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <TimeManagementModal open={timeModalOpen} onOpenChange={setTimeModalOpen} onDataChanged={fetchData} />
      <LeaveManagementModal open={leaveModalOpen} onOpenChange={setLeaveModalOpen} onDataChanged={fetchData} />
      <PayrollModal open={payrollModalOpen} onOpenChange={setPayrollModalOpen} onDataChanged={fetchData} />
      <HRSettingsModal open={settingsModalOpen} onOpenChange={setSettingsModalOpen} />
    </div>
  );
}

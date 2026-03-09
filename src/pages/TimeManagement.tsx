import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Clock, Users, CheckCircle, XCircle, Search, Download, Calendar, Square, Pencil, History } from "lucide-react";
import { format, differenceInMinutes, startOfWeek, endOfWeek } from "date-fns";
import type { TimeEntry, TimeTrackingStatus, Timesheet, Profile, TimeOffRequest, TimeEntryEdit } from "@/types/database";

interface EmployeeStatus {
  employee: Profile;
  currentEntry: TimeEntry | null;
  todayHours: number;
}

export default function TimeManagement() {
  const { isHRManager, rolesLoaded } = useAuth();
  const { toast } = useToast();
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeStatus[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState<(Timesheet & { employee?: Profile })[]>([]);
  const [allTimesheets, setAllTimesheets] = useState<(Timesheet & { employee?: Profile })[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<(TimeOffRequest & { employee?: Profile })[]>([]);
  const [statuses, setStatuses] = useState<TimeTrackingStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [timeOffFilter, setTimeOffFilter] = useState<string>("pending");

  useEffect(() => {
    if (isHRManager()) {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all statuses
      const { data: statusData } = await supabase
        .from("time_tracking_statuses")
        .select("*")
        .order("position");

      if (statusData) {
        setStatuses(statusData as TimeTrackingStatus[]);
      }

      // Fetch all active employees
      const { data: employees } = await supabase
        .from("profiles")
        .select("*, department:departments(*)")
        .eq("is_active", true)
        .order("first_name");

      if (employees) {
        // Fetch current time entries for all employees
        const { data: currentEntries } = await supabase
          .from("time_entries")
          .select("*, status:time_tracking_statuses(*)")
          .is("clock_out", null);

        // Fetch today's entries for hours calculation
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const { data: todayEntries } = await supabase
          .from("time_entries")
          .select("*")
          .gte("clock_in", startOfDay)
          .lte("clock_in", endOfDay);

        const employeeStatusList: EmployeeStatus[] = employees.map((emp) => {
          const currentEntry = currentEntries?.find((e) => e.employee_id === emp.id) || null;
          const empTodayEntries = todayEntries?.filter((e) => e.employee_id === emp.id) || [];
          
          let todayMinutes = 0;
          empTodayEntries.forEach((entry) => {
            const start = new Date(entry.clock_in);
            const end = entry.clock_out ? new Date(entry.clock_out) : new Date();
            todayMinutes += differenceInMinutes(end, start);
          });

          return {
            employee: emp as unknown as Profile,
            currentEntry: currentEntry as unknown as TimeEntry | null,
            todayHours: Math.round((todayMinutes / 60) * 100) / 100,
          };
        });

        setEmployeeStatuses(employeeStatusList);
      }

      // Fetch pending timesheets
      const { data: pendingData } = await supabase
        .from("timesheets")
        .select("*")
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false });

      if (pendingData) {
        // Fetch employee details for each timesheet
        const employeeIds = pendingData.map((t) => t.employee_id);
        const { data: employeeData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", employeeIds);

        const pendingWithEmployees = pendingData.map((t) => ({
          ...t,
          employee: employeeData?.find((e) => e.id === t.employee_id) as unknown as Profile,
        }));

        setPendingTimesheets(pendingWithEmployees);
      }

      // Fetch all timesheets
      const { data: allData } = await supabase
        .from("timesheets")
        .select("*")
        .order("period_start", { ascending: false })
        .limit(100);

      if (allData) {
        const employeeIds = [...new Set(allData.map((t) => t.employee_id))];
        const { data: employeeData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", employeeIds);

        const allWithEmployees = allData.map((t) => ({
          ...t,
          employee: employeeData?.find((e) => e.id === t.employee_id) as unknown as Profile,
        }));

        setAllTimesheets(allWithEmployees);
      }

      // Fetch time-off requests
      const { data: timeOffData } = await supabase
        .from("time_off_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (timeOffData) {
        const employeeIds = [...new Set(timeOffData.map((r) => r.employee_id))];
        const { data: employeeData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", employeeIds);

        const requestsWithEmployees = timeOffData.map((r) => ({
          ...r,
          employee: employeeData?.find((e) => e.id === r.employee_id) as unknown as Profile,
        }));

        setTimeOffRequests(requestsWithEmployees as (TimeOffRequest & { employee?: Profile })[]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveTimesheet = async (timesheetId: string) => {
    try {
      const { error } = await supabase
        .from("timesheets")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", timesheetId);

      if (error) throw error;

      toast({ title: "Timesheet approved!" });
      fetchData();
    } catch (error) {
      console.error("Error approving timesheet:", error);
      toast({ title: "Error approving timesheet", variant: "destructive" });
    }
  };

  const handleRejectTimesheet = async (timesheetId: string) => {
    try {
      const { error } = await supabase
        .from("timesheets")
        .update({ status: "rejected" })
        .eq("id", timesheetId);

      if (error) throw error;

      toast({ title: "Timesheet rejected" });
      fetchData();
    } catch (error) {
      console.error("Error rejecting timesheet:", error);
      toast({ title: "Error rejecting timesheet", variant: "destructive" });
    }
  };

  const handleApproveTimeOff = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("time_off_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast({ title: "Time-off request approved!" });
      fetchData();
    } catch (error) {
      console.error("Error approving time-off:", error);
      toast({ title: "Error approving request", variant: "destructive" });
    }
  };

  const handleDenyTimeOff = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("time_off_requests")
        .update({
          status: "denied",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast({ title: "Time-off request denied" });
      fetchData();
    } catch (error) {
      console.error("Error denying time-off:", error);
      toast({ title: "Error denying request", variant: "destructive" });
    }
  };

  const getRequestTypeName = (type: string) => {
    const types: Record<string, string> = {
      pto: "PTO",
      sick: "Sick Leave",
      personal: "Personal Day",
      bereavement: "Bereavement",
      unpaid: "Unpaid Leave",
    };
    return types[type] || type;
  };

  const getStatusById = (id: string | null) => statuses.find((s) => s.id === id);

  const filteredEmployees = employeeStatuses.filter((es) => {
    const matchesSearch =
      `${es.employee.first_name} ${es.employee.last_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "working") return matchesSearch && es.currentEntry !== null;
    if (statusFilter === "off") return matchesSearch && es.currentEntry === null;
    return matchesSearch;
  });

  const workingCount = employeeStatuses.filter((es) => es.currentEntry !== null).length;
  const offCount = employeeStatuses.filter((es) => es.currentEntry === null).length;

  // Wait for roles to load before checking access
  if (!rolesLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isHRManager()) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-foreground">Time Management</h1>
        <p className="text-muted-foreground">Monitor employee time and approve timesheets</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Currently Working
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{workingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Off Clock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{offCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{pendingTimesheets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Time-Off Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {timeOffRequests.filter((r) => r.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employeeStatuses.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="live" className="space-y-4">
        <TabsList>
          <TabsTrigger value="live">Live Dashboard</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Approvals
            {pendingTimesheets.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingTimesheets.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="time-off">
            Time-Off Requests
            {timeOffRequests.filter((r) => r.status === "pending").length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {timeOffRequests.filter((r) => r.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">Timesheet History</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="working">Working</SelectItem>
                <SelectItem value="off">Off Clock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEmployees.map((es) => {
              const status = es.currentEntry ? getStatusById(es.currentEntry.status_id) : null;
              return (
                <Card key={es.employee.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={es.employee.avatar_url || undefined} />
                        <AvatarFallback>
                          {es.employee.first_name[0]}
                          {es.employee.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {es.employee.first_name} {es.employee.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {es.employee.job_title || "Employee"}
                        </p>
                      </div>
                      {es.currentEntry ? (
                        <Badge style={{ backgroundColor: status?.color || "#22C55E", color: "#fff" }}>
                          {status?.name || "Working"}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Off</Badge>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                      <span className="text-muted-foreground">Today:</span>
                      <span className="font-medium">{es.todayHours} hours</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="pending">
          {pendingTimesheets.length > 0 ? (
            <div className="space-y-4">
              {pendingTimesheets.map((timesheet) => (
                <Card key={timesheet.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={timesheet.employee?.avatar_url || undefined} />
                          <AvatarFallback>
                            {timesheet.employee?.first_name?.[0]}
                            {timesheet.employee?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {timesheet.employee?.first_name} {timesheet.employee?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(timesheet.period_start), "MMM d")} -{" "}
                            {format(new Date(timesheet.period_end), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {timesheet.total_regular_hours} regular + {timesheet.total_overtime_hours} OT
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Submitted {format(new Date(timesheet.submitted_at!), "MMM d")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectTimesheet(timesheet.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button size="sm" onClick={() => handleApproveTimesheet(timesheet.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-muted-foreground">No pending timesheet approvals</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="time-off" className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select value={timeOffFilter} onValueChange={setTimeOffFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="all">All Requests</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {timeOffRequests.filter((r) => timeOffFilter === "all" || r.status === timeOffFilter).length > 0 ? (
            <div className="space-y-4">
              {timeOffRequests
                .filter((r) => timeOffFilter === "all" || r.status === timeOffFilter)
                .map((request) => (
                  <Card key={request.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={request.employee?.avatar_url || undefined} />
                            <AvatarFallback>
                              {request.employee?.first_name?.[0]}
                              {request.employee?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {request.employee?.first_name} {request.employee?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getRequestTypeName(request.request_type)} •{" "}
                              {format(new Date(request.start_date), "MMM d")}
                              {request.start_date !== request.end_date &&
                                ` - ${format(new Date(request.end_date), "MMM d, yyyy")}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right mr-4">
                          <p className="font-medium">{request.hours_requested} hours</p>
                          <p className="text-sm text-muted-foreground">
                            {request.reason || "No reason provided"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {request.status === "pending" ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDenyTimeOff(request.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Deny
                              </Button>
                              <Button size="sm" onClick={() => handleApproveTimeOff(request.id)}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                            </>
                          ) : (
                            <Badge
                              variant={
                                request.status === "approved"
                                  ? "default"
                                  : request.status === "denied"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {request.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No time-off requests</p>
                <p className="text-muted-foreground">
                  {timeOffFilter === "pending"
                    ? "No pending requests to review"
                    : `No ${timeOffFilter} requests found`}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Regular Hours</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>PTO</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTimesheets.map((timesheet) => (
                  <TableRow key={timesheet.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={timesheet.employee?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {timesheet.employee?.first_name?.[0]}
                            {timesheet.employee?.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {timesheet.employee?.first_name} {timesheet.employee?.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(timesheet.period_start), "MMM d")} -{" "}
                      {format(new Date(timesheet.period_end), "MMM d")}
                    </TableCell>
                    <TableCell>{timesheet.total_regular_hours}h</TableCell>
                    <TableCell>{timesheet.total_overtime_hours}h</TableCell>
                    <TableCell>{timesheet.total_pto_hours}h</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          timesheet.status === "approved"
                            ? "default"
                            : timesheet.status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {timesheet.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

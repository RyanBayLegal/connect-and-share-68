import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Clock, Users, CheckCircle, XCircle, Search, Calendar } from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import type { TimeEntry, TimeTrackingStatus, Timesheet, Profile, TimeOffRequest } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataChanged?: () => void;
}

interface EmployeeStatus {
  employee: Profile;
  currentEntry: TimeEntry | null;
  todayHours: number;
}

export function TimeManagementModal({ open, onOpenChange, onDataChanged }: Props) {
  const { toast } = useToast();
  const [employeeStatuses, setEmployeeStatuses] = useState<EmployeeStatus[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState<(Timesheet & { employee?: Profile })[]>([]);
  const [allTimesheets, setAllTimesheets] = useState<(Timesheet & { employee?: Profile })[]>([]);
  const [statuses, setStatuses] = useState<TimeTrackingStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: statusData } = await supabase
        .from("time_tracking_statuses")
        .select("*")
        .order("position");
      if (statusData) setStatuses(statusData as TimeTrackingStatus[]);

      const { data: employees } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("first_name");

      if (employees) {
        const { data: currentEntries } = await supabase
          .from("time_entries")
          .select("*")
          .is("clock_out", null);

        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

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

      const { data: pendingData } = await supabase
        .from("timesheets")
        .select("*")
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false });

      if (pendingData) {
        const employeeIds = pendingData.map((t) => t.employee_id);
        const { data: empData } = employeeIds.length > 0
          ? await supabase.from("profiles").select("*").in("id", employeeIds)
          : { data: [] };
        setPendingTimesheets(
          pendingData.map((t) => ({
            ...t,
            employee: empData?.find((e) => e.id === t.employee_id) as unknown as Profile,
          }))
        );
      }

      const { data: allData } = await supabase
        .from("timesheets")
        .select("*")
        .order("period_start", { ascending: false })
        .limit(50);

      if (allData) {
        const employeeIds = [...new Set(allData.map((t) => t.employee_id))];
        const { data: empData } = employeeIds.length > 0
          ? await supabase.from("profiles").select("*").in("id", employeeIds)
          : { data: [] };
        setAllTimesheets(
          allData.map((t) => ({
            ...t,
            employee: empData?.find((e) => e.id === t.employee_id) as unknown as Profile,
          }))
        );
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveTimesheet = async (id: string) => {
    const { error } = await supabase
      .from("timesheets")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { toast({ title: "Error", variant: "destructive" }); return; }
    toast({ title: "Timesheet approved!" });
    fetchData();
    onDataChanged?.();
  };

  const handleRejectTimesheet = async (id: string) => {
    const { error } = await supabase.from("timesheets").update({ status: "rejected" }).eq("id", id);
    if (error) { toast({ title: "Error", variant: "destructive" }); return; }
    toast({ title: "Timesheet rejected" });
    fetchData();
    onDataChanged?.();
  };

  const getStatusById = (id: string | null) => statuses.find((s) => s.id === id);

  const filteredEmployees = employeeStatuses.filter((es) => {
    const matchesSearch = `${es.employee.first_name} ${es.employee.last_name}`.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "working") return matchesSearch && es.currentEntry !== null;
    if (statusFilter === "off") return matchesSearch && es.currentEntry === null;
    return matchesSearch;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Management
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <Tabs defaultValue="live" className="space-y-4">
            <TabsList>
              <TabsTrigger value="live">Live Dashboard</TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingTimesheets.length})
              </TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="live" className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search employees..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="working">Working</SelectItem>
                    <SelectItem value="off">Off Clock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 max-h-[50vh] overflow-y-auto">
                {filteredEmployees.map((es) => {
                  const status = es.currentEntry ? getStatusById(es.currentEntry.status_id) : null;
                  return (
                    <Card key={es.employee.id}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={es.employee.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{es.employee.first_name[0]}{es.employee.last_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{es.employee.first_name} {es.employee.last_name}</p>
                            <p className="text-xs text-muted-foreground">{es.todayHours}h today</p>
                          </div>
                          {es.currentEntry ? (
                            <Badge style={{ backgroundColor: status?.color || "hsl(var(--primary))", color: "#fff" }} className="text-xs">
                              {status?.name || "Working"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Off</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="pending">
              {pendingTimesheets.length > 0 ? (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {pendingTimesheets.map((ts) => (
                    <div key={ts.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={ts.employee?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{ts.employee?.first_name?.[0]}{ts.employee?.last_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{ts.employee?.first_name} {ts.employee?.last_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(ts.period_start), "MMM d")} - {format(new Date(ts.period_end), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right mr-4">
                        <p className="font-medium">{ts.total_regular_hours}h + {ts.total_overtime_hours}h OT</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleRejectTimesheet(ts.id)}>
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                        <Button size="sm" onClick={() => handleApproveTimesheet(ts.id)}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="font-medium">All caught up!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history">
              <div className="max-h-[60vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Regular</TableHead>
                      <TableHead>OT</TableHead>
                      <TableHead>PTO</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allTimesheets.map((ts) => (
                      <TableRow key={ts.id}>
                        <TableCell>{ts.employee?.first_name} {ts.employee?.last_name}</TableCell>
                        <TableCell>{format(new Date(ts.period_start), "MMM d")} - {format(new Date(ts.period_end), "MMM d")}</TableCell>
                        <TableCell>{ts.total_regular_hours}h</TableCell>
                        <TableCell>{ts.total_overtime_hours}h</TableCell>
                        <TableCell>{ts.total_pto_hours}h</TableCell>
                        <TableCell>
                          <Badge variant={ts.status === "approved" ? "default" : ts.status === "rejected" ? "destructive" : "secondary"}>
                            {ts.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

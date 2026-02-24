import { useState, useEffect } from "react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { FileText, Clock, Calendar, Download, Plus, X, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TimeEntry, TimeTrackingStatus, PayrollRun } from "@/types/database";
import { PTOBalanceWidget } from "@/components/dashboard/PTOBalanceWidget";

interface PayStubWithRun {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  regular_hours: number;
  overtime_hours: number;
  pto_hours: number;
  gross_pay: number;
  deductions: Record<string, number>;
  net_pay: number;
  created_at: string;
  payroll_run?: PayrollRun;
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
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export default function MyHR() {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [payStubs, setPayStubs] = useState<PayStubWithRun[]>([]);
  const [timeEntries, setTimeEntries] = useState<(TimeEntry & { status?: TimeTrackingStatus })[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [statuses, setStatuses] = useState<TimeTrackingStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("30");
  
  // Time-off request form state
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState("pto");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hoursRequested, setHoursRequested] = useState("8");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchData();
    }
  }, [profile?.id, dateFilter]);

  const fetchData = async () => {
    if (!profile?.id) return;
    setIsLoading(true);

    try {
      // Fetch pay stubs
      const { data: payStubsData } = await supabase
        .from("pay_stubs")
        .select(`
          *,
          payroll_run:payroll_runs(*)
        `)
        .eq("employee_id", profile.id)
        .order("created_at", { ascending: false });

      // Fetch time tracking statuses
      const { data: statusesData } = await supabase
        .from("time_tracking_statuses")
        .select("*")
        .eq("is_active", true);

      // Calculate date range for time entries
      const daysAgo = parseInt(dateFilter);
      const startDateFilter = new Date();
      startDateFilter.setDate(startDateFilter.getDate() - daysAgo);

      // Fetch time entries
      const { data: entriesData } = await supabase
        .from("time_entries")
        .select("*")
        .eq("employee_id", profile.id)
        .gte("clock_in", startDateFilter.toISOString())
        .order("clock_in", { ascending: false });

      // Fetch time-off requests
      const { data: requestsData } = await supabase
        .from("time_off_requests")
        .select("*")
        .eq("employee_id", profile.id)
        .order("created_at", { ascending: false });

      if (statusesData) setStatuses(statusesData);
      if (payStubsData) setPayStubs(payStubsData as PayStubWithRun[]);
      if (entriesData) {
        const entriesWithStatus = entriesData.map((entry) => ({
          ...entry,
          status: statusesData?.find((s) => s.id === entry.status_id),
        }));
        setTimeEntries(entriesWithStatus);
      }
      if (requestsData) setTimeOffRequests(requestsData as TimeOffRequest[]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load your HR data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDuration = (clockIn: string, clockOut: string | null): string => {
    if (!clockOut) return "In progress";
    const minutes = differenceInMinutes(parseISO(clockOut), parseISO(clockIn));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const handleSubmitTimeOffRequest = async () => {
    if (!profile?.id || !startDate || !endDate) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("time_off_requests").insert({
        employee_id: profile.id,
        request_type: requestType,
        start_date: startDate,
        end_date: endDate,
        hours_requested: parseFloat(hoursRequested),
        reason: reason || null,
      });

      if (error) throw error;

      toast({
        title: "Request Submitted",
        description: "Your time-off request has been submitted for approval.",
      });
      
      setRequestDialogOpen(false);
      resetRequestForm();
      fetchData();
    } catch (error) {
      console.error("Error submitting request:", error);
      toast({
        title: "Error",
        description: "Failed to submit time-off request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("time_off_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Request Cancelled",
        description: "Your time-off request has been cancelled.",
      });
      
      fetchData();
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast({
        title: "Error",
        description: "Failed to cancel request",
        variant: "destructive",
      });
    }
  };

  const resetRequestForm = () => {
    setRequestType("pto");
    setStartDate("");
    setEndDate("");
    setHoursRequested("8");
    setReason("");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      denied: "destructive",
      cancelled: "outline",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
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

  const generatePayStubPDF = async (payStub: PayStubWithRun) => {
    const html2pdf = (await import("html2pdf.js")).default;
    
    const deductionsList = Object.entries(payStub.deductions || {})
      .map(([key, value]) => `<tr><td>${key}</td><td style="text-align: right;">$${Number(value).toFixed(2)}</td></tr>`)
      .join("");

    const content = `
      <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="margin: 0; color: #1a365d;">Pay Stub</h1>
          <p style="color: #666;">Pay Date: ${payStub.payroll_run ? format(parseISO(payStub.payroll_run.pay_date), "MMMM d, yyyy") : "N/A"}</p>
        </div>
        
        <div style="margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
          <h3 style="margin: 0 0 15px 0;">Employee Information</h3>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${profile?.first_name} ${profile?.last_name}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${profile?.email}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #e2e8f0;">
              <th style="padding: 12px; text-align: left; border: 1px solid #cbd5e0;">Description</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #cbd5e0;">Hours</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding: 10px; border: 1px solid #cbd5e0;">Regular Hours</td><td style="padding: 10px; text-align: right; border: 1px solid #cbd5e0;">${payStub.regular_hours}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #cbd5e0;">Overtime Hours</td><td style="padding: 10px; text-align: right; border: 1px solid #cbd5e0;">${payStub.overtime_hours}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #cbd5e0;">PTO Hours</td><td style="padding: 10px; text-align: right; border: 1px solid #cbd5e0;">${payStub.pto_hours}</td></tr>
          </tbody>
        </table>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #e2e8f0;">
              <th style="padding: 12px; text-align: left; border: 1px solid #cbd5e0;">Earnings</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #cbd5e0;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding: 10px; border: 1px solid #cbd5e0;"><strong>Gross Pay</strong></td><td style="padding: 10px; text-align: right; border: 1px solid #cbd5e0;"><strong>$${payStub.gross_pay.toFixed(2)}</strong></td></tr>
          </tbody>
        </table>
        
        ${Object.keys(payStub.deductions || {}).length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #fed7d7;">
              <th style="padding: 12px; text-align: left; border: 1px solid #cbd5e0;">Deductions</th>
              <th style="padding: 12px; text-align: right; border: 1px solid #cbd5e0;">Amount</th>
            </tr>
          </thead>
          <tbody>${deductionsList}</tbody>
        </table>
        ` : ""}
        
        <div style="background: #c6f6d5; padding: 20px; border-radius: 8px; text-align: center;">
          <h2 style="margin: 0; color: #22543d;">Net Pay: $${payStub.net_pay.toFixed(2)}</h2>
        </div>
      </div>
    `;

    const element = document.createElement("div");
    element.innerHTML = content;

    const opt = {
      margin: 10,
      filename: `pay-stub-${payStub.payroll_run ? format(parseISO(payStub.payroll_run.pay_date), "yyyy-MM-dd") : payStub.id}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
    };

    await html2pdf().set(opt).from(element).save();
  };

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
        <h1 className="text-3xl font-bold tracking-tight">My HR</h1>
        <p className="text-muted-foreground">
          View your pay stubs, time history, and manage time-off requests
        </p>
      </div>

      <Tabs defaultValue="pto-balances" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pto-balances" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            PTO Balances
          </TabsTrigger>
          <TabsTrigger value="pay-stubs" className="gap-2">
            <FileText className="h-4 w-4" />
            My Pay Stubs
          </TabsTrigger>
          <TabsTrigger value="time-history" className="gap-2">
            <Clock className="h-4 w-4" />
            My Time History
          </TabsTrigger>
          <TabsTrigger value="time-off" className="gap-2">
            <Calendar className="h-4 w-4" />
            Time-Off Requests
          </TabsTrigger>
        </TabsList>

        {/* PTO Balances Tab */}
        <TabsContent value="pto-balances">
          <PTOBalanceWidget />
        </TabsContent>

        {/* Pay Stubs Tab */}
        <TabsContent value="pay-stubs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pay Stubs</CardTitle>
              <CardDescription>View and download your pay stubs</CardDescription>
            </CardHeader>
            <CardContent>
              {payStubs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pay stubs available yet.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pay Date</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Gross Pay</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net Pay</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payStubs.map((stub) => {
                      const totalDeductions = Object.values(stub.deductions || {}).reduce(
                        (sum, val) => sum + Number(val),
                        0
                      );
                      return (
                        <TableRow key={stub.id}>
                          <TableCell>
                            {stub.payroll_run
                              ? format(parseISO(stub.payroll_run.pay_date), "MMM d, yyyy")
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {stub.payroll_run
                              ? `${format(parseISO(stub.payroll_run.period_start), "MMM d")} - ${format(parseISO(stub.payroll_run.period_end), "MMM d")}`
                              : "N/A"}
                          </TableCell>
                          <TableCell className="text-right">${stub.gross_pay.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-destructive">
                            -${totalDeductions.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ${stub.net_pay.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generatePayStubPDF(stub)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time History Tab */}
        <TabsContent value="time-history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Time History</CardTitle>
                  <CardDescription>Your clock in/out history</CardDescription>
                </div>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {timeEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No time entries found for this period.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {format(parseISO(entry.clock_in), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(parseISO(entry.clock_in), "h:mm a")}
                        </TableCell>
                        <TableCell>
                          {entry.clock_out
                            ? format(parseISO(entry.clock_out), "h:mm a")
                            : "-"}
                        </TableCell>
                        <TableCell>{calculateDuration(entry.clock_in, entry.clock_out)}</TableCell>
                        <TableCell>
                          {entry.status ? (
                            <Badge
                              style={{ backgroundColor: entry.status.color, color: "#fff" }}
                            >
                              {entry.status.name}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {entry.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time-Off Requests Tab */}
        <TabsContent value="time-off" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Time-Off Requests</CardTitle>
                  <CardDescription>Submit and track your leave requests</CardDescription>
                </div>
                <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Request Time Off
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Request Time Off</DialogTitle>
                      <DialogDescription>
                        Submit a new time-off request for approval
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Request Type</Label>
                        <Select value={requestType} onValueChange={setRequestType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pto">PTO (Vacation)</SelectItem>
                            <SelectItem value="sick">Sick Leave</SelectItem>
                            <SelectItem value="personal">Personal Day</SelectItem>
                            <SelectItem value="bereavement">Bereavement</SelectItem>
                            <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Start Date</Label>
                          <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>End Date</Label>
                          <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Hours Requested</Label>
                        <Input
                          type="number"
                          value={hoursRequested}
                          onChange={(e) => setHoursRequested(e.target.value)}
                          min="1"
                          step="0.5"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reason (Optional)</Label>
                        <Textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Brief reason for your request..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setRequestDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitTimeOffRequest}
                        disabled={isSubmitting || !startDate || !endDate}
                      >
                        {isSubmitting ? "Submitting..." : "Submit Request"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {timeOffRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No time-off requests yet. Click "Request Time Off" to submit one.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeOffRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{getRequestTypeName(request.request_type)}</TableCell>
                        <TableCell>
                          {format(parseISO(request.start_date), "MMM d")}
                          {request.start_date !== request.end_date &&
                            ` - ${format(parseISO(request.end_date), "MMM d, yyyy")}`}
                          {request.start_date === request.end_date &&
                            `, ${format(parseISO(request.start_date), "yyyy")}`}
                        </TableCell>
                        <TableCell>{request.hours_requested}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          {format(parseISO(request.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          {request.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelRequest(request.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                          {request.review_notes && (
                            <span className="text-sm text-muted-foreground">
                              {request.review_notes}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

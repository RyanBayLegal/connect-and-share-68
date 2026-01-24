import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Users, Calendar, FileText, Plus, Edit2, Download, Play, CheckCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import type { Profile, PayrollSettings, PayrollRun, PayStub, PayrollDeductionType, EmployeeDeduction } from "@/types/database";

export default function Payroll() {
  const { isHRManager, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<(Profile & { payroll_settings?: PayrollSettings })[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [payStubs, setPayStubs] = useState<(PayStub & { employee?: Profile })[]>([]);
  const [deductionTypes, setDeductionTypes] = useState<PayrollDeductionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Payroll settings form
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);
  const [payType, setPayType] = useState<string>("hourly");
  const [hourlyRate, setHourlyRate] = useState("");
  const [annualSalary, setAnnualSalary] = useState("");
  const [overtimeMultiplier, setOvertimeMultiplier] = useState("1.5");
  const [standardHours, setStandardHours] = useState("40");
  const [taxWithholding, setTaxWithholding] = useState("0");

  // Payroll run form
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runPeriodStart, setRunPeriodStart] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [runPeriodEnd, setRunPeriodEnd] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [runPayDate, setRunPayDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Pay stub viewer
  const [viewingPayStub, setViewingPayStub] = useState<(PayStub & { employee?: Profile }) | null>(null);

  useEffect(() => {
    if (isHRManager()) {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch employees with their payroll settings
      const { data: employeeData } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("first_name");

      const { data: settingsData } = await supabase
        .from("payroll_settings")
        .select("*");

      if (employeeData) {
        const employeesWithSettings = employeeData.map((emp) => ({
          ...(emp as unknown as Profile),
          payroll_settings: settingsData?.find((s) => s.employee_id === emp.id) as PayrollSettings | undefined,
        }));
        setEmployees(employeesWithSettings);
      }

      // Fetch payroll runs
      const { data: runsData } = await supabase
        .from("payroll_runs")
        .select("*")
        .order("created_at", { ascending: false });

      if (runsData) {
        setPayrollRuns(runsData as PayrollRun[]);
      }

      // Fetch recent pay stubs
      const { data: stubsData } = await supabase
        .from("pay_stubs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (stubsData) {
        const employeeIds = [...new Set(stubsData.map((s) => s.employee_id))];
        const { data: empData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", employeeIds);

        const stubsWithEmployees = stubsData.map((stub) => ({
          ...(stub as unknown as PayStub),
          employee: empData?.find((e) => e.id === stub.employee_id) as unknown as Profile,
        }));
        setPayStubs(stubsWithEmployees);
      }

      // Fetch deduction types
      const { data: deductionData } = await supabase
        .from("payroll_deduction_types")
        .select("*")
        .eq("is_active", true);

      if (deductionData) {
        setDeductionTypes(deductionData as PayrollDeductionType[]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePayrollSettings = async () => {
    if (!selectedEmployee) return;

    try {
      const existingSettings = employees.find((e) => e.id === selectedEmployee.id)?.payroll_settings;

      const settingsData = {
        employee_id: selectedEmployee.id,
        pay_type: payType,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        annual_salary: annualSalary ? parseFloat(annualSalary) : null,
        overtime_multiplier: parseFloat(overtimeMultiplier),
        standard_hours_per_week: parseInt(standardHours),
        tax_withholding_percent: parseFloat(taxWithholding),
        updated_at: new Date().toISOString(),
      };

      if (existingSettings) {
        const { error } = await supabase
          .from("payroll_settings")
          .update(settingsData)
          .eq("id", existingSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("payroll_settings").insert(settingsData);
        if (error) throw error;
      }

      toast({ title: "Payroll settings saved!" });
      setSettingsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Error saving settings", variant: "destructive" });
    }
  };

  const handleCreatePayrollRun = async () => {
    try {
      const { data, error } = await supabase
        .from("payroll_runs")
        .insert({
          period_start: runPeriodStart,
          period_end: runPeriodEnd,
          pay_date: runPayDate,
          status: "draft",
          created_by: currentProfile?.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Payroll run created!" });
      setRunDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error creating payroll run:", error);
      toast({ title: "Error creating payroll run", variant: "destructive" });
    }
  };

  const handleProcessPayroll = async (runId: string) => {
    try {
      // Get the payroll run
      const run = payrollRuns.find((r) => r.id === runId);
      if (!run) return;

      // Generate pay stubs for all employees with payroll settings
      const employeesWithSettings = employees.filter((e) => e.payroll_settings);

      for (const emp of employeesWithSettings) {
        const settings = emp.payroll_settings!;
        
        // Calculate pay (simplified - in real app, would use actual time entries)
        let regularHours = settings.standard_hours_per_week * 2; // Bi-weekly
        let overtimeHours = 0;
        let grossPay = 0;

        if (settings.pay_type === "hourly" && settings.hourly_rate) {
          grossPay = regularHours * settings.hourly_rate + 
                     overtimeHours * settings.hourly_rate * settings.overtime_multiplier;
        } else if (settings.pay_type === "salary" && settings.annual_salary) {
          grossPay = settings.annual_salary / 26; // Bi-weekly
        }

        // Calculate deductions
        const taxDeduction = grossPay * (settings.tax_withholding_percent / 100);
        const netPay = grossPay - taxDeduction;

        await supabase.from("pay_stubs").insert({
          payroll_run_id: runId,
          employee_id: emp.id,
          regular_hours: regularHours,
          overtime_hours: overtimeHours,
          pto_hours: 0,
          gross_pay: grossPay,
          deductions: { tax: taxDeduction },
          net_pay: netPay,
        });
      }

      // Update payroll run status
      await supabase
        .from("payroll_runs")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", runId);

      toast({ title: "Payroll processed successfully!" });
      fetchData();
    } catch (error) {
      console.error("Error processing payroll:", error);
      toast({ title: "Error processing payroll", variant: "destructive" });
    }
  };

  const openEditSettings = (employee: Profile & { payroll_settings?: PayrollSettings }) => {
    setSelectedEmployee(employee);
    const settings = employee.payroll_settings;
    setPayType(settings?.pay_type || "hourly");
    setHourlyRate(settings?.hourly_rate?.toString() || "");
    setAnnualSalary(settings?.annual_salary?.toString() || "");
    setOvertimeMultiplier(settings?.overtime_multiplier?.toString() || "1.5");
    setStandardHours(settings?.standard_hours_per_week?.toString() || "40");
    setTaxWithholding(settings?.tax_withholding_percent?.toString() || "0");
    setSettingsDialogOpen(true);
  };

  const getRunStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "processing":
        return "secondary";
      default:
        return "outline";
    }
  };

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
        <h1 className="text-3xl font-bold text-foreground">Payroll Management</h1>
        <p className="text-muted-foreground">Manage employee compensation and process payroll</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Configured
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {employees.filter((e) => e.payroll_settings).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {employees.filter((e) => !e.payroll_settings).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payroll Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payrollRuns.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">
            <Users className="h-4 w-4 mr-2" />
            Employee Settings
          </TabsTrigger>
          <TabsTrigger value="runs">
            <Calendar className="h-4 w-4 mr-2" />
            Payroll Runs
          </TabsTrigger>
          <TabsTrigger value="stubs">
            <FileText className="h-4 w-4 mr-2" />
            Pay Stubs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Employee Payroll Settings</CardTitle>
              <CardDescription>
                Configure pay rates and tax withholding for each employee
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Pay Type</TableHead>
                    <TableHead>Rate/Salary</TableHead>
                    <TableHead>Standard Hours</TableHead>
                    <TableHead>Tax Withholding</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={emp.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {emp.first_name[0]}
                              {emp.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">{emp.job_title}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {emp.payroll_settings ? (
                          <Badge variant="outline">
                            {emp.payroll_settings.pay_type === "hourly" ? "Hourly" : "Salary"}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Not Set</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.payroll_settings?.pay_type === "hourly"
                          ? `$${emp.payroll_settings.hourly_rate}/hr`
                          : emp.payroll_settings?.annual_salary
                          ? `$${emp.payroll_settings.annual_salary.toLocaleString()}/yr`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {emp.payroll_settings?.standard_hours_per_week || "-"} hrs/week
                      </TableCell>
                      <TableCell>
                        {emp.payroll_settings?.tax_withholding_percent || 0}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditSettings(emp)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Settings Dialog */}
          <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  Payroll Settings: {selectedEmployee?.first_name} {selectedEmployee?.last_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Pay Type</Label>
                  <Select value={payType} onValueChange={setPayType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="salary">Salary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {payType === "hourly" ? (
                  <div className="space-y-2">
                    <Label>Hourly Rate ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="25.00"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Annual Salary ($)</Label>
                    <Input
                      type="number"
                      step="1000"
                      value={annualSalary}
                      onChange={(e) => setAnnualSalary(e.target.value)}
                      placeholder="65000"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Standard Hours/Week</Label>
                    <Input
                      type="number"
                      value={standardHours}
                      onChange={(e) => setStandardHours(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>OT Multiplier</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={overtimeMultiplier}
                      onChange={(e) => setOvertimeMultiplier(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tax Withholding (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={taxWithholding}
                    onChange={(e) => setTaxWithholding(e.target.value)}
                    placeholder="22"
                  />
                </div>

                <Button onClick={handleSavePayrollSettings} className="w-full">
                  Save Settings
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="runs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payroll Runs</CardTitle>
                <CardDescription>Create and process payroll for pay periods</CardDescription>
              </div>
              <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Payroll Run
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Payroll Run</DialogTitle>
                    <DialogDescription>
                      Define the pay period and pay date for this payroll run
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Period Start</Label>
                        <Input
                          type="date"
                          value={runPeriodStart}
                          onChange={(e) => setRunPeriodStart(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Period End</Label>
                        <Input
                          type="date"
                          value={runPeriodEnd}
                          onChange={(e) => setRunPeriodEnd(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Pay Date</Label>
                      <Input
                        type="date"
                        value={runPayDate}
                        onChange={(e) => setRunPayDate(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleCreatePayrollRun} className="w-full">
                      Create Payroll Run
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {payrollRuns.length > 0 ? (
                <div className="space-y-4">
                  {payrollRuns.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {format(new Date(run.period_start), "MMM d")} -{" "}
                          {format(new Date(run.period_end), "MMM d, yyyy")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Pay Date: {format(new Date(run.pay_date), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getRunStatusColor(run.status) as any}>
                          {run.status}
                        </Badge>
                        {run.status === "draft" && (
                          <Button size="sm" onClick={() => handleProcessPayroll(run.id)}>
                            <Play className="h-4 w-4 mr-1" />
                            Process
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No payroll runs yet. Create one to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stubs">
          <Card>
            <CardHeader>
              <CardTitle>Pay Stubs</CardTitle>
              <CardDescription>View generated pay stubs for all employees</CardDescription>
            </CardHeader>
            <CardContent>
              {payStubs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Gross Pay</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Pay</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payStubs.map((stub) => {
                      const totalDeductions = Object.values(stub.deductions || {}).reduce(
                        (a, b) => a + b,
                        0
                      );
                      return (
                        <TableRow key={stub.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={stub.employee?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {stub.employee?.first_name?.[0]}
                                  {stub.employee?.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <span>
                                {stub.employee?.first_name} {stub.employee?.last_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(stub.created_at), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            {stub.regular_hours}h + {stub.overtime_hours}h OT
                          </TableCell>
                          <TableCell>${stub.gross_pay.toFixed(2)}</TableCell>
                          <TableCell className="text-destructive">
                            -${totalDeductions.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-medium">
                            ${stub.net_pay.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingPayStub(stub)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No pay stubs generated yet. Process a payroll run to generate pay stubs.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pay Stub Viewer Dialog */}
          <Dialog open={!!viewingPayStub} onOpenChange={() => setViewingPayStub(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Pay Stub</DialogTitle>
              </DialogHeader>
              {viewingPayStub && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-4 border-b">
                    <Avatar>
                      <AvatarImage src={viewingPayStub.employee?.avatar_url || undefined} />
                      <AvatarFallback>
                        {viewingPayStub.employee?.first_name?.[0]}
                        {viewingPayStub.employee?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {viewingPayStub.employee?.first_name} {viewingPayStub.employee?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(viewingPayStub.created_at), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Regular Hours</span>
                      <span>{viewingPayStub.regular_hours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Overtime Hours</span>
                      <span>{viewingPayStub.overtime_hours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PTO Hours</span>
                      <span>{viewingPayStub.pto_hours}h</span>
                    </div>
                  </div>

                  <div className="border-t pt-2 space-y-2">
                    <div className="flex justify-between font-medium">
                      <span>Gross Pay</span>
                      <span>${viewingPayStub.gross_pay.toFixed(2)}</span>
                    </div>
                    {Object.entries(viewingPayStub.deductions || {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-destructive">
                        <span className="capitalize">{key}</span>
                        <span>-${(value as number).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Net Pay</span>
                      <span className="text-green-600">${viewingPayStub.net_pay.toFixed(2)}</span>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}

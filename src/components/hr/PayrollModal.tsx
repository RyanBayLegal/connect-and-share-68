import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Plus, Edit2, Play, Download, FileText, Loader2 } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import html2pdf from "html2pdf.js";
import type { Profile, PayrollSettings, PayrollRun, PayStub } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataChanged?: () => void;
}

export function PayrollModal({ open, onOpenChange, onDataChanged }: Props) {
  const { profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<(Profile & { payroll_settings?: PayrollSettings })[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [payStubs, setPayStubs] = useState<(PayStub & { employee?: Profile })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Settings form
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Profile | null>(null);
  const [payType, setPayType] = useState("hourly");
  const [hourlyRate, setHourlyRate] = useState("");
  const [annualSalary, setAnnualSalary] = useState("");
  const [overtimeMultiplier, setOvertimeMultiplier] = useState("1.5");
  const [standardHours, setStandardHours] = useState("40");
  const [taxWithholding, setTaxWithholding] = useState("0");

  // Run form
  const [runFormOpen, setRunFormOpen] = useState(false);
  const [runPeriodStart, setRunPeriodStart] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [runPeriodEnd, setRunPeriodEnd] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [runPayDate, setRunPayDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: empData } = await supabase.from("profiles").select("*").eq("is_active", true).order("first_name");
      const { data: settingsData } = await supabase.from("payroll_settings").select("*");

      if (empData) {
        setEmployees(empData.map((emp) => ({
          ...(emp as unknown as Profile),
          payroll_settings: settingsData?.find((s) => s.employee_id === emp.id) as PayrollSettings | undefined,
        })));
      }

      const { data: runsData } = await supabase.from("payroll_runs").select("*").order("created_at", { ascending: false });
      if (runsData) setPayrollRuns(runsData as PayrollRun[]);

      const { data: stubsData } = await supabase.from("pay_stubs").select("*").order("created_at", { ascending: false }).limit(50);
      if (stubsData) {
        const stubEmpIds = [...new Set(stubsData.map((s) => s.employee_id))];
        const { data: stubEmpData } = stubEmpIds.length > 0
          ? await supabase.from("profiles").select("*").in("id", stubEmpIds)
          : { data: [] };
        setPayStubs(stubsData.map((s) => ({
          ...(s as unknown as PayStub),
          employee: stubEmpData?.find((e) => e.id === s.employee_id) as unknown as Profile,
        })));
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditSettings = (emp: Profile & { payroll_settings?: PayrollSettings }) => {
    setSelectedEmployee(emp);
    const s = emp.payroll_settings;
    setPayType(s?.pay_type || "hourly");
    setHourlyRate(s?.hourly_rate?.toString() || "");
    setAnnualSalary(s?.annual_salary?.toString() || "");
    setOvertimeMultiplier(s?.overtime_multiplier?.toString() || "1.5");
    setStandardHours(s?.standard_hours_per_week?.toString() || "40");
    setTaxWithholding(s?.tax_withholding_percent?.toString() || "0");
    setSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    if (!selectedEmployee) return;
    try {
      const existing = employees.find((e) => e.id === selectedEmployee.id)?.payroll_settings;
      const data = {
        employee_id: selectedEmployee.id,
        pay_type: payType,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        annual_salary: annualSalary ? parseFloat(annualSalary) : null,
        overtime_multiplier: parseFloat(overtimeMultiplier),
        standard_hours_per_week: parseInt(standardHours),
        tax_withholding_percent: parseFloat(taxWithholding),
      };
      if (existing) {
        await supabase.from("payroll_settings").update(data).eq("id", existing.id);
      } else {
        await supabase.from("payroll_settings").insert(data);
      }
      toast({ title: "Settings saved!" });
      setSettingsOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleCreateRun = async () => {
    try {
      await supabase.from("payroll_runs").insert({
        period_start: runPeriodStart, period_end: runPeriodEnd, pay_date: runPayDate,
        status: "draft", created_by: currentProfile?.id,
      });
      toast({ title: "Payroll run created!" });
      setRunFormOpen(false);
      fetchData();
      onDataChanged?.();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleProcessPayroll = async (runId: string) => {
    try {
      const empsWithSettings = employees.filter((e) => e.payroll_settings);
      for (const emp of empsWithSettings) {
        const s = emp.payroll_settings!;
        let regularHours = s.standard_hours_per_week * 2;
        let grossPay = s.pay_type === "hourly" && s.hourly_rate
          ? regularHours * s.hourly_rate
          : s.annual_salary ? s.annual_salary / 26 : 0;
        const taxDeduction = grossPay * (s.tax_withholding_percent / 100);
        await supabase.from("pay_stubs").insert({
          payroll_run_id: runId, employee_id: emp.id,
          regular_hours: regularHours, overtime_hours: 0, pto_hours: 0,
          gross_pay: grossPay, deductions: { tax: taxDeduction }, net_pay: grossPay - taxDeduction,
        });
      }
      await supabase.from("payroll_runs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", runId);
      toast({ title: "Payroll processed!" });
      fetchData();
      onDataChanged?.();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const generatePDF = async (stub: PayStub & { employee?: Profile }) => {
    setIsGeneratingPdf(true);
    try {
      const totalDed = Object.values(stub.deductions || {}).reduce((a, b) => a + (b as number), 0);
      const el = document.createElement("div");
      el.innerHTML = `<div style="font-family:Arial;padding:40px;max-width:600px;margin:0 auto">
        <h1 style="text-align:center;color:#1e40af">PAY STUB</h1>
        <p><strong>${stub.employee?.first_name} ${stub.employee?.last_name}</strong></p>
        <p>Date: ${format(new Date(stub.created_at), "MMM d, yyyy")}</p>
        <hr/>
        <p>Regular: ${stub.regular_hours}h | OT: ${stub.overtime_hours}h | PTO: ${stub.pto_hours}h</p>
        <p>Gross: $${stub.gross_pay.toFixed(2)} | Deductions: $${totalDed.toFixed(2)}</p>
        <h2 style="color:#059669">Net Pay: $${stub.net_pay.toFixed(2)}</h2>
      </div>`;
      await html2pdf().from(el).set({
        margin: 10,
        filename: `paystub-${stub.employee?.last_name}-${format(new Date(stub.created_at), "yyyy-MM-dd")}.pdf`,
      }).save();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payroll Management
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <Tabs defaultValue="employees" className="space-y-4">
            <TabsList>
              <TabsTrigger value="employees">Employee Settings</TabsTrigger>
              <TabsTrigger value="runs">Payroll Runs</TabsTrigger>
              <TabsTrigger value="stubs">Pay Stubs</TabsTrigger>
            </TabsList>

            <TabsContent value="employees">
              <div className="max-h-[55vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Pay Type</TableHead>
                      <TableHead>Rate/Salary</TableHead>
                      <TableHead>Tax %</TableHead>
                      <TableHead className="text-right">Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={emp.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{emp.first_name[0]}{emp.last_name[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{emp.first_name} {emp.last_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {emp.payroll_settings ? (
                            <Badge variant="outline">{emp.payroll_settings.pay_type === "hourly" ? "Hourly" : "Salary"}</Badge>
                          ) : <Badge variant="destructive">Not Set</Badge>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {emp.payroll_settings?.pay_type === "hourly" ? `$${emp.payroll_settings.hourly_rate}/hr` :
                           emp.payroll_settings?.annual_salary ? `$${emp.payroll_settings.annual_salary.toLocaleString()}/yr` : "-"}
                        </TableCell>
                        <TableCell>{emp.payroll_settings?.tax_withholding_percent || 0}%</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditSettings(emp)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Inline settings form */}
              {settingsOpen && selectedEmployee && (
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Settings: {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Pay Type</Label>
                      <Select value={payType} onValueChange={setPayType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="salary">Salary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {payType === "hourly" ? (
                      <div><Label>Hourly Rate ($)</Label><Input type="number" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} /></div>
                    ) : (
                      <div><Label>Annual Salary ($)</Label><Input type="number" step="1000" value={annualSalary} onChange={(e) => setAnnualSalary(e.target.value)} /></div>
                    )}
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Hrs/Week</Label><Input type="number" value={standardHours} onChange={(e) => setStandardHours(e.target.value)} /></div>
                      <div><Label>OT Mult</Label><Input type="number" step="0.1" value={overtimeMultiplier} onChange={(e) => setOvertimeMultiplier(e.target.value)} /></div>
                      <div><Label>Tax %</Label><Input type="number" step="0.1" value={taxWithholding} onChange={(e) => setTaxWithholding(e.target.value)} /></div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveSettings} className="flex-1">Save</Button>
                      <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="runs" className="space-y-4">
              {!runFormOpen ? (
                <Button onClick={() => setRunFormOpen(true)}><Plus className="h-4 w-4 mr-2" /> New Payroll Run</Button>
              ) : (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Period Start</Label><Input type="date" value={runPeriodStart} onChange={(e) => setRunPeriodStart(e.target.value)} /></div>
                      <div><Label>Period End</Label><Input type="date" value={runPeriodEnd} onChange={(e) => setRunPeriodEnd(e.target.value)} /></div>
                      <div><Label>Pay Date</Label><Input type="date" value={runPayDate} onChange={(e) => setRunPayDate(e.target.value)} /></div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateRun}>Create Run</Button>
                      <Button variant="outline" onClick={() => setRunFormOpen(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {payrollRuns.map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{format(new Date(run.period_start), "MMM d")} - {format(new Date(run.period_end), "MMM d, yyyy")}</p>
                      <p className="text-sm text-muted-foreground">Pay: {format(new Date(run.pay_date), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={run.status === "completed" ? "default" : "outline"}>{run.status}</Badge>
                      {run.status === "draft" && (
                        <Button size="sm" onClick={() => handleProcessPayroll(run.id)}>
                          <Play className="h-4 w-4 mr-1" /> Process
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {payrollRuns.length === 0 && <p className="text-center py-4 text-muted-foreground">No payroll runs yet.</p>}
              </div>
            </TabsContent>

            <TabsContent value="stubs">
              <div className="max-h-[55vh] overflow-y-auto">
                {payStubs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Gross</TableHead>
                        <TableHead>Net</TableHead>
                        <TableHead className="text-right">PDF</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payStubs.map((stub) => (
                        <TableRow key={stub.id}>
                          <TableCell>{stub.employee?.first_name} {stub.employee?.last_name}</TableCell>
                          <TableCell>{format(new Date(stub.created_at), "MMM d, yyyy")}</TableCell>
                          <TableCell>${stub.gross_pay.toFixed(2)}</TableCell>
                          <TableCell className="font-medium">${stub.net_pay.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => generatePDF(stub)} disabled={isGeneratingPdf}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : <p className="text-center py-8 text-muted-foreground">No pay stubs yet.</p>}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { DollarSign, Users, Calendar, FileText, Plus, Edit2, Download, Play, CheckCircle, Loader2, Trash2, Receipt } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import html2pdf from "html2pdf.js";
import type { Profile, PayrollSettings, PayrollRun, PayStub, PayrollDeductionType, EmployeeDeduction } from "@/types/database";

export default function Payroll() {
  const { isHRManager, rolesLoaded, profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<(Profile & { payroll_settings?: PayrollSettings })[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [payStubs, setPayStubs] = useState<(PayStub & { employee?: Profile })[]>([]);
  const [deductionTypes, setDeductionTypes] = useState<PayrollDeductionType[]>([]);
  const [employeeDeductions, setEmployeeDeductions] = useState<(EmployeeDeduction & { deduction_type?: PayrollDeductionType })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Deduction type form
  const [dedTypeDialogOpen, setDedTypeDialogOpen] = useState(false);
  const [editingDedType, setEditingDedType] = useState<PayrollDeductionType | null>(null);
  const [dedTypeName, setDedTypeName] = useState("");
  const [dedTypeDescription, setDedTypeDescription] = useState("");
  const [dedTypeIsPercentage, setDedTypeIsPercentage] = useState(false);
  const [dedTypeDefaultAmount, setDedTypeDefaultAmount] = useState("");

  // Employee deduction assignment
  const [empDedDialogOpen, setEmpDedDialogOpen] = useState(false);
  const [empDedEmployee, setEmpDedEmployee] = useState("");
  const [empDedType, setEmpDedType] = useState("");
  const [empDedAmount, setEmpDedAmount] = useState("");

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

  // Pay stub viewer, editor and PDF
  const [viewingPayStub, setViewingPayStub] = useState<(PayStub & { employee?: Profile }) | null>(null);
  const [editingPayStub, setEditingPayStub] = useState<(PayStub & { employee?: Profile }) | null>(null);
  const [editGrossPay, setEditGrossPay] = useState("");
  const [editNetPay, setEditNetPay] = useState("");
  const [editRegularHours, setEditRegularHours] = useState("");
  const [editOvertimeHours, setEditOvertimeHours] = useState("");
  const [editPtoHours, setEditPtoHours] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const payStubRef = useRef<HTMLDivElement>(null);

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

      // Fetch all deduction types (including inactive for management)
      const { data: allDedTypes } = await supabase
        .from("payroll_deduction_types")
        .select("*")
        .order("name");
      if (allDedTypes) {
        setDeductionTypes(allDedTypes as PayrollDeductionType[]);
      }

      // Fetch employee deductions with type info
      const { data: empDedData } = await supabase
        .from("employee_deductions")
        .select("*, deduction_type:payroll_deduction_types(*)")
        .order("created_at", { ascending: false });
      if (empDedData) {
        setEmployeeDeductions(empDedData.map((d) => ({
          ...(d as unknown as EmployeeDeduction),
          deduction_type: d.deduction_type as unknown as PayrollDeductionType,
        })));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Deduction type CRUD
  const openDedTypeForm = (dedType?: PayrollDeductionType) => {
    setEditingDedType(dedType || null);
    setDedTypeName(dedType?.name || "");
    setDedTypeDescription(dedType?.description || "");
    setDedTypeIsPercentage(dedType?.is_percentage || false);
    setDedTypeDefaultAmount(dedType?.default_amount?.toString() || "");
    setDedTypeDialogOpen(true);
  };

  const handleSaveDedType = async () => {
    if (!dedTypeName.trim()) return;
    try {
      const data = {
        name: dedTypeName.trim(),
        description: dedTypeDescription.trim() || null,
        is_percentage: dedTypeIsPercentage,
        default_amount: dedTypeDefaultAmount ? parseFloat(dedTypeDefaultAmount) : null,
      };
      if (editingDedType) {
        await supabase.from("payroll_deduction_types").update(data).eq("id", editingDedType.id);
      } else {
        await supabase.from("payroll_deduction_types").insert(data);
      }
      toast({ title: `Deduction type ${editingDedType ? "updated" : "created"}!` });
      setDedTypeDialogOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: "Error saving deduction type", variant: "destructive" });
    }
  };

  const handleToggleDedType = async (id: string, isActive: boolean) => {
    await supabase.from("payroll_deduction_types").update({ is_active: !isActive }).eq("id", id);
    fetchData();
  };

  const handleDeleteDedType = async (id: string) => {
    // Check if in use
    const { data: inUse } = await supabase.from("employee_deductions").select("id").eq("deduction_type_id", id).limit(1);
    if (inUse && inUse.length > 0) {
      toast({ title: "Cannot delete — deduction type is assigned to employees. Deactivate it instead.", variant: "destructive" });
      return;
    }
    await supabase.from("payroll_deduction_types").delete().eq("id", id);
    toast({ title: "Deduction type deleted" });
    fetchData();
  };

  // Employee deduction assignment
  const handleAssignDeduction = async () => {
    if (!empDedEmployee || !empDedType || !empDedAmount) return;
    try {
      await supabase.from("employee_deductions").insert({
        employee_id: empDedEmployee,
        deduction_type_id: empDedType,
        amount: parseFloat(empDedAmount),
        is_active: true,
      });
      toast({ title: "Deduction assigned to employee!" });
      setEmpDedDialogOpen(false);
      setEmpDedEmployee("");
      setEmpDedType("");
      setEmpDedAmount("");
      fetchData();
    } catch (error) {
      toast({ title: "Error assigning deduction", variant: "destructive" });
    }
  };

  const handleToggleEmpDeduction = async (id: string, isActive: boolean) => {
    await supabase.from("employee_deductions").update({ is_active: !isActive }).eq("id", id);
    fetchData();
  };

  const handleDeleteEmpDeduction = async (id: string) => {
    await supabase.from("employee_deductions").delete().eq("id", id);
    toast({ title: "Employee deduction removed" });
    fetchData();
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
      const run = payrollRuns.find((r) => r.id === runId);
      if (!run) return;

      const employeesWithSettings = employees.filter((e) => e.payroll_settings);

      // Fetch all time entries for the pay period
      const { data: periodEntries } = await supabase
        .from("time_entries")
        .select("employee_id, clock_in, clock_out")
        .gte("clock_in", run.period_start)
        .lte("clock_in", run.period_end + "T23:59:59")
        .not("clock_out", "is", null);

      // Fetch approved PTO for the period
      const { data: ptoRequests } = await supabase
        .from("time_off_requests")
        .select("employee_id, hours_requested")
        .eq("status", "approved")
        .gte("start_date", run.period_start)
        .lte("end_date", run.period_end);

      // Calculate weeks in pay period
      const periodStart = new Date(run.period_start);
      const periodEnd = new Date(run.period_end);
      const periodDays = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const periodWeeks = periodDays / 7;

      // Fetch employee deductions
      const { data: allDeductions } = await supabase
        .from("employee_deductions")
        .select("*, deduction_type:payroll_deduction_types(*)")
        .eq("is_active", true);

      for (const emp of employeesWithSettings) {
        const settings = emp.payroll_settings!;

        // Sum actual worked hours from time entries
        const empEntries = (periodEntries || []).filter((e) => e.employee_id === emp.id);
        let totalWorkedHours = 0;
        empEntries.forEach((entry) => {
          const start = new Date(entry.clock_in).getTime();
          const end = new Date(entry.clock_out!).getTime();
          totalWorkedHours += (end - start) / (1000 * 60 * 60);
        });
        totalWorkedHours = Math.round(totalWorkedHours * 100) / 100;

        // Calculate PTO hours for this employee
        const empPto = (ptoRequests || [])
          .filter((p) => p.employee_id === emp.id)
          .reduce((sum, p) => sum + (p.hours_requested || 0), 0);

        // Calculate regular vs overtime (worked hours only, PTO counted separately)
        const expectedHours = settings.standard_hours_per_week * periodWeeks;
        let regularHours: number;
        let overtimeHours: number;

        // For overtime calculation, include PTO as "covered" hours
        const totalCoveredHours = totalWorkedHours + empPto;

        if (totalWorkedHours > expectedHours) {
          regularHours = Math.round(expectedHours * 100) / 100;
          overtimeHours = Math.round((totalWorkedHours - expectedHours) * 100) / 100;
        } else {
          regularHours = totalWorkedHours;
          overtimeHours = 0;
        }

        // Calculate gross pay
        let grossPay = 0;
        if (settings.pay_type === "hourly" && settings.hourly_rate) {
          // Pay for worked hours (regular + overtime) PLUS PTO hours at regular rate
          grossPay = regularHours * settings.hourly_rate +
                     overtimeHours * settings.hourly_rate * settings.overtime_multiplier +
                     empPto * settings.hourly_rate;
        } else if (settings.pay_type === "salary" && settings.annual_salary) {
          // Salary employees get fixed pay — PTO does not reduce salary
          grossPay = settings.annual_salary / (52 / periodWeeks);
        }
        grossPay = Math.round(grossPay * 100) / 100;

        // Calculate deductions
        const deductions: Record<string, number> = {};
        const taxDeduction = Math.round(grossPay * (settings.tax_withholding_percent / 100) * 100) / 100;
        if (taxDeduction > 0) deductions.tax = taxDeduction;

        // Apply employee-specific deductions
        const empDeductions = (allDeductions || []).filter((d) => d.employee_id === emp.id);
        for (const ded of empDeductions) {
          const dedType = ded.deduction_type as any;
          const dedName = dedType?.name || "Other";
          if (dedType?.is_percentage) {
            deductions[dedName] = Math.round(grossPay * (ded.amount / 100) * 100) / 100;
          } else {
            deductions[dedName] = ded.amount;
          }
        }

        const totalDeductions = Object.values(deductions).reduce((a, b) => a + b, 0);
        const netPay = Math.round((grossPay - totalDeductions) * 100) / 100;

        await supabase.from("pay_stubs").insert({
          payroll_run_id: runId,
          employee_id: emp.id,
          regular_hours: regularHours,
          overtime_hours: overtimeHours,
          pto_hours: empPto,
          gross_pay: grossPay,
          deductions,
          net_pay: netPay,
        });
      }

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

  const generatePayStubPDF = async (payStub: PayStub & { employee?: Profile }) => {
    setIsGeneratingPdf(true);
    try {
      const totalDeductions = Object.values(payStub.deductions || {}).reduce(
        (a, b) => a + (b as number),
        0
      );

      const element = document.createElement("div");
      element.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
            <h1 style="margin: 0; color: #1e40af; font-size: 24px;">PAY STUB</h1>
            <p style="margin: 5px 0 0; color: #6b7280;">Bay Legal</p>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div>
              <h3 style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">EMPLOYEE</h3>
              <p style="margin: 0; font-weight: bold; font-size: 16px;">${payStub.employee?.first_name} ${payStub.employee?.last_name}</p>
              <p style="margin: 5px 0 0; color: #6b7280; font-size: 14px;">${payStub.employee?.job_title || "Employee"}</p>
            </div>
            <div style="text-align: right;">
              <h3 style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">PAY DATE</h3>
              <p style="margin: 0; font-weight: bold; font-size: 16px;">${format(new Date(payStub.created_at), "MMMM d, yyyy")}</p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="text-align: left; padding: 12px; border: 1px solid #e5e7eb;">Description</th>
                <th style="text-align: right; padding: 12px; border: 1px solid #e5e7eb;">Hours</th>
                <th style="text-align: right; padding: 12px; border: 1px solid #e5e7eb;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">Regular Hours</td>
                <td style="text-align: right; padding: 12px; border: 1px solid #e5e7eb;">${payStub.regular_hours}</td>
                <td style="text-align: right; padding: 12px; border: 1px solid #e5e7eb;">-</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">Overtime Hours</td>
                <td style="text-align: right; padding: 12px; border: 1px solid #e5e7eb;">${payStub.overtime_hours}</td>
                <td style="text-align: right; padding: 12px; border: 1px solid #e5e7eb;">-</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e5e7eb;">PTO Hours</td>
                <td style="text-align: right; padding: 12px; border: 1px solid #e5e7eb;">${payStub.pto_hours}</td>
                <td style="text-align: right; padding: 12px; border: 1px solid #e5e7eb;">-</td>
              </tr>
              <tr style="background-color: #f3f4f6; font-weight: bold;">
                <td style="padding: 12px; border: 1px solid #e5e7eb;" colspan="2">Gross Pay</td>
                <td style="text-align: right; padding: 12px; border: 1px solid #e5e7eb;">$${payStub.gross_pay.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <h3 style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">DEDUCTIONS</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <tbody>
              ${Object.entries(payStub.deductions || {})
                .map(
                  ([key, value]) => `
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb; text-transform: capitalize;">${key}</td>
                  <td style="text-align: right; padding: 10px; border: 1px solid #e5e7eb; color: #dc2626;">-$${(value as number).toFixed(2)}</td>
                </tr>
              `
                )
                .join("")}
              <tr style="background-color: #fef2f2; font-weight: bold;">
                <td style="padding: 10px; border: 1px solid #e5e7eb;">Total Deductions</td>
                <td style="text-align: right; padding: 10px; border: 1px solid #e5e7eb; color: #dc2626;">-$${totalDeductions.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; text-align: center;">
            <h3 style="margin: 0 0 5px; font-size: 14px; color: #6b7280;">NET PAY</h3>
            <p style="margin: 0; font-size: 32px; font-weight: bold; color: #059669;">$${payStub.net_pay.toFixed(2)}</p>
          </div>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
            <p>This is an official pay stub from Bay Legal. Please retain for your records.</p>
            <p>Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
          </div>
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `paystub-${payStub.employee?.first_name}-${payStub.employee?.last_name}-${format(new Date(payStub.created_at), "yyyy-MM-dd")}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      };

      await html2pdf().from(element).set(opt).save();
      toast({ title: "PDF downloaded successfully!" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "Error generating PDF", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

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
          <TabsTrigger value="deductions">
            <Receipt className="h-4 w-4 mr-2" />
            Deductions
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
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => generatePayStubPDF(stub)}
                                disabled={isGeneratingPdf}
                                title="Download PDF"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingPayStub(stub)}
                                title="View Details"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </div>
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

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => generatePayStubPDF(viewingPayStub)}
                    disabled={isGeneratingPdf}
                  >
                    {isGeneratingPdf ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {isGeneratingPdf ? "Generating..." : "Download PDF"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>
        <TabsContent value="deductions" className="space-y-6">
          {/* Deduction Types Management */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Deduction Types</CardTitle>
                <CardDescription>Manage tax and benefit deduction categories (e.g., Federal Tax, State Tax, Health Insurance, 401k)</CardDescription>
              </div>
              <Button onClick={() => openDedTypeForm()}>
                <Plus className="h-4 w-4 mr-2" /> Add Type
              </Button>
            </CardHeader>
            <CardContent>
              {deductionTypes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Default</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deductionTypes.map((dt) => (
                      <TableRow key={dt.id} className={!dt.is_active ? "opacity-50" : ""}>
                        <TableCell className="font-medium">{dt.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{dt.description || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{dt.is_percentage ? "Percentage" : "Fixed Amount"}</Badge>
                        </TableCell>
                        <TableCell>
                          {dt.default_amount != null ? (dt.is_percentage ? `${dt.default_amount}%` : `$${dt.default_amount}`) : "-"}
                        </TableCell>
                        <TableCell>
                          <Switch checked={dt.is_active} onCheckedChange={() => handleToggleDedType(dt.id, dt.is_active)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openDedTypeForm(dt)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteDedType(dt.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No deduction types configured. Add types like Federal Tax, State Tax, Health Insurance, 401(k), etc.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deduction Type Dialog */}
          <Dialog open={dedTypeDialogOpen} onOpenChange={setDedTypeDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingDedType ? "Edit" : "Add"} Deduction Type</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={dedTypeName} onChange={(e) => setDedTypeName(e.target.value)} placeholder="e.g., Federal Income Tax" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={dedTypeDescription} onChange={(e) => setDedTypeDescription(e.target.value)} placeholder="Optional description" />
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="isPercentage" checked={dedTypeIsPercentage} onCheckedChange={(v) => setDedTypeIsPercentage(v === true)} />
                  <Label htmlFor="isPercentage">Calculate as percentage of gross pay</Label>
                </div>
                <div className="space-y-2">
                  <Label>Default Amount {dedTypeIsPercentage ? "(%)" : "($)"}</Label>
                  <Input type="number" step="0.01" value={dedTypeDefaultAmount} onChange={(e) => setDedTypeDefaultAmount(e.target.value)} placeholder={dedTypeIsPercentage ? "22" : "100"} />
                </div>
                <Button onClick={handleSaveDedType} className="w-full">{editingDedType ? "Update" : "Create"} Deduction Type</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Employee Deductions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Employee Deductions</CardTitle>
                <CardDescription>Assign deduction types to individual employees</CardDescription>
              </div>
              <Button onClick={() => setEmpDedDialogOpen(true)} disabled={deductionTypes.filter((d) => d.is_active).length === 0}>
                <Plus className="h-4 w-4 mr-2" /> Assign Deduction
              </Button>
            </CardHeader>
            <CardContent>
              {employeeDeductions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Deduction</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeDeductions.map((ed) => {
                      const emp = employees.find((e) => e.id === ed.employee_id);
                      return (
                        <TableRow key={ed.id} className={!ed.is_active ? "opacity-50" : ""}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={emp?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">{emp?.first_name?.[0]}{emp?.last_name?.[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{emp?.first_name} {emp?.last_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{ed.deduction_type?.name || "Unknown"}</TableCell>
                          <TableCell>
                            {ed.deduction_type?.is_percentage ? `${ed.amount}%` : `$${ed.amount.toFixed(2)}`}
                          </TableCell>
                          <TableCell>
                            <Switch checked={ed.is_active} onCheckedChange={() => handleToggleEmpDeduction(ed.id, ed.is_active)} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteEmpDeduction(ed.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No deductions assigned yet. Create deduction types first, then assign them to employees.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assign Employee Deduction Dialog */}
          <Dialog open={empDedDialogOpen} onOpenChange={setEmpDedDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Assign Deduction to Employee</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select value={empDedEmployee} onValueChange={setEmpDedEmployee}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Deduction Type</Label>
                  <Select value={empDedType} onValueChange={(v) => {
                    setEmpDedType(v);
                    const dt = deductionTypes.find((d) => d.id === v);
                    if (dt?.default_amount != null) setEmpDedAmount(dt.default_amount.toString());
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select deduction type" /></SelectTrigger>
                    <SelectContent>
                      {deductionTypes.filter((d) => d.is_active).map((dt) => (
                        <SelectItem key={dt.id} value={dt.id}>{dt.name} {dt.is_percentage ? "(%)" : "($)"}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount {deductionTypes.find((d) => d.id === empDedType)?.is_percentage ? "(%)" : "($)"}</Label>
                  <Input type="number" step="0.01" value={empDedAmount} onChange={(e) => setEmpDedAmount(e.target.value)} />
                </div>
                <Button onClick={handleAssignDeduction} className="w-full">Assign Deduction</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

      </Tabs>
    </div>
  );
}

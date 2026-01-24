import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, GripVertical, Clock, DollarSign, Settings } from "lucide-react";
import type { TimeTrackingStatus, PayrollDeductionType } from "@/types/database";

export default function HRSettings() {
  const { isHRManager } = useAuth();
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<TimeTrackingStatus[]>([]);
  const [deductionTypes, setDeductionTypes] = useState<PayrollDeductionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Status form state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<TimeTrackingStatus | null>(null);
  const [statusName, setStatusName] = useState("");
  const [statusColor, setStatusColor] = useState("#3B82F6");
  const [statusIsPaid, setStatusIsPaid] = useState(true);

  // Deduction form state
  const [deductionDialogOpen, setDeductionDialogOpen] = useState(false);
  const [editingDeduction, setEditingDeduction] = useState<PayrollDeductionType | null>(null);
  const [deductionName, setDeductionName] = useState("");
  const [deductionDescription, setDeductionDescription] = useState("");
  const [deductionIsPercentage, setDeductionIsPercentage] = useState(false);
  const [deductionDefaultAmount, setDeductionDefaultAmount] = useState("");

  useEffect(() => {
    if (isHRManager()) {
      fetchData();
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: statusData } = await supabase
        .from("time_tracking_statuses")
        .select("*")
        .order("position");

      if (statusData) {
        setStatuses(statusData as TimeTrackingStatus[]);
      }

      const { data: deductionData } = await supabase
        .from("payroll_deduction_types")
        .select("*")
        .order("name");

      if (deductionData) {
        setDeductionTypes(deductionData as PayrollDeductionType[]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStatus = async () => {
    try {
      if (editingStatus) {
        const { error } = await supabase
          .from("time_tracking_statuses")
          .update({
            name: statusName,
            color: statusColor,
            is_paid: statusIsPaid,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingStatus.id);

        if (error) throw error;
        toast({ title: "Status updated!" });
      } else {
        const { error } = await supabase.from("time_tracking_statuses").insert({
          name: statusName,
          color: statusColor,
          is_paid: statusIsPaid,
          position: statuses.length,
        });

        if (error) throw error;
        toast({ title: "Status created!" });
      }

      setStatusDialogOpen(false);
      resetStatusForm();
      fetchData();
    } catch (error) {
      console.error("Error saving status:", error);
      toast({ title: "Error saving status", variant: "destructive" });
    }
  };

  const handleDeleteStatus = async (id: string) => {
    try {
      const { error } = await supabase
        .from("time_tracking_statuses")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Status removed!" });
      fetchData();
    } catch (error) {
      console.error("Error deleting status:", error);
      toast({ title: "Error deleting status", variant: "destructive" });
    }
  };

  const handleSaveDeduction = async () => {
    try {
      if (editingDeduction) {
        const { error } = await supabase
          .from("payroll_deduction_types")
          .update({
            name: deductionName,
            description: deductionDescription || null,
            is_percentage: deductionIsPercentage,
            default_amount: deductionDefaultAmount ? parseFloat(deductionDefaultAmount) : null,
          })
          .eq("id", editingDeduction.id);

        if (error) throw error;
        toast({ title: "Deduction type updated!" });
      } else {
        const { error } = await supabase.from("payroll_deduction_types").insert({
          name: deductionName,
          description: deductionDescription || null,
          is_percentage: deductionIsPercentage,
          default_amount: deductionDefaultAmount ? parseFloat(deductionDefaultAmount) : null,
        });

        if (error) throw error;
        toast({ title: "Deduction type created!" });
      }

      setDeductionDialogOpen(false);
      resetDeductionForm();
      fetchData();
    } catch (error) {
      console.error("Error saving deduction:", error);
      toast({ title: "Error saving deduction type", variant: "destructive" });
    }
  };

  const handleDeleteDeduction = async (id: string) => {
    try {
      const { error } = await supabase
        .from("payroll_deduction_types")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Deduction type removed!" });
      fetchData();
    } catch (error) {
      console.error("Error deleting deduction:", error);
      toast({ title: "Error deleting deduction type", variant: "destructive" });
    }
  };

  const resetStatusForm = () => {
    setEditingStatus(null);
    setStatusName("");
    setStatusColor("#3B82F6");
    setStatusIsPaid(true);
  };

  const resetDeductionForm = () => {
    setEditingDeduction(null);
    setDeductionName("");
    setDeductionDescription("");
    setDeductionIsPercentage(false);
    setDeductionDefaultAmount("");
  };

  const openEditStatus = (status: TimeTrackingStatus) => {
    setEditingStatus(status);
    setStatusName(status.name);
    setStatusColor(status.color);
    setStatusIsPaid(status.is_paid);
    setStatusDialogOpen(true);
  };

  const openEditDeduction = (deduction: PayrollDeductionType) => {
    setEditingDeduction(deduction);
    setDeductionName(deduction.name);
    setDeductionDescription(deduction.description || "");
    setDeductionIsPercentage(deduction.is_percentage);
    setDeductionDefaultAmount(deduction.default_amount?.toString() || "");
    setDeductionDialogOpen(true);
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
        <h1 className="text-3xl font-bold text-foreground">HR Settings</h1>
        <p className="text-muted-foreground">Configure time tracking statuses and payroll settings</p>
      </div>

      <Tabs defaultValue="statuses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="statuses">
            <Clock className="h-4 w-4 mr-2" />
            Time Tracking Statuses
          </TabsTrigger>
          <TabsTrigger value="deductions">
            <DollarSign className="h-4 w-4 mr-2" />
            Deduction Types
          </TabsTrigger>
        </TabsList>

        <TabsContent value="statuses">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Time Tracking Statuses</CardTitle>
                <CardDescription>
                  Define the statuses employees can choose when clocking in
                </CardDescription>
              </div>
              <Dialog open={statusDialogOpen} onOpenChange={(open) => {
                setStatusDialogOpen(open);
                if (!open) resetStatusForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Status
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingStatus ? "Edit Status" : "Add New Status"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={statusName}
                        onChange={(e) => setStatusName(e.target.value)}
                        placeholder="e.g., Working, On Break"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={statusColor}
                          onChange={(e) => setStatusColor(e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={statusColor}
                          onChange={(e) => setStatusColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Paid Time</Label>
                        <p className="text-sm text-muted-foreground">
                          Count this status as paid work time
                        </p>
                      </div>
                      <Switch checked={statusIsPaid} onCheckedChange={setStatusIsPaid} />
                    </div>
                    <Button onClick={handleSaveStatus} className="w-full">
                      {editingStatus ? "Update Status" : "Create Status"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Paid Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statuses
                    .filter((s) => s.is_active)
                    .map((status) => (
                      <TableRow key={status.id}>
                        <TableCell>
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        </TableCell>
                        <TableCell className="font-medium">{status.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded"
                              style={{ backgroundColor: status.color }}
                            />
                            <span className="text-sm text-muted-foreground">{status.color}</span>
                          </div>
                        </TableCell>
                        <TableCell>{status.is_paid ? "Yes" : "No"}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditStatus(status)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStatus(status.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deductions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payroll Deduction Types</CardTitle>
                <CardDescription>
                  Define deduction categories for payroll processing
                </CardDescription>
              </div>
              <Dialog open={deductionDialogOpen} onOpenChange={(open) => {
                setDeductionDialogOpen(open);
                if (!open) resetDeductionForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Deduction Type
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingDeduction ? "Edit Deduction Type" : "Add New Deduction Type"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={deductionName}
                        onChange={(e) => setDeductionName(e.target.value)}
                        placeholder="e.g., Federal Tax, Health Insurance"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description (optional)</Label>
                      <Input
                        value={deductionDescription}
                        onChange={(e) => setDeductionDescription(e.target.value)}
                        placeholder="Brief description"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Percentage-based</Label>
                        <p className="text-sm text-muted-foreground">
                          Calculate as percentage of gross pay
                        </p>
                      </div>
                      <Switch
                        checked={deductionIsPercentage}
                        onCheckedChange={setDeductionIsPercentage}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Default Amount {deductionIsPercentage ? "(%)" : "($)"}
                      </Label>
                      <Input
                        type="number"
                        step={deductionIsPercentage ? "0.1" : "0.01"}
                        value={deductionDefaultAmount}
                        onChange={(e) => setDeductionDefaultAmount(e.target.value)}
                        placeholder={deductionIsPercentage ? "e.g., 6.2" : "e.g., 150.00"}
                      />
                    </div>
                    <Button onClick={handleSaveDeduction} className="w-full">
                      {editingDeduction ? "Update Deduction Type" : "Create Deduction Type"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductionTypes
                    .filter((d) => d.is_active)
                    .map((deduction) => (
                      <TableRow key={deduction.id}>
                        <TableCell className="font-medium">{deduction.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {deduction.description || "-"}
                        </TableCell>
                        <TableCell>
                          {deduction.is_percentage ? "Percentage" : "Fixed Amount"}
                        </TableCell>
                        <TableCell>
                          {deduction.default_amount
                            ? deduction.is_percentage
                              ? `${deduction.default_amount}%`
                              : `$${deduction.default_amount.toFixed(2)}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDeduction(deduction)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDeduction(deduction.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  {deductionTypes.filter((d) => d.is_active).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No deduction types defined. Add one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

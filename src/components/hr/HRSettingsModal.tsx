import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Settings, Plus, Edit2, Trash2, Clock, DollarSign } from "lucide-react";
import type { TimeTrackingStatus, PayrollDeductionType } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HRSettingsModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<TimeTrackingStatus[]>([]);
  const [deductionTypes, setDeductionTypes] = useState<PayrollDeductionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Status form
  const [editingStatus, setEditingStatus] = useState<TimeTrackingStatus | null>(null);
  const [statusFormOpen, setStatusFormOpen] = useState(false);
  const [statusName, setStatusName] = useState("");
  const [statusColor, setStatusColor] = useState("#3B82F6");
  const [statusIsPaid, setStatusIsPaid] = useState(true);

  // Deduction form
  const [editingDeduction, setEditingDeduction] = useState<PayrollDeductionType | null>(null);
  const [deductionFormOpen, setDeductionFormOpen] = useState(false);
  const [deductionName, setDeductionName] = useState("");
  const [deductionDescription, setDeductionDescription] = useState("");
  const [deductionIsPercentage, setDeductionIsPercentage] = useState(false);
  const [deductionDefaultAmount, setDeductionDefaultAmount] = useState("");

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: sd } = await supabase.from("time_tracking_statuses").select("*").order("position");
      if (sd) setStatuses(sd as TimeTrackingStatus[]);
      const { data: dd } = await supabase.from("payroll_deduction_types").select("*").order("name");
      if (dd) setDeductionTypes(dd as PayrollDeductionType[]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStatus = async () => {
    try {
      if (editingStatus) {
        await supabase.from("time_tracking_statuses").update({ name: statusName, color: statusColor, is_paid: statusIsPaid }).eq("id", editingStatus.id);
      } else {
        await supabase.from("time_tracking_statuses").insert({ name: statusName, color: statusColor, is_paid: statusIsPaid, position: statuses.length });
      }
      toast({ title: editingStatus ? "Status updated!" : "Status created!" });
      setStatusFormOpen(false);
      resetStatusForm();
      fetchData();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDeleteStatus = async (id: string) => {
    await supabase.from("time_tracking_statuses").update({ is_active: false }).eq("id", id);
    toast({ title: "Status removed!" });
    fetchData();
  };

  const handleSaveDeduction = async () => {
    try {
      const data = {
        name: deductionName, description: deductionDescription || null,
        is_percentage: deductionIsPercentage,
        default_amount: deductionDefaultAmount ? parseFloat(deductionDefaultAmount) : null,
      };
      if (editingDeduction) {
        await supabase.from("payroll_deduction_types").update(data).eq("id", editingDeduction.id);
      } else {
        await supabase.from("payroll_deduction_types").insert(data);
      }
      toast({ title: editingDeduction ? "Updated!" : "Created!" });
      setDeductionFormOpen(false);
      resetDeductionForm();
      fetchData();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDeleteDeduction = async (id: string) => {
    await supabase.from("payroll_deduction_types").update({ is_active: false }).eq("id", id);
    toast({ title: "Removed!" });
    fetchData();
  };

  const resetStatusForm = () => { setEditingStatus(null); setStatusName(""); setStatusColor("#3B82F6"); setStatusIsPaid(true); };
  const resetDeductionForm = () => { setEditingDeduction(null); setDeductionName(""); setDeductionDescription(""); setDeductionIsPercentage(false); setDeductionDefaultAmount(""); };

  const openEditStatus = (s: TimeTrackingStatus) => {
    setEditingStatus(s); setStatusName(s.name); setStatusColor(s.color); setStatusIsPaid(s.is_paid); setStatusFormOpen(true);
  };

  const openEditDeduction = (d: PayrollDeductionType) => {
    setEditingDeduction(d); setDeductionName(d.name); setDeductionDescription(d.description || "");
    setDeductionIsPercentage(d.is_percentage); setDeductionDefaultAmount(d.default_amount?.toString() || ""); setDeductionFormOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            HR Settings
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <Tabs defaultValue="statuses" className="space-y-4">
            <TabsList>
              <TabsTrigger value="statuses"><Clock className="h-4 w-4 mr-1" /> Statuses</TabsTrigger>
              <TabsTrigger value="deductions"><DollarSign className="h-4 w-4 mr-1" /> Deductions</TabsTrigger>
            </TabsList>

            <TabsContent value="statuses" className="space-y-4">
              {!statusFormOpen ? (
                <Button onClick={() => { resetStatusForm(); setStatusFormOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Add Status</Button>
              ) : (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div><Label>Name</Label><Input value={statusName} onChange={(e) => setStatusName(e.target.value)} placeholder="e.g., Working" /></div>
                    <div className="flex gap-2 items-end">
                      <div><Label>Color</Label><Input type="color" value={statusColor} onChange={(e) => setStatusColor(e.target.value)} className="w-16 h-10 p-1" /></div>
                      <Input value={statusColor} onChange={(e) => setStatusColor(e.target.value)} className="flex-1" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Paid Time</Label>
                      <Switch checked={statusIsPaid} onCheckedChange={setStatusIsPaid} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveStatus} className="flex-1">{editingStatus ? "Update" : "Create"}</Button>
                      <Button variant="outline" onClick={() => setStatusFormOpen(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statuses.filter((s) => s.is_active).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell><div className="w-6 h-6 rounded" style={{ backgroundColor: s.color }} /></TableCell>
                      <TableCell>{s.is_paid ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditStatus(s)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteStatus(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="deductions" className="space-y-4">
              {!deductionFormOpen ? (
                <Button onClick={() => { resetDeductionForm(); setDeductionFormOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Add Deduction</Button>
              ) : (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div><Label>Name</Label><Input value={deductionName} onChange={(e) => setDeductionName(e.target.value)} placeholder="e.g., Federal Tax" /></div>
                    <div><Label>Description</Label><Input value={deductionDescription} onChange={(e) => setDeductionDescription(e.target.value)} /></div>
                    <div className="flex items-center justify-between">
                      <Label>Percentage-based</Label>
                      <Switch checked={deductionIsPercentage} onCheckedChange={setDeductionIsPercentage} />
                    </div>
                    <div><Label>Default {deductionIsPercentage ? "%" : "$"}</Label><Input type="number" value={deductionDefaultAmount} onChange={(e) => setDeductionDefaultAmount(e.target.value)} /></div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveDeduction} className="flex-1">{editingDeduction ? "Update" : "Create"}</Button>
                      <Button variant="outline" onClick={() => setDeductionFormOpen(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductionTypes.filter((d) => d.is_active).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.is_percentage ? "%" : "$"}</TableCell>
                      <TableCell>{d.default_amount ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEditDeduction(d)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteDeduction(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { UserX, Plus, Trash2, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import type { Profile, OffboardingChecklist, OffboardingItem } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataChanged?: () => void;
}

const DEFAULT_ITEMS = [
  "Return company laptop & equipment",
  "Revoke system access & credentials",
  "Transfer knowledge & documentation",
  "Final timesheet & pay review",
  "Return ID badge & keys",
  "Exit interview scheduled",
  "Benefits & COBRA information provided",
  "Remove from company directory",
];

export function OffboardingModal({ open, onOpenChange, onDataChanged }: Props) {
  const { profile: currentProfile } = useAuth();
  const { toast } = useToast();
  const [checklists, setChecklists] = useState<(OffboardingChecklist & { items?: OffboardingItem[] })[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New checklist form
  const [formOpen, setFormOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [notes, setNotes] = useState("");
  const [customItems, setCustomItems] = useState<string[]>([...DEFAULT_ITEMS]);
  const [newItemText, setNewItemText] = useState("");

  // Active checklist view
  const [activeChecklist, setActiveChecklist] = useState<string | null>(null);

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: checklistData } = await supabase
        .from("offboarding_checklists")
        .select("*")
        .order("created_at", { ascending: false });

      if (checklistData) {
        const empIds = [...new Set(checklistData.map((c) => c.employee_id))];
        const { data: empData } = empIds.length > 0
          ? await supabase.from("profiles").select("*").in("id", empIds)
          : { data: [] };

        const checklistIds = checklistData.map((c) => c.id);
        const { data: itemsData } = checklistIds.length > 0
          ? await supabase.from("offboarding_items").select("*").in("checklist_id", checklistIds).order("created_at")
          : { data: [] };

        setChecklists(checklistData.map((c) => ({
          ...(c as unknown as OffboardingChecklist),
          employee: (empData as unknown as Profile[])?.find((e) => e.id === c.employee_id),
          items: (itemsData as unknown as OffboardingItem[])?.filter((i) => i.checklist_id === c.id) || [],
        })));
      }

      const { data: activeEmps } = await supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("first_name");
      if (activeEmps) setEmployees(activeEmps as unknown as Profile[]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateChecklist = async () => {
    if (!selectedEmployeeId) return;
    try {
      const { data: checklist, error } = await supabase
        .from("offboarding_checklists")
        .insert({ employee_id: selectedEmployeeId, notes: notes || null, status: "pending" })
        .select()
        .single();

      if (error) throw error;

      if (checklist && customItems.length > 0) {
        await supabase.from("offboarding_items").insert(
          customItems.filter((t) => t.trim()).map((title) => ({
            checklist_id: checklist.id,
            title,
          }))
        );
      }

      toast({ title: "Offboarding checklist created!" });
      setFormOpen(false);
      resetForm();
      fetchData();
      onDataChanged?.();
    } catch (error) {
      toast({ title: "Error creating checklist", variant: "destructive" });
    }
  };

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    try {
      await supabase.from("offboarding_items").update({
        is_completed: completed,
        completed_by: completed ? currentProfile?.id : null,
        completed_at: completed ? new Date().toISOString() : null,
      }).eq("id", itemId);
      fetchData();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleCompleteChecklist = async (checklistId: string) => {
    try {
      await supabase.from("offboarding_checklists")
        .update({ status: "completed" })
        .eq("id", checklistId);

      const checklist = checklists.find((c) => c.id === checklistId);
      if (checklist) {
        await supabase.from("profiles")
          .update({ is_active: false, offboarded_at: new Date().toISOString().split("T")[0] })
          .eq("id", checklist.employee_id);
      }

      toast({ title: "Offboarding completed! Employee marked as inactive." });
      setActiveChecklist(null);
      fetchData();
      onDataChanged?.();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setSelectedEmployeeId("");
    setNotes("");
    setCustomItems([...DEFAULT_ITEMS]);
    setNewItemText("");
  };

  const addCustomItem = () => {
    if (newItemText.trim()) {
      setCustomItems([...customItems, newItemText.trim()]);
      setNewItemText("");
    }
  };

  const removeCustomItem = (index: number) => {
    setCustomItems(customItems.filter((_, i) => i !== index));
  };

  const activeChecklistData = checklists.find((c) => c.id === activeChecklist);
  const completedCount = activeChecklistData?.items?.filter((i) => i.is_completed).length || 0;
  const totalCount = activeChecklistData?.items?.length || 0;

  const getStatusBadge = (status: string) => {
    if (status === "completed") return <Badge>Completed</Badge>;
    if (status === "in_progress") return <Badge variant="secondary">In Progress</Badge>;
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Offboarding Management
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : activeChecklist && activeChecklistData ? (
          /* Active Checklist Detail View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={activeChecklistData.employee?.avatar_url || undefined} />
                  <AvatarFallback>{activeChecklistData.employee?.first_name?.[0]}{activeChecklistData.employee?.last_name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{activeChecklistData.employee?.first_name} {activeChecklistData.employee?.last_name}</p>
                  <p className="text-sm text-muted-foreground">{activeChecklistData.employee?.job_title || "Employee"}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setActiveChecklist(null)}>Back to List</Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{completedCount}/{totalCount} tasks completed</span>
              {getStatusBadge(activeChecklistData.status)}
            </div>

            {activeChecklistData.notes && (
              <Card><CardContent className="p-3 text-sm">{activeChecklistData.notes}</CardContent></Card>
            )}

            <div className="space-y-2">
              {activeChecklistData.items?.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Checkbox
                    checked={item.is_completed}
                    onCheckedChange={(checked) => handleToggleItem(item.id, !!checked)}
                    disabled={activeChecklistData.status === "completed"}
                  />
                  <span className={item.is_completed ? "line-through text-muted-foreground" : ""}>
                    {item.title}
                  </span>
                  {item.completed_at && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {format(new Date(item.completed_at), "MMM d")}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {activeChecklistData.status !== "completed" && completedCount === totalCount && totalCount > 0 && (
              <Button className="w-full" onClick={() => handleCompleteChecklist(activeChecklistData.id)}>
                <CheckCircle className="h-4 w-4 mr-2" /> Complete Offboarding & Deactivate Employee
              </Button>
            )}
          </div>
        ) : (
          /* Checklist List View */
          <div className="space-y-4">
            {!formOpen ? (
              <Button onClick={() => { resetForm(); setFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Start Offboarding
              </Button>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">New Offboarding</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Employee</Label>
                    <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                      <SelectTrigger><SelectValue placeholder="Select employee..." /></SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name} — {emp.job_title || "Employee"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for departure, etc." rows={2} />
                  </div>
                  <div>
                    <Label>Checklist Items</Label>
                    <div className="space-y-1 mt-1 max-h-40 overflow-y-auto">
                      {customItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="flex-1 truncate">{item}</span>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeCustomItem(i)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input value={newItemText} onChange={(e) => setNewItemText(e.target.value)} placeholder="Add custom item..."
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomItem())} />
                      <Button variant="outline" size="sm" onClick={addCustomItem}>Add</Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateChecklist} className="flex-1" disabled={!selectedEmployeeId}>Create</Button>
                    <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {checklists.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checklists.map((c) => {
                    const done = c.items?.filter((i) => i.is_completed).length || 0;
                    const total = c.items?.length || 0;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={c.employee?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">{c.employee?.first_name?.[0]}{c.employee?.last_name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{c.employee?.first_name} {c.employee?.last_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{done}/{total}</TableCell>
                        <TableCell>{getStatusBadge(c.status)}</TableCell>
                        <TableCell className="text-sm">{format(new Date(c.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setActiveChecklist(c.id)}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No offboarding checklists yet</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

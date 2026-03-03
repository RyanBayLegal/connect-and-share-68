import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import type { Profile, TimeOffRequest } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataChanged?: () => void;
}

export function LeaveManagementModal({ open, onOpenChange, onDataChanged }: Props) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<(TimeOffRequest & { employee?: Profile })[]>([]);
  const [filter, setFilter] = useState("pending");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from("time_off_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        const employeeIds = [...new Set(data.map((r) => r.employee_id))];
        const { data: empData } = employeeIds.length > 0
          ? await supabase.from("profiles").select("*").in("id", employeeIds)
          : { data: [] };

        setRequests(
          data.map((r) => ({
            ...r,
            employee: empData?.find((e) => e.id === r.employee_id) as unknown as Profile,
          })) as (TimeOffRequest & { employee?: Profile })[]
        );
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (id: string, action: "approved" | "denied") => {
    const { error } = await supabase
      .from("time_off_requests")
      .update({ status: action, reviewed_at: new Date().toISOString() })
      .eq("id", id);

    if (error) { toast({ title: "Error", variant: "destructive" }); return; }
    toast({ title: `Request ${action}!` });
    fetchData();
    onDataChanged?.();
  };

  const getRequestTypeName = (type: string) => {
    const types: Record<string, string> = { pto: "PTO", sick: "Sick Leave", personal: "Personal Day", bereavement: "Bereavement", unpaid: "Unpaid Leave" };
    return types[type] || type;
  };

  const filtered = requests.filter((r) => filter === "all" || r.status === filter);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Leave Management
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Badge variant={filter === "pending" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilter("pending")}>
              Pending ({requests.filter((r) => r.status === "pending").length})
            </Badge>
            <Badge variant={filter === "approved" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilter("approved")}>
              Approved ({requests.filter((r) => r.status === "approved").length})
            </Badge>
            <Badge variant={filter === "denied" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilter("denied")}>
              Denied ({requests.filter((r) => r.status === "denied").length})
            </Badge>
            <Badge variant={filter === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilter("all")}>
              All
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length > 0 ? (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {filtered.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={req.employee?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{req.employee?.first_name?.[0]}{req.employee?.last_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{req.employee?.first_name} {req.employee?.last_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {getRequestTypeName(req.request_type)} · {format(new Date(req.start_date), "MMM d")}
                      {req.start_date !== req.end_date && ` - ${format(new Date(req.end_date), "MMM d")}`}
                    </p>
                    {req.reason && <p className="text-xs text-muted-foreground mt-0.5">{req.reason}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium mr-2">{req.hours_requested}h</span>
                  {req.status === "pending" ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleAction(req.id, "denied")}>
                        <XCircle className="h-4 w-4 mr-1" /> Deny
                      </Button>
                      <Button size="sm" onClick={() => handleAction(req.id, "approved")}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                    </>
                  ) : (
                    <Badge variant={req.status === "approved" ? "default" : req.status === "denied" ? "destructive" : "secondary"}>
                      {req.status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No {filter === "all" ? "" : filter} leave requests found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

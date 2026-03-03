import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Plus, TreePalm } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface TimeOffRequest {
  id: string;
  request_type: string;
  start_date: string;
  end_date: string;
  hours_requested: number;
  status: string;
  created_at: string;
}

export function LeaveRequestWidget() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [requestType, setRequestType] = useState("pto");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hoursRequested, setHoursRequested] = useState("8");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (profile?.id) fetchRequests();
  }, [profile?.id]);

  const fetchRequests = async () => {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from("time_off_requests")
        .select("*")
        .eq("employee_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(3);
      if (data) setRequests(data as TimeOffRequest[]);
    } catch (err) {
      console.error("Error fetching leave requests:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
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
      toast({ title: "Leave Request Submitted", description: "Your request has been sent for approval." });
      setDialogOpen(false);
      resetForm();
      fetchRequests();
    } catch (err) {
      console.error("Error submitting leave:", err);
      toast({ title: "Error", description: "Failed to submit leave request.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRequestType("pto");
    setStartDate("");
    setEndDate("");
    setHoursRequested("8");
    setReason("");
  };

  const getRequestTypeName = (type: string) => {
    const types: Record<string, string> = { pto: "PTO", sick: "Sick Leave", personal: "Personal Day", bereavement: "Bereavement", unpaid: "Unpaid Leave" };
    return types[type] || type;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const map: Record<string, "default" | "secondary" | "destructive" | "outline"> = { pending: "secondary", approved: "default", denied: "destructive", cancelled: "outline" };
    return map[status] || "secondary";
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TreePalm className="h-5 w-5 text-primary" />
            Leave & Time Off
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Time Off</DialogTitle>
                <DialogDescription>Submit a leave request for approval.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Leave Type</Label>
                  <Select value={requestType} onValueChange={setRequestType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <div>
                    <Label>Start Date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Hours Requested</Label>
                  <Input type="number" value={hoursRequested} onChange={(e) => setHoursRequested(e.target.value)} min="1" max="120" />
                </div>
                <div>
                  <Label>Reason (optional)</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brief reason for leave..." rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || !startDate || !endDate}>
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {requests.length > 0 ? (
          <div className="space-y-2">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                <div>
                  <p className="font-medium">{getRequestTypeName(req.request_type)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(req.start_date), "MMM d")} - {format(new Date(req.end_date), "MMM d")}
                  </p>
                </div>
                <Badge variant={getStatusVariant(req.status)}>{req.status}</Badge>
              </div>
            ))}
            <Button asChild variant="ghost" size="sm" className="w-full mt-1">
              <Link to="/my-hr">View all requests →</Link>
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">
            No recent leave requests. Click "Request Leave" to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

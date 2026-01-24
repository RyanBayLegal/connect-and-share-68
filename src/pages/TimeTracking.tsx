import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Clock, Play, Square, Coffee, Calendar, Plus, Edit2, Send, Loader2 } from "lucide-react";
import { format, differenceInMinutes, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import type { TimeEntry, TimeTrackingStatus, Timesheet } from "@/types/database";

export default function TimeTracking() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<TimeTrackingStatus[]>([]);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clockNote, setClockNote] = useState("");
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualDate, setManualDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [manualClockIn, setManualClockIn] = useState("09:00");
  const [manualClockOut, setManualClockOut] = useState("17:00");
  const [manualNote, setManualNote] = useState("");
  const [manualStatus, setManualStatus] = useState("");
  const [isSubmittingTimesheet, setIsSubmittingTimesheet] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    setIsLoading(true);

    try {
      // Fetch statuses
      const { data: statusData } = await supabase
        .from("time_tracking_statuses")
        .select("*")
        .eq("is_active", true)
        .order("position");

      if (statusData) {
        setStatuses(statusData as TimeTrackingStatus[]);
        if (statusData.length > 0 && !selectedStatus) {
          setSelectedStatus(statusData[0].id);
        }
      }

      // Fetch current open entry
      const { data: openEntry } = await supabase
        .from("time_entries")
        .select("*, status:time_tracking_statuses(*)")
        .eq("employee_id", profile.id)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1)
        .single();

      if (openEntry) {
        setCurrentEntry(openEntry as unknown as TimeEntry);
      }

      // Fetch today's entries
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const { data: todayEntries } = await supabase
        .from("time_entries")
        .select("*, status:time_tracking_statuses(*)")
        .eq("employee_id", profile.id)
        .gte("clock_in", startOfDay)
        .lte("clock_in", endOfDay)
        .order("clock_in", { ascending: false });

      if (todayEntries) {
        setEntries(todayEntries as unknown as TimeEntry[]);
      }

      // Fetch timesheets
      const { data: timesheetData } = await supabase
        .from("timesheets")
        .select("*")
        .eq("employee_id", profile.id)
        .order("period_start", { ascending: false })
        .limit(10);

      if (timesheetData) {
        setTimesheets(timesheetData as Timesheet[]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          employee_id: profile.id,
          clock_in: new Date().toISOString(),
          status_id: selectedStatus || null,
          notes: clockNote || null,
          is_manual_entry: false,
        })
        .select("*, status:time_tracking_statuses(*)")
        .single();

      if (error) throw error;

      setCurrentEntry(data as unknown as TimeEntry);
      setClockNote("");
      toast({ title: "Clocked in successfully!" });
      fetchData();
    } catch (error) {
      console.error("Error clocking in:", error);
      toast({ title: "Error clocking in", variant: "destructive" });
    }
  };

  const handleClockOut = async () => {
    if (!currentEntry) return;

    try {
      const { error } = await supabase
        .from("time_entries")
        .update({
          clock_out: new Date().toISOString(),
        })
        .eq("id", currentEntry.id);

      if (error) throw error;

      setCurrentEntry(null);
      toast({ title: "Clocked out successfully!" });
      fetchData();
    } catch (error) {
      console.error("Error clocking out:", error);
      toast({ title: "Error clocking out", variant: "destructive" });
    }
  };

  const handleChangeStatus = async (newStatusId: string) => {
    if (!currentEntry) return;

    try {
      const { error } = await supabase
        .from("time_entries")
        .update({ status_id: newStatusId })
        .eq("id", currentEntry.id);

      if (error) throw error;

      setCurrentEntry({ ...currentEntry, status_id: newStatusId });
      toast({ title: "Status updated!" });
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  const handleManualEntry = async () => {
    if (!profile) return;

    try {
      const clockIn = new Date(`${manualDate}T${manualClockIn}`).toISOString();
      const clockOut = new Date(`${manualDate}T${manualClockOut}`).toISOString();

      const { error } = await supabase.from("time_entries").insert({
        employee_id: profile.id,
        clock_in: clockIn,
        clock_out: clockOut,
        status_id: manualStatus || null,
        notes: manualNote || null,
        is_manual_entry: true,
      });

      if (error) throw error;

      setManualEntryOpen(false);
      setManualNote("");
      toast({ title: "Manual entry added!" });
      fetchData();
    } catch (error) {
      console.error("Error adding manual entry:", error);
      toast({ title: "Error adding entry", variant: "destructive" });
    }
  };

  const getStatusById = (id: string | null) => statuses.find((s) => s.id === id);

  const handleSubmitTimesheet = async (timesheet: Timesheet) => {
    if (!profile) return;
    
    setIsSubmittingTimesheet(timesheet.id);
    try {
      // Update timesheet status to submitted
      const { error } = await supabase
        .from("timesheets")
        .update({ 
          status: "submitted", 
          submitted_at: new Date().toISOString() 
        })
        .eq("id", timesheet.id);

      if (error) throw error;

      // Send notification to managers
      const totalHours = 
        (timesheet.total_regular_hours || 0) + 
        (timesheet.total_overtime_hours || 0) + 
        (timesheet.total_pto_hours || 0);

      await supabase.functions.invoke("send-timesheet-notification", {
        body: {
          timesheetId: timesheet.id,
          employeeId: profile.id,
          periodStart: format(new Date(timesheet.period_start), "MMM d"),
          periodEnd: format(new Date(timesheet.period_end), "MMM d, yyyy"),
          totalHours,
        },
      });

      toast({ title: "Timesheet submitted for approval!" });
      fetchData();
    } catch (error) {
      console.error("Error submitting timesheet:", error);
      toast({ title: "Error submitting timesheet", variant: "destructive" });
    } finally {
      setIsSubmittingTimesheet(null);
    }
  };

  const calculateDuration = (clockIn: string, clockOut: string | null) => {
    const start = new Date(clockIn);
    const end = clockOut ? new Date(clockOut) : new Date();
    const mins = differenceInMinutes(end, start);
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours}h ${minutes}m`;
  };

  const getTodayTotal = () => {
    let totalMins = 0;
    entries.forEach((entry) => {
      const start = new Date(entry.clock_in);
      const end = entry.clock_out ? new Date(entry.clock_out) : new Date();
      totalMins += differenceInMinutes(end, start);
    });
    const hours = Math.floor(totalMins / 60);
    const minutes = totalMins % 60;
    return `${hours}h ${minutes}m`;
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
        <h1 className="text-3xl font-bold text-foreground">Time Tracking</h1>
        <p className="text-muted-foreground">Clock in/out and manage your time</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Clock In/Out Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Clock In/Out
            </CardTitle>
            <CardDescription>
              {currentEntry ? "You are currently clocked in" : "Clock in to start tracking time"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentEntry ? (
              <>
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Clocked in at</p>
                    <p className="text-lg font-semibold">
                      {format(new Date(currentEntry.clock_in), "h:mm a")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="text-lg font-semibold">
                      {calculateDuration(currentEntry.clock_in, null)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Current Status</Label>
                  <Select
                    value={currentEntry.status_id || ""}
                    onValueChange={handleChangeStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: status.color }}
                            />
                            {status.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleClockOut}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Clock Out
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: status.color }}
                            />
                            {status.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Note (optional)</Label>
                  <Textarea
                    value={clockNote}
                    onChange={(e) => setClockNote(e.target.value)}
                    placeholder="Add a note..."
                    rows={2}
                  />
                </div>

                <Button onClick={handleClockIn} className="w-full" size="lg">
                  <Play className="h-4 w-4 mr-2" />
                  Clock In
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Today's Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Today's Time</CardTitle>
              <CardDescription>{format(new Date(), "EEEE, MMMM d, yyyy")}</CardDescription>
            </div>
            <Dialog open={manualEntryOpen} onOpenChange={setManualEntryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Manual Entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Manual Time Entry</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Clock In</Label>
                      <Input
                        type="time"
                        value={manualClockIn}
                        onChange={(e) => setManualClockIn(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Clock Out</Label>
                      <Input
                        type="time"
                        value={manualClockOut}
                        onChange={(e) => setManualClockOut(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={manualStatus} onValueChange={setManualStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((status) => (
                          <SelectItem key={status.id} value={status.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: status.color }}
                              />
                              {status.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Note</Label>
                    <Textarea
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      placeholder="Add a note..."
                    />
                  </div>
                  <Button onClick={handleManualEntry} className="w-full">
                    Add Entry
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-4">{getTodayTotal()}</div>
            <div className="space-y-2">
              {entries.map((entry) => {
                const status = getStatusById(entry.status_id);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {status && (
                        <Badge
                          style={{ backgroundColor: status.color, color: "#fff" }}
                        >
                          {status.name}
                        </Badge>
                      )}
                      <span className="text-sm">
                        {format(new Date(entry.clock_in), "h:mm a")}
                        {entry.clock_out && ` - ${format(new Date(entry.clock_out), "h:mm a")}`}
                      </span>
                    </div>
                    <span className="font-medium">
                      {calculateDuration(entry.clock_in, entry.clock_out)}
                    </span>
                  </div>
                );
              })}
              {entries.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No time entries today
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timesheets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timesheets
          </CardTitle>
          <CardDescription>View and submit your timesheets</CardDescription>
        </CardHeader>
        <CardContent>
          {timesheets.length > 0 ? (
            <div className="space-y-3">
              {timesheets.map((timesheet) => (
                <div
                  key={timesheet.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {format(new Date(timesheet.period_start), "MMM d")} -{" "}
                      {format(new Date(timesheet.period_end), "MMM d, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Regular: {timesheet.total_regular_hours}h | OT:{" "}
                      {timesheet.total_overtime_hours}h | PTO: {timesheet.total_pto_hours}h
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {timesheet.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => handleSubmitTimesheet(timesheet)}
                        disabled={isSubmittingTimesheet === timesheet.id}
                      >
                        {isSubmittingTimesheet === timesheet.id ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4 mr-1" />
                        )}
                        Submit
                      </Button>
                    )}
                    <Badge
                      variant={
                        timesheet.status === "approved"
                          ? "default"
                          : timesheet.status === "submitted"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {timesheet.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No timesheets yet. Time entries will be compiled into weekly timesheets.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

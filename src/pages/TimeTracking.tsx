import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import { Clock, Play, Square, Calendar, Plus, Send, Loader2, ChevronLeft, ChevronRight, Lock, Pencil } from "lucide-react";
import {
  format,
  differenceInMinutes,
  differenceInSeconds,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  addDays,
  subDays,
  isSameDay,
  isWithinInterval,
} from "date-fns";
import type { TimeEntry, TimeTrackingStatus, Timesheet } from "@/types/database";

export default function TimeTracking() {
  const { profile, isAdmin, isHRManager } = useAuth();
  const { toast } = useToast();
  const [statuses, setStatuses] = useState<TimeTrackingStatus[]>([]);
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [allEntries, setAllEntries] = useState<TimeEntry[]>([]);
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

  // Timesheet view state
  const [timesheetView, setTimesheetView] = useState<"daily" | "weekly" | "monthly">("daily");
  const [viewDate, setViewDate] = useState(new Date());

  const canEdit = isAdmin() || isHRManager();

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    setIsLoading(true);

    try {
      const [{ data: statusData }, { data: openEntry }, { data: entriesData }, { data: timesheetData }] =
        await Promise.all([
          supabase
            .from("time_tracking_statuses")
            .select("*")
            .eq("is_active", true)
            .order("position"),
          supabase
            .from("time_entries")
            .select("*, status:time_tracking_statuses(*)")
            .eq("employee_id", profile.id)
            .is("clock_out", null)
            .order("clock_in", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("time_entries")
            .select("*, status:time_tracking_statuses(*)")
            .eq("employee_id", profile.id)
            .order("clock_in", { ascending: false })
            .limit(500),
          supabase
            .from("timesheets")
            .select("*")
            .eq("employee_id", profile.id)
            .order("period_start", { ascending: false })
            .limit(20),
        ]);

      if (statusData) {
        setStatuses(statusData as TimeTrackingStatus[]);
        if (statusData.length > 0 && !selectedStatus) {
          setSelectedStatus(statusData[0].id);
        }
      }
      setCurrentEntry(openEntry ? (openEntry as unknown as TimeEntry) : null);
      setAllEntries((entriesData as unknown as TimeEntry[]) || []);
      setTimesheets((timesheetData as Timesheet[]) || []);
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
        .update({ clock_out: new Date().toISOString() })
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
    if (!currentEntry || !profile) return;
    try {
      const now = new Date().toISOString();
      await supabase.from("time_entries").update({ clock_out: now }).eq("id", currentEntry.id);
      const { error } = await supabase.from("time_entries").insert({
        employee_id: profile.id,
        clock_in: now,
        status_id: newStatusId,
        is_manual_entry: false,
      });
      if (error) throw error;
      toast({ title: "Status updated!" });
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Error updating status", variant: "destructive" });
    }
  };

  const handleManualEntry = async () => {
    if (!profile || !canEdit) return;
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

  const handleSubmitTimesheet = async (timesheet: Timesheet) => {
    if (!profile) return;
    setIsSubmittingTimesheet(timesheet.id);
    try {
      const { error } = await supabase
        .from("timesheets")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", timesheet.id);
      if (error) throw error;

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

  const getStatusById = (id: string | null) => statuses.find((s) => s.id === id);

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const calculateEntrySeconds = (entry: TimeEntry) => {
    const start = new Date(entry.clock_in);
    const end = entry.clock_out ? new Date(entry.clock_out) : new Date();
    return differenceInSeconds(end, start);
  };

  // Compute date range for current view
  const { rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
    if (timesheetView === "daily") {
      return {
        rangeStart: viewDate,
        rangeEnd: viewDate,
        rangeLabel: format(viewDate, "EEEE, MMMM d, yyyy"),
      };
    } else if (timesheetView === "weekly") {
      const ws = startOfWeek(viewDate, { weekStartsOn: 1 });
      const we = endOfWeek(viewDate, { weekStartsOn: 1 });
      return {
        rangeStart: ws,
        rangeEnd: we,
        rangeLabel: `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`,
      };
    } else {
      const ms = startOfMonth(viewDate);
      const me = endOfMonth(viewDate);
      return {
        rangeStart: ms,
        rangeEnd: me,
        rangeLabel: format(viewDate, "MMMM yyyy"),
      };
    }
  }, [timesheetView, viewDate]);

  const filteredEntries = useMemo(() => {
    return allEntries.filter((entry) => {
      const entryDate = new Date(entry.clock_in);
      return isWithinInterval(entryDate, { start: rangeStart, end: endOfDay(rangeEnd) });
    });
  }, [allEntries, rangeStart, rangeEnd]);

  const totalSeconds = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + calculateEntrySeconds(e), 0);
  }, [filteredEntries]);

  // Group entries by day for weekly/monthly views
  const entriesByDay = useMemo(() => {
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    return days.map((day) => ({
      date: day,
      entries: filteredEntries.filter((e) => isSameDay(new Date(e.clock_in), day)),
    })).filter(d => d.entries.length > 0);
  }, [filteredEntries, rangeStart, rangeEnd]);

  const navigatePrev = () => {
    if (timesheetView === "daily") setViewDate(subDays(viewDate, 1));
    else if (timesheetView === "weekly") setViewDate(subWeeks(viewDate, 1));
    else setViewDate(subMonths(viewDate, 1));
  };

  const navigateNext = () => {
    if (timesheetView === "daily") setViewDate(addDays(viewDate, 1));
    else if (timesheetView === "weekly") setViewDate(addWeeks(viewDate, 1));
    else setViewDate(addMonths(viewDate, 1));
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
        <p className="text-muted-foreground">Clock in/out and view your timesheets</p>
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
                <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Clocked in at</p>
                    <p className="text-lg font-semibold">
                      {format(new Date(currentEntry.clock_in), "h:mm a")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Duration</p>
                    <p className="text-lg font-semibold font-mono">
                      {formatDuration(calculateEntrySeconds(currentEntry))}
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
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                            {status.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleClockOut} variant="destructive" className="w-full" size="lg">
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
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
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

        {/* Today's Quick Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Summary</CardTitle>
            <CardDescription>{format(new Date(), "EEEE, MMMM d, yyyy")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono mb-4">
              {formatDuration(
                allEntries
                  .filter((e) => isSameDay(new Date(e.clock_in), new Date()))
                  .reduce((sum, e) => sum + calculateEntrySeconds(e), 0)
              )}
            </div>
            <div className="space-y-2">
              {allEntries
                .filter((e) => isSameDay(new Date(e.clock_in), new Date()))
                .slice(0, 6)
                .map((entry) => {
                  const status = getStatusById(entry.status_id);
                  return (
                    <div key={entry.id} className="flex items-center justify-between p-2 bg-muted rounded-md text-sm">
                      <div className="flex items-center gap-2">
                        {status && (
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
                        )}
                        <span>
                          {format(new Date(entry.clock_in), "h:mm a")}
                          {entry.clock_out && ` – ${format(new Date(entry.clock_out), "h:mm a")}`}
                          {!entry.clock_out && " – now"}
                        </span>
                      </div>
                      <span className="font-mono text-xs">{formatDuration(calculateEntrySeconds(entry))}</span>
                    </div>
                  );
                })}
              {allEntries.filter((e) => isSameDay(new Date(e.clock_in), new Date())).length === 0 && (
                <p className="text-muted-foreground text-center py-4">No time entries today</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timesheet Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timesheets
              </CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-1">
                {!canEdit && <Lock className="h-3 w-3" />}
                {canEdit ? "View and manage time entries" : "Read-only — contact HR to make changes"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
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
                        <Input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Clock In</Label>
                          <Input type="time" value={manualClockIn} onChange={(e) => setManualClockIn(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Clock Out</Label>
                          <Input type="time" value={manualClockOut} onChange={(e) => setManualClockOut(e.target.value)} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={manualStatus} onValueChange={setManualStatus}>
                          <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                          <SelectContent>
                            {statuses.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                                  {s.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Note</Label>
                        <Textarea value={manualNote} onChange={(e) => setManualNote(e.target.value)} placeholder="Add a note..." />
                      </div>
                      <Button onClick={handleManualEntry} className="w-full">Add Entry</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* View Tabs */}
          <Tabs value={timesheetView} onValueChange={(v) => setTimesheetView(v as any)}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>

              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigatePrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[180px] text-center">{rangeLabel}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={navigateNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setViewDate(new Date())}>
                  Today
                </Button>
              </div>
            </div>

            {/* Total for period */}
            <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Total for {timesheetView === "daily" ? "day" : timesheetView === "weekly" ? "week" : "month"}
              </span>
              <span className="text-xl font-bold font-mono">{formatDuration(totalSeconds)}</span>
            </div>

            {/* Entries List */}
            <div className="mt-4">
              {timesheetView === "daily" ? (
                <DailyEntryList entries={filteredEntries} statuses={statuses} formatDuration={formatDuration} calculateSeconds={calculateEntrySeconds} />
              ) : (
                <GroupedEntryList
                  groups={entriesByDay}
                  statuses={statuses}
                  formatDuration={formatDuration}
                  calculateSeconds={calculateEntrySeconds}
                />
              )}

              {filteredEntries.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  No time entries for this {timesheetView === "daily" ? "day" : timesheetView === "weekly" ? "week" : "month"}
                </p>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Submitted Timesheets */}
      {timesheets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Submitted Timesheets</CardTitle>
            <CardDescription>View your submitted and approved timesheets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timesheets.map((timesheet) => (
                <div key={timesheet.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {format(new Date(timesheet.period_start), "MMM d")} –{" "}
                      {format(new Date(timesheet.period_end), "MMM d, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Regular: {timesheet.total_regular_hours}h | OT: {timesheet.total_overtime_hours}h | PTO: {timesheet.total_pto_hours}h
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
                        timesheet.status === "approved" ? "default" : timesheet.status === "submitted" ? "secondary" : "outline"
                      }
                    >
                      {timesheet.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper: end of day
function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function DailyEntryList({
  entries,
  statuses,
  formatDuration,
  calculateSeconds,
}: {
  entries: TimeEntry[];
  statuses: TimeTrackingStatus[];
  formatDuration: (s: number) => string;
  calculateSeconds: (e: TimeEntry) => number;
}) {
  const getStatus = (id: string | null) => statuses.find((s) => s.id === id);
  const [editedEntries, setEditedEntries] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchEdits = async () => {
      if (entries.length === 0) return;
      const ids = entries.map(e => e.id);
      const { data } = await supabase
        .from("time_entry_edits")
        .select("time_entry_id")
        .in("time_entry_id", ids);
      if (data) {
        const counts: Record<string, number> = {};
        data.forEach((d: any) => {
          counts[d.time_entry_id] = (counts[d.time_entry_id] || 0) + 1;
        });
        setEditedEntries(counts);
      }
    };
    fetchEdits();
  }, [entries]);

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const status = getStatus(entry.status_id);
        const wasEdited = editedEntries[entry.id];
        return (
          <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              {status && (
                <Badge className="text-xs" style={{ backgroundColor: status.color, color: "#fff" }}>
                  {status.name}
                </Badge>
              )}
              <div className="text-sm">
                <span className="font-medium">
                  {format(new Date(entry.clock_in), "h:mm:ss a")}
                </span>
                <span className="text-muted-foreground"> – </span>
                <span className="font-medium">
                  {entry.clock_out ? format(new Date(entry.clock_out), "h:mm:ss a") : "In progress"}
                </span>
              </div>
              {entry.notes && (
                <span className="text-xs text-muted-foreground italic hidden sm:inline">"{entry.notes}"</span>
              )}
              {entry.is_manual_entry && (
                <Badge variant="outline" className="text-[10px]">Manual</Badge>
              )}
              {wasEdited && (
                <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">
                  <Pencil className="h-2.5 w-2.5 mr-0.5" />
                  Edited
                </Badge>
              )}
            </div>
            <span className="font-mono text-sm font-medium">{formatDuration(calculateSeconds(entry))}</span>
          </div>
        );
      })}
    </div>
  );
}

function GroupedEntryList({
  groups,
  statuses,
  formatDuration,
  calculateSeconds,
}: {
  groups: { date: Date; entries: TimeEntry[] }[];
  statuses: TimeTrackingStatus[];
  formatDuration: (s: number) => string;
  calculateSeconds: (e: TimeEntry) => number;
}) {
  const getStatus = (id: string | null) => statuses.find((s) => s.id === id);

  return (
    <div className="space-y-4">
      {groups.map(({ date, entries }) => {
        const dayTotal = entries.reduce((sum, e) => sum + calculateSeconds(e), 0);
        return (
          <div key={date.toISOString()} className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted">
              <span className="text-sm font-semibold">{format(date, "EEEE, MMM d")}</span>
              <span className="text-sm font-mono font-semibold">{formatDuration(dayTotal)}</span>
            </div>
            <div className="divide-y divide-border/50">
              {entries.map((entry) => {
                const status = getStatus(entry.status_id);
                return (
                  <div key={entry.id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      {status && (
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: status.color }} />
                      )}
                      <span>
                        {format(new Date(entry.clock_in), "h:mm a")}
                        {" – "}
                        {entry.clock_out ? format(new Date(entry.clock_out), "h:mm a") : "now"}
                      </span>
                      {status && <span className="text-xs text-muted-foreground">({status.name})</span>}
                    </div>
                    <span className="font-mono text-xs">{formatDuration(calculateSeconds(entry))}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

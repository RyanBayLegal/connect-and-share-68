import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Square, Timer, ArrowRightLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

interface TimeEntry {
  id: string;
  clock_in: string;
  clock_out: string | null;
  status_id: string | null;
}

interface TimeStatus {
  id: string;
  name: string;
  color: string;
  is_paid: boolean;
}

export function TimeTrackingHeaderWidget() {
  const { profile } = useAuth();
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayClosedTotal, setTodayClosedTotal] = useState(0);
  const [statuses, setStatuses] = useState<TimeStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("");
  const [liveTodayTotal, setLiveTodayTotal] = useState("");
  const [open, setOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!profile) return;

    try {
      const [{ data: entryData }, { data: statusData }, { data: todayEntries }] = await Promise.all([
        supabase
          .from("time_entries")
          .select("id, clock_in, clock_out, status_id")
          .eq("employee_id", profile.id)
          .is("clock_out", null)
          .order("clock_in", { ascending: false })
          .limit(1),
        supabase
          .from("time_tracking_statuses")
          .select("id, name, color, is_paid")
          .eq("is_active", true)
          .order("position"),
        supabase
          .from("time_entries")
          .select("clock_in, clock_out")
          .eq("employee_id", profile.id)
          .gte("clock_in", new Date().toISOString().split("T")[0])
      ]);

      setCurrentEntry(entryData?.[0] || null);
      setStatuses((statusData || []) as TimeStatus[]);

      let closedTotal = 0;
      (todayEntries || []).forEach((entry: any) => {
        const start = new Date(entry.clock_in).getTime();
        if (entry.clock_out) {
          closedTotal += new Date(entry.clock_out).getTime() - start;
        }
      });
      setTodayClosedTotal(closedTotal);
      setTodayTotal(closedTotal);
    } catch (error) {
      console.error("Error fetching time data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const updateElapsed = () => {
      if (currentEntry) {
        const start = new Date(currentEntry.clock_in).getTime();
        const now = Date.now();
        const diff = now - start;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setElapsedTime(`${hours}h ${minutes}m ${seconds}s`);

        // Live today total = closed entries + current session
        const liveTotal = todayClosedTotal + diff;
        setTodayTotal(liveTotal);
        setLiveTodayTotal(formatTime(liveTotal));
      } else {
        setLiveTodayTotal(formatTime(todayClosedTotal));
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [currentEntry, todayClosedTotal]);

  const handleClockIn = async (statusId?: string) => {
    if (!profile) return;
    setIsSubmitting(true);

    try {
      const selectedStatus = statusId
        ? statuses.find(s => s.id === statusId)
        : statuses.find(s => s.name.toLowerCase() === "working") || statuses[0];

      const { error } = await supabase.from("time_entries").insert({
        employee_id: profile.id,
        clock_in: new Date().toISOString(),
        status_id: selectedStatus?.id || null,
        is_manual_entry: false,
      });

      if (error) throw error;
      toast.success(`Clocked in — ${selectedStatus?.name || "Working"}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to clock in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!currentEntry) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("time_entries")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", currentEntry.id);

      if (error) throw error;
      toast.success("Clocked out!");
      setCurrentEntry(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to clock out");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeStatus = async (newStatusId: string) => {
    if (!currentEntry || !profile) return;
    if (currentEntry.status_id === newStatusId) return;
    setIsSubmitting(true);

    const newStatus = statuses.find(s => s.id === newStatusId);

    try {
      const now = new Date().toISOString();

      // Close current entry
      const { error: closeError } = await supabase
        .from("time_entries")
        .update({ clock_out: now })
        .eq("id", currentEntry.id);

      if (closeError) throw closeError;

      // Open new entry with new status
      const { error: openError } = await supabase.from("time_entries").insert({
        employee_id: profile.id,
        clock_in: now,
        status_id: newStatusId,
        is_manual_entry: false,
      });

      if (openError) throw openError;

      toast.success(`Switched to ${newStatus?.name || "new status"}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to change status");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const formatTotalTime = formatTime;

  const getCurrentStatus = () => {
    if (!currentEntry?.status_id) return null;
    return statuses.find(s => s.id === currentEntry.status_id);
  };

  const currentStatus = getCurrentStatus();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-9 gap-2 text-muted-foreground hover:text-foreground ${currentEntry ? "text-primary" : ""}`}
          title={currentEntry ? `Clocked in: ${elapsedTime}` : "Clock in"}
        >
          <div className="relative">
            <Clock className="h-5 w-5" />
            {currentEntry && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            )}
          </div>
          {currentEntry && currentStatus && (
            <span
              className="hidden sm:inline text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
              style={{ backgroundColor: currentStatus.color + "22", color: currentStatus.color }}
            >
              {currentStatus.name}
            </span>
          )}
          <span className="hidden sm:inline text-xs">
            {currentEntry ? elapsedTime : formatTotalTime(todayTotal)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Time Tracking
            </h4>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link to="/time-tracking" onClick={() => setOpen(false)}>
                View All
              </Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          ) : currentEntry ? (
            <>
              <div className="bg-primary/10 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {currentStatus && (
                    <Badge
                      className="text-xs"
                      style={{ backgroundColor: currentStatus.color, color: "#fff" }}
                    >
                      {currentStatus.name}
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-primary">{elapsedTime}</p>
                <p className="text-xs text-muted-foreground">
                  Started at {new Date(currentEntry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Status Switcher */}
              {statuses.length > 1 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <ArrowRightLeft className="h-3 w-3" />
                    Switch Status
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {statuses.map((status) => {
                      const isActive = currentEntry.status_id === status.id;
                      return (
                        <button
                          key={status.id}
                          onClick={() => handleChangeStatus(status.id)}
                          disabled={isSubmitting || isActive}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors border ${
                            isActive
                              ? "border-primary/30 bg-primary/10 text-foreground cursor-default"
                              : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="truncate">{status.name}</span>
                          {!status.is_paid && (
                            <span className="text-[9px] text-muted-foreground ml-auto">unpaid</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                onClick={handleClockOut}
                disabled={isSubmitting}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                <Square className="h-4 w-4 mr-2" />
                {isSubmitting ? "Processing..." : "Clock Out"}
              </Button>
            </>
          ) : (
            <>
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground">You're not clocked in</p>
              </div>
              {statuses.length > 1 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Clock in as:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {statuses.map((status) => (
                      <Button
                        key={status.id}
                        onClick={() => handleClockIn(status.id)}
                        disabled={isSubmitting}
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="truncate text-xs">{status.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => handleClockIn()}
                  disabled={isSubmitting}
                  size="sm"
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Clocking in..." : "Clock In"}
                </Button>
              )}
            </>
          )}

          <Separator />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Today's Total</span>
            <span className="font-semibold font-mono">{liveTodayTotal || formatTotalTime(todayTotal)}</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

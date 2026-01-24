import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Square, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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
}

export function TimeTrackingHeaderWidget() {
  const { profile } = useAuth();
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [statuses, setStatuses] = useState<TimeStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("");
  const [open, setOpen] = useState(false);

  const fetchData = async () => {
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
          .select("id, name, color")
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

      let total = 0;
      (todayEntries || []).forEach((entry: any) => {
        const start = new Date(entry.clock_in).getTime();
        const end = entry.clock_out ? new Date(entry.clock_out).getTime() : Date.now();
        total += end - start;
      });
      setTodayTotal(total);
    } catch (error) {
      console.error("Error fetching time data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile]);

  useEffect(() => {
    const updateElapsed = () => {
      if (currentEntry) {
        const start = new Date(currentEntry.clock_in).getTime();
        const now = Date.now();
        const diff = now - start;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setElapsedTime(`${hours}h ${minutes}m`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [currentEntry]);

  const handleClockIn = async () => {
    if (!profile) return;
    setIsSubmitting(true);

    try {
      const defaultStatus = statuses.find(s => s.name.toLowerCase() === "working") || statuses[0];

      const { error } = await supabase.from("time_entries").insert({
        employee_id: profile.id,
        clock_in: new Date().toISOString(),
        status_id: defaultStatus?.id || null,
        is_manual_entry: false,
      });

      if (error) throw error;
      toast.success("Clocked in!");
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

  const formatTotalTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

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
          <span className="hidden sm:inline text-xs">
            {currentEntry ? elapsedTime : formatTotalTime(todayTotal)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
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
              <Button
                onClick={handleClockOut}
                disabled={isSubmitting}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                <Square className="h-4 w-4 mr-2" />
                {isSubmitting ? "Clocking out..." : "Clock Out"}
              </Button>
            </>
          ) : (
            <>
              <div className="text-center py-2">
                <p className="text-sm text-muted-foreground">You're not clocked in</p>
              </div>
              <Button
                onClick={handleClockIn}
                disabled={isSubmitting}
                size="sm"
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                {isSubmitting ? "Clocking in..." : "Clock In"}
              </Button>
            </>
          )}

          <div className="pt-2 border-t flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Today's Total</span>
            <span className="font-semibold">{formatTotalTime(todayTotal)}</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

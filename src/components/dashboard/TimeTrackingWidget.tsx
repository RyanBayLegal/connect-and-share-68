import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Square, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

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

export function TimeTrackingWidget() {
  const { profile } = useAuth();
  const [currentEntry, setCurrentEntry] = useState<TimeEntry | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [statuses, setStatuses] = useState<TimeStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("");

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

      // Calculate today's total
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

  // Update elapsed time every minute
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
      // Get default "Working" status
      const defaultStatus = statuses.find(s => s.name.toLowerCase() === "working") || statuses[0];

      const { error } = await supabase.from("time_entries").insert({
        employee_id: profile.id,
        clock_in: new Date().toISOString(),
        status_id: defaultStatus?.id || null,
        is_manual_entry: false,
      });

      if (error) throw error;
      toast.success("Clocked in successfully!");
      fetchData();
    } catch (error: any) {
      console.error("Clock in error:", error);
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
      toast.success("Clocked out successfully!");
      setCurrentEntry(null);
      fetchData();
    } catch (error: any) {
      console.error("Clock out error:", error);
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  const currentStatus = getCurrentStatus();

  return (
    <Card className="card-interactive">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" />
          Time Tracking
        </CardTitle>
        <Button variant="ghost" size="sm" asChild className="group">
          <Link to="/time-tracking">
            View All
            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentEntry ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Currently clocked in</span>
              {currentStatus && (
                <Badge
                  style={{ backgroundColor: currentStatus.color, color: "#fff" }}
                >
                  {currentStatus.name}
                </Badge>
              )}
            </div>
            <div className="text-center py-2">
              <p className="text-3xl font-bold text-primary">{elapsedTime}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Started at {new Date(currentEntry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <Button
              onClick={handleClockOut}
              disabled={isSubmitting}
              className="w-full"
              variant="destructive"
            >
              <Square className="h-4 w-4 mr-2" />
              {isSubmitting ? "Clocking out..." : "Clock Out"}
            </Button>
          </>
        ) : (
          <>
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">You are not clocked in</p>
            </div>
            <Button
              onClick={handleClockIn}
              disabled={isSubmitting}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              {isSubmitting ? "Clocking in..." : "Clock In"}
            </Button>
          </>
        )}
        
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Today's Total</span>
            <span className="font-semibold">{formatTotalTime(todayTotal)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

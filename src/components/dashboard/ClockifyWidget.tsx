import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, Play, Square, Settings, ExternalLink, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface TimeEntry {
  id: string;
  description: string;
  timeInterval: {
    start: string;
    end: string | null;
    duration: string | null;
  };
  projectId: string | null;
  project?: {
    name: string;
  };
}

interface ClockifyUser {
  id: string;
  name: string;
  activeWorkspace: string;
}

const CLOCKIFY_API_BASE = "https://api.clockify.me/api/v1";

interface ClockifyWidgetProps {
  compact?: boolean;
}

export function ClockifyWidget({ compact = false }: ClockifyWidgetProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("clockify_api_key") || "");
  const [tempApiKey, setTempApiKey] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [user, setUser] = useState<ClockifyUser | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [timerDescription, setTimerDescription] = useState("");

  const fetchWithAuth = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    if (!apiKey) return null;
    
    try {
      const response = await fetch(`${CLOCKIFY_API_BASE}${endpoint}`, {
        ...options,
        headers: {
          "X-Api-Key": apiKey,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Invalid Clockify API key");
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error("Clockify API error:", error);
      return null;
    }
  }, [apiKey]);

  const fetchUserData = useCallback(async () => {
    if (!apiKey) return;
    
    setIsLoading(true);
    try {
      const userData = await fetchWithAuth("/user");
      if (userData) {
        setUser(userData);
        
        // Fetch time entries for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const entries = await fetchWithAuth(
          `/workspaces/${userData.activeWorkspace}/user/${userData.id}/time-entries?start=${today.toISOString()}`
        );
        
        if (entries) {
          setTimeEntries(entries);
          
          // Find active timer
          const active = entries.find((e: TimeEntry) => !e.timeInterval.end);
          setActiveTimer(active || null);
          
          // Calculate today's total
          let total = 0;
          entries.forEach((entry: TimeEntry) => {
            if (entry.timeInterval.duration) {
              // Duration is in ISO 8601 format like PT1H30M
              const match = entry.timeInterval.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
              if (match) {
                const hours = parseInt(match[1] || "0");
                const minutes = parseInt(match[2] || "0");
                const seconds = parseInt(match[3] || "0");
                total += hours * 3600 + minutes * 60 + seconds;
              }
            }
          });
          setTodayTotal(total);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, fetchWithAuth]);

  useEffect(() => {
    if (apiKey) {
      fetchUserData();
    }
  }, [apiKey, fetchUserData]);

  // Update elapsed time for active timer
  useEffect(() => {
    if (!activeTimer) {
      setElapsedTime(0);
      return;
    }

    const startTime = new Date(activeTimer.timeInterval.start).getTime();
    
    const updateElapsed = () => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    };
    
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    
    return () => clearInterval(interval);
  }, [activeTimer]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatHoursMinutes = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const handleSaveApiKey = () => {
    localStorage.setItem("clockify_api_key", tempApiKey);
    setApiKey(tempApiKey);
    setIsConfigOpen(false);
    toast.success("Clockify API key saved");
  };

  const startTimer = async () => {
    if (!user) return;
    
    const result = await fetchWithAuth(
      `/workspaces/${user.activeWorkspace}/time-entries`,
      {
        method: "POST",
        body: JSON.stringify({
          start: new Date().toISOString(),
          description: timerDescription.trim() || undefined,
        }),
      }
    );
    
    if (result) {
      toast.success("Timer started");
      setTimerDescription("");
      fetchUserData();
    }
  };

  const stopTimer = async () => {
    if (!user || !activeTimer) return;
    
    const result = await fetchWithAuth(
      `/workspaces/${user.activeWorkspace}/time-entries/${activeTimer.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          end: new Date().toISOString(),
        }),
      }
    );
    
    if (result) {
      toast.success("Timer stopped");
      fetchUserData();
    }
  };

  // Compact variant for header placement
  if (compact) {
    const formatEntryDuration = (duration: string | null) => {
      if (!duration) return "";
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      if (match) {
        const h = match[1] || "0";
        const m = match[2] || "0";
        return `${h}h ${m}m`;
      }
      return "";
    };

    // Not connected - minimal clock icon
    if (!apiKey) {
      return (
        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
              <Clock className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Clockify</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your Clockify API key"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Find your API key at{" "}
                  <a
                    href="https://app.clockify.me/user/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Clockify Settings
                  </a>
                </p>
              </div>
              <Button onClick={handleSaveApiKey} className="w-full">
                Save API Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    // Connected - minimal timer button with expandable dropdown
    return (
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 h-9 px-3"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Clock className="h-4 w-4 text-primary" />
          {activeTimer ? (
            <>
              <span className="text-sm font-mono text-primary">
                {formatDuration(elapsedTime)}
              </span>
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            </>
          ) : (
            <span className="text-sm text-muted-foreground">
              {formatHoursMinutes(todayTotal)}
            </span>
          )}
          <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
        </Button>

        {/* Expandable dropdown */}
        {isExpanded && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-background border rounded-lg p-4 shadow-lg z-50">
            {/* Timer controls section */}
            <div className="mb-4 pb-3 border-b">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Today's Total</p>
                  <p className="text-xl font-semibold text-primary">
                    {formatHoursMinutes(todayTotal + (activeTimer ? elapsedTime : 0))}
                  </p>
                </div>
                {activeTimer ? (
                  <Button size="sm" variant="destructive" onClick={stopTimer}>
                    <Square className="h-3 w-3 mr-1" /> Stop
                  </Button>
                ) : (
                  <Button size="sm" onClick={startTimer} disabled={!timerDescription.trim() && false}>
                    <Play className="h-3 w-3 mr-1" /> Start
                  </Button>
                )}
              </div>
              {!activeTimer && (
                <Input
                  placeholder="What are you working on?"
                  value={timerDescription}
                  onChange={(e) => setTimerDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !activeTimer) {
                      startTimer();
                    }
                  }}
                  className="h-8 text-sm"
                  maxLength={255}
                />
              )}
            </div>

            {/* Active timer display */}
            {activeTimer && (
              <div className="mb-3 p-2 bg-primary/10 rounded text-center">
                <span className="text-lg font-mono font-bold text-primary">
                  {formatDuration(elapsedTime)}
                </span>
                <p className="text-xs text-muted-foreground">
                  {activeTimer.description || "Timer running"}
                </p>
              </div>
            )}

            {/* Recent entries */}
            {timeEntries.filter(e => e.timeInterval.end).length > 0 && (
              <>
                <h4 className="text-sm font-medium mb-2">Recent Entries</h4>
                <ScrollArea className="max-h-[150px]">
                  <div className="space-y-1">
                    {timeEntries
                      .filter(e => e.timeInterval.end)
                      .slice(0, 5)
                      .map(entry => (
                        <div
                          key={entry.id}
                          className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0"
                        >
                          <span className="text-muted-foreground truncate max-w-[60%]">
                            {entry.description || "No description"}
                          </span>
                          <span className="font-medium">
                            {formatEntryDuration(entry.timeInterval.duration)}
                          </span>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </>
            )}

            {/* Footer actions */}
            <div className="mt-3 pt-3 border-t flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => window.open("https://app.clockify.me/tracker", "_blank")}
              >
                <ExternalLink className="h-3 w-3 mr-1" /> Open Clockify
              </Button>
              <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clockify Settings</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        placeholder="Enter your Clockify API key"
                        value={tempApiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleSaveApiKey} className="w-full">
                      Update API Key
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!apiKey) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Clockify
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-muted-foreground text-sm mb-4">
            Connect your Clockify account to track time
          </p>
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configure
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clockify Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter your Clockify API key"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Find your API key at{" "}
                    <a
                      href="https://app.clockify.me/user/settings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Clockify Settings
                    </a>
                  </p>
                </div>
                <Button onClick={handleSaveApiKey} className="w-full">
                  Save API Key
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Clockify
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => window.open("https://app.clockify.me/tracker", "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clockify Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter your Clockify API key"
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSaveApiKey} className="w-full">
                    Update API Key
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Active Timer Section */}
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-3xl font-mono font-bold text-primary mb-2">
                {formatDuration(elapsedTime)}
              </div>
              {activeTimer ? (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    {activeTimer.description || "No description"}
                  </p>
                  <Button onClick={stopTimer} variant="destructive" size="sm">
                    <Square className="h-4 w-4 mr-2" />
                    Stop Timer
                  </Button>
                </>
              ) : (
                <Button onClick={startTimer} size="sm">
                  <Play className="h-4 w-4 mr-2" />
                  Start Timer
                </Button>
              )}
            </div>

            {/* Today's Total */}
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm font-medium">Today</span>
              <span className="text-sm font-semibold text-primary">
                {formatHoursMinutes(todayTotal + (activeTimer ? elapsedTime : 0))}
              </span>
            </div>

            {/* Recent Entries */}
            {timeEntries.length > 0 && (
              <div className="border-t pt-3">
                <h4 className="text-sm font-medium mb-2">Recent Entries</h4>
                <ScrollArea className="h-[120px]">
                  <div className="space-y-2">
                    {timeEntries
                      .filter((e) => e.timeInterval.end)
                      .slice(0, 5)
                      .map((entry) => {
                        const duration = entry.timeInterval.duration;
                        let durationStr = "";
                        if (duration) {
                          const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
                          if (match) {
                            const h = match[1] || "0";
                            const m = match[2] || "0";
                            durationStr = `${h}h ${m}m`;
                          }
                        }
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-muted-foreground truncate max-w-[60%]">
                              {entry.description || "No description"}
                            </span>
                            <span className="font-medium">{durationStr}</span>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

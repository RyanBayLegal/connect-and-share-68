import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, GraduationCap, ClipboardList, AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { Profile } from "@/types/database";

interface DirectReport extends Profile {
  onboardingProgress?: number;
  trainingProgress?: number;
  overdueItems?: number;
}

interface RecentActivity {
  id: string;
  type: "onboarding" | "training";
  employeeName: string;
  action: string;
  itemName: string;
  timestamp: string;
}

export function ManagerProgressWidget() {
  const { profile } = useAuth();
  const [directReports, setDirectReports] = useState<DirectReport[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReports: 0,
    onboardingComplete: 0,
    onboardingTotal: 0,
    trainingComplete: 0,
    trainingTotal: 0,
    overdueCount: 0,
  });

  useEffect(() => {
    if (profile?.id) {
      fetchTeamProgress();
    }
  }, [profile?.id]);

  const fetchTeamProgress = async () => {
    if (!profile?.id) return;

    try {
      // Fetch direct reports
      const { data: reports } = await supabase
        .from("profiles")
        .select("*")
        .eq("manager_id", profile.id)
        .eq("is_active", true);

      if (!reports || reports.length === 0) {
        setIsLoading(false);
        return;
      }

      const reportIds = reports.map((r) => r.id);

      // Fetch onboarding data for direct reports
      const { data: onboardingData } = await supabase
        .from("employee_onboarding")
        .select(`
          id,
          employee_id,
          status,
          onboarding_progress(is_completed)
        `)
        .in("employee_id", reportIds);

      // Fetch training enrollments for direct reports
      const { data: trainingData } = await supabase
        .from("training_enrollments")
        .select(`
          id,
          employee_id,
          status,
          progress_percent,
          due_date,
          course:training_courses(title)
        `)
        .in("employee_id", reportIds);

      // Calculate stats
      let onboardingComplete = 0;
      let onboardingTotal = 0;
      let trainingComplete = 0;
      let trainingTotal = trainingData?.length || 0;
      let overdueCount = 0;
      const today = new Date().toISOString().split("T")[0];

      onboardingData?.forEach((ob) => {
        const progress = ob.onboarding_progress as { is_completed: boolean }[] || [];
        const completed = progress.filter((p) => p.is_completed).length;
        const total = progress.length;
        onboardingTotal += total;
        onboardingComplete += completed;
      });

      trainingData?.forEach((t) => {
        if (t.status === "completed") {
          trainingComplete++;
        }
        if (t.due_date && t.due_date < today && t.status !== "completed") {
          overdueCount++;
        }
      });

      // Build recent activity
      const activities: RecentActivity[] = [];

      trainingData?.forEach((t) => {
        const emp = reports.find((r) => r.id === t.employee_id);
        if (emp && t.status === "completed") {
          activities.push({
            id: t.id,
            type: "training",
            employeeName: `${emp.first_name} ${emp.last_name}`,
            action: "completed",
            itemName: (t.course as { title: string })?.title || "Training",
            timestamp: new Date().toISOString(), // Use current as we don't have completed_at in select
          });
        } else if (emp && t.status === "in_progress") {
          activities.push({
            id: t.id,
            type: "training",
            employeeName: `${emp.first_name} ${emp.last_name}`,
            action: "started",
            itemName: (t.course as { title: string })?.title || "Training",
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Map progress to direct reports
      const reportsWithProgress = reports.map((report) => {
        const onboarding = onboardingData?.find((o) => o.employee_id === report.id);
        const trainings = trainingData?.filter((t) => t.employee_id === report.id) || [];
        
        let onboardingProgress = 0;
        if (onboarding) {
          const progress = onboarding.onboarding_progress as { is_completed: boolean }[] || [];
          const completed = progress.filter((p) => p.is_completed).length;
          onboardingProgress = progress.length > 0 ? Math.round((completed / progress.length) * 100) : 0;
        }

        const trainingCompleted = trainings.filter((t) => t.status === "completed").length;
        const trainingProgress = trainings.length > 0 
          ? Math.round((trainingCompleted / trainings.length) * 100) 
          : 0;

        const overdueItems = trainings.filter(
          (t) => t.due_date && t.due_date < today && t.status !== "completed"
        ).length;

        return {
          ...report,
          onboardingProgress,
          trainingProgress,
          overdueItems,
        };
      });

      setDirectReports(reportsWithProgress);
      setRecentActivity(activities.slice(0, 5));
      setStats({
        totalReports: reports.length,
        onboardingComplete,
        onboardingTotal,
        trainingComplete,
        trainingTotal,
        overdueCount,
      });
    } catch (error) {
      console.error("Error fetching team progress:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if user has no direct reports
  if (!isLoading && directReports.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="card-interactive">
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const onboardingPercent = stats.onboardingTotal > 0 
    ? Math.round((stats.onboardingComplete / stats.onboardingTotal) * 100) 
    : 0;
  const trainingPercent = stats.trainingTotal > 0 
    ? Math.round((stats.trainingComplete / stats.trainingTotal) * 100) 
    : 0;

  return (
    <Card className="card-interactive">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Your Team's Progress
          </CardTitle>
          <CardDescription>
            {stats.totalReports} direct report{stats.totalReports !== 1 ? "s" : ""}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild className="group">
          <Link to="/directory">
            View Team <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Sections */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Onboarding Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Onboarding</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {stats.onboardingComplete} / {stats.onboardingTotal} items
              </span>
            </div>
            <Progress value={onboardingPercent} className="h-2" />
            <p className="text-sm text-muted-foreground">{onboardingPercent}% complete</p>
          </div>

          {/* Training Progress */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Training</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {stats.trainingComplete} / {stats.trainingTotal} courses
              </span>
            </div>
            <Progress value={trainingPercent} className="h-2" />
            <p className="text-sm text-muted-foreground">{trainingPercent}% complete</p>
          </div>
        </div>

        {/* Overdue Warning */}
        {stats.overdueCount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive font-medium">
              {stats.overdueCount} overdue item{stats.overdueCount !== 1 ? "s" : ""} need attention
            </span>
          </div>
        )}

        {/* Team Members Quick View */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Team Members</h4>
          <div className="grid gap-2">
            {directReports.slice(0, 4).map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={report.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {report.first_name[0]}{report.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{report.first_name} {report.last_name}</p>
                    <p className="text-xs text-muted-foreground">{report.job_title || "Employee"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {report.overdueItems && report.overdueItems > 0 ? (
                    <Badge variant="destructive" className="text-xs">
                      {report.overdueItems} overdue
                    </Badge>
                  ) : report.trainingProgress === 100 && report.onboardingProgress === 100 ? (
                    <Badge variant="default" className="text-xs flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Complete
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      {Math.round((report.trainingProgress + report.onboardingProgress) / 2)}% overall
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {directReports.length > 4 && (
              <p className="text-xs text-muted-foreground text-center py-1">
                + {directReports.length - 4} more team member{directReports.length - 4 !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Recent Activity</h4>
            <div className="space-y-2">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <span>
                    <span className="font-medium">{activity.employeeName}</span>
                    {" "}{activity.action}{" "}
                    <span className="text-muted-foreground">"{activity.itemName}"</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

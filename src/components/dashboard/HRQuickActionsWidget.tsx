import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  DollarSign, 
  Calendar, 
  FileText, 
  ClipboardList, 
  Heart, 
  GraduationCap,
  Briefcase
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface HRStats {
  pendingLeaveRequests: number;
  activeEmployees: number;
  pendingTimesheetApprovals: number;
}

const hrActions = [
  { label: "Employee Records", icon: Users, href: "/directory" },
  { label: "Payroll Management", icon: DollarSign, href: "/payroll" },
  { label: "Leave Requests", icon: Calendar, href: "/time-management" },
  { label: "Compliance Reports", icon: FileText, href: "/documents" },
  { label: "Recruitment Dashboard", icon: ClipboardList, href: "/hr-onboarding" },
  { label: "Employee Benefits", icon: Heart, href: "/hr-settings" },
  { label: "Training & Development", icon: GraduationCap, href: "/training-management" },
];

export function HRQuickActionsWidget() {
  const { isHRManager, rolesLoaded } = useAuth();
  const [stats, setStats] = useState<HRStats>({
    pendingLeaveRequests: 0,
    activeEmployees: 0,
    pendingTimesheetApprovals: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const canAccess = rolesLoaded && isHRManager();

  useEffect(() => {
    if (!canAccess) {
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const [leaveResult, employeeResult, timesheetResult] = await Promise.all([
          supabase
            .from("time_off_requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending"),
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true),
          supabase
            .from("timesheets")
            .select("*", { count: "exact", head: true })
            .eq("status", "submitted"),
        ]);

        setStats({
          pendingLeaveRequests: leaveResult.count || 0,
          activeEmployees: employeeResult.count || 0,
          pendingTimesheetApprovals: timesheetResult.count || 0,
        });
      } catch (error) {
        console.error("Error fetching HR stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [canAccess]);

  if (!rolesLoaded) return null;
  if (!canAccess) return null;

  return (
    <Card className="glass-card neon-border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Briefcase className="h-5 w-5 text-primary" />
          HR Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {stats.pendingLeaveRequests}
                </p>
                <p className="text-xs text-muted-foreground">Pending Requests</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {stats.activeEmployees}
                </p>
                <p className="text-xs text-muted-foreground">Active Employees</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {stats.pendingTimesheetApprovals}
                </p>
                <p className="text-xs text-muted-foreground">Timesheet Approvals</p>
              </div>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {hrActions.map((action) => (
                <Button
                  key={action.href}
                  size="sm"
                  variant="outline"
                  asChild
                  className="justify-start glass-panel hover:neon-glow-sm hover:border-primary/40 border-border/30"
                >
                  <Link to={action.href}>
                    <action.icon className="h-4 w-4 mr-2 text-primary" />
                    <span className="truncate">{action.label}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

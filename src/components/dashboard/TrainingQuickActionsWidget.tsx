import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Users, BookOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface TrainingStats {
  pendingEnrollments: number;
  activeCourses: number;
  totalEnrolled: number;
}

export function TrainingQuickActionsWidget() {
  const { profile, hasRole, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<TrainingStats>({
    pendingEnrollments: 0,
    activeCourses: 0,
    totalEnrolled: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Access check - training department or training_manager only (not super_admin)
  const departmentName = profile?.department?.name?.toLowerCase() || "";
  const isTrainingDepartment = departmentName.includes("training");
  const isTrainingManager = hasRole("training_manager");
  const canAccess = isTrainingDepartment || isTrainingManager;

  useEffect(() => {
    if (!canAccess) {
      setIsLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        const [pendingResult, courseResult, enrolledResult] = await Promise.all([
          supabase
            .from("training_enrollments")
            .select("*", { count: "exact", head: true })
            .eq("status", "assigned"),
          supabase
            .from("training_courses")
            .select("*", { count: "exact", head: true })
            .eq("is_active", true),
          supabase
            .from("training_enrollments")
            .select("*", { count: "exact", head: true })
            .in("status", ["assigned", "in_progress"]),
        ]);

        setStats({
          pendingEnrollments: pendingResult.count || 0,
          activeCourses: courseResult.count || 0,
          totalEnrolled: enrolledResult.count || 0,
        });
      } catch (error) {
        console.error("Error fetching training stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [canAccess]);

  if (!canAccess) return null;

  return (
    <Card className="bg-gradient-to-br from-purple-500/10 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <GraduationCap className="h-5 w-5 text-primary" />
          Training Management
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
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {stats.pendingEnrollments}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {stats.activeCourses}
                </p>
                <p className="text-xs text-muted-foreground">Active Courses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {stats.totalEnrolled}
                </p>
                <p className="text-xs text-muted-foreground">In Training</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" asChild className="flex-1">
                <Link to="/training-management">
                  <Users className="h-4 w-4 mr-1" />
                  Enroll Users
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild className="flex-1">
                <Link to="/training-management">
                  Manage <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  BookOpen,
} from "lucide-react";

interface AnalyticsData {
  totalEnrollments: number;
  completedCount: number;
  inProgressCount: number;
  overdueCount: number;
  completionRate: number;
  departmentStats: { name: string; completed: number; overdue: number; total: number }[];
  courseStats: { title: string; enrollments: number; completionRate: number }[];
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export function TrainingAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [
        { data: enrollments },
        { data: courses },
        { data: profiles },
        { data: departments },
      ] = await Promise.all([
        supabase.from("training_enrollments").select("*, employee:profiles(*, department:departments(*))"),
        supabase.from("training_courses").select("*").eq("is_active", true),
        supabase.from("profiles").select("*, department:departments(*)"),
        supabase.from("departments").select("*"),
      ]);

      const today = new Date();
      const enrollmentList = enrollments || [];
      
      // Overall stats
      const completedCount = enrollmentList.filter((e: any) => e.status === "completed").length;
      const inProgressCount = enrollmentList.filter((e: any) => e.status === "in_progress").length;
      const overdueCount = enrollmentList.filter((e: any) => {
        if (e.status === "completed") return false;
        if (!e.due_date) return false;
        return new Date(e.due_date) < today;
      }).length;

      const completionRate = enrollmentList.length > 0 
        ? Math.round((completedCount / enrollmentList.length) * 100) 
        : 0;

      // Department stats
      const deptMap = new Map<string, { name: string; completed: number; overdue: number; total: number }>();
      (departments || []).forEach((d: any) => {
        deptMap.set(d.id, { name: d.name, completed: 0, overdue: 0, total: 0 });
      });

      enrollmentList.forEach((e: any) => {
        const deptId = e.employee?.department_id;
        if (deptId && deptMap.has(deptId)) {
          const stats = deptMap.get(deptId)!;
          stats.total++;
          if (e.status === "completed") {
            stats.completed++;
          } else if (e.due_date && new Date(e.due_date) < today) {
            stats.overdue++;
          }
        }
      });

      const departmentStats = Array.from(deptMap.values())
        .filter((d) => d.total > 0)
        .sort((a, b) => b.total - a.total);

      // Course stats (trending)
      const courseMap = new Map<string, { title: string; enrollments: number; completed: number }>();
      (courses || []).forEach((c: any) => {
        courseMap.set(c.id, { title: c.title, enrollments: 0, completed: 0 });
      });

      enrollmentList.forEach((e: any) => {
        if (courseMap.has(e.course_id)) {
          const stats = courseMap.get(e.course_id)!;
          stats.enrollments++;
          if (e.status === "completed") {
            stats.completed++;
          }
        }
      });

      const courseStats = Array.from(courseMap.values())
        .map((c) => ({
          title: c.title.length > 20 ? c.title.substring(0, 20) + "..." : c.title,
          enrollments: c.enrollments,
          completionRate: c.enrollments > 0 ? Math.round((c.completed / c.enrollments) * 100) : 0,
        }))
        .sort((a, b) => b.enrollments - a.enrollments)
        .slice(0, 5);

      setData({
        totalEnrollments: enrollmentList.length,
        completedCount,
        inProgressCount,
        overdueCount,
        completionRate,
        departmentStats,
        courseStats,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center text-muted-foreground p-8">Failed to load analytics</div>;
  }

  const statusPieData = [
    { name: "Completed", value: data.completedCount, color: "hsl(var(--chart-1))" },
    { name: "In Progress", value: data.inProgressCount, color: "hsl(var(--chart-2))" },
    { name: "Overdue", value: data.overdueCount, color: "hsl(var(--destructive))" },
    { name: "Not Started", value: data.totalEnrollments - data.completedCount - data.inProgressCount - data.overdueCount, color: "hsl(var(--muted))" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalEnrollments}</div>
            <p className="text-xs text-muted-foreground">Active training assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.completionRate}%</div>
            <Progress value={data.completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{data.completedCount}</div>
            <p className="text-xs text-muted-foreground">Training courses finished</p>
          </CardContent>
        </Card>

                <Card className={data.overdueCount > 0 ? "border-destructive/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${data.overdueCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.overdueCount > 0 ? "text-destructive" : ""}`}>
              {data.overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Training Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No enrollment data
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Courses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Trending Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.courseStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.courseStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="title" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === "enrollments" ? `${value} enrolled` : `${value}% completion`,
                      name === "enrollments" ? "Enrollments" : "Completion Rate",
                    ]}
                  />
                  <Bar dataKey="enrollments" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No course data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Training by Department</CardTitle>
        </CardHeader>
        <CardContent>
          {data.departmentStats.length > 0 ? (
            <div className="space-y-4">
              {data.departmentStats.map((dept) => {
                const completionRate = dept.total > 0 ? Math.round((dept.completed / dept.total) * 100) : 0;
                return (
                  <div key={dept.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{dept.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {dept.total} enrolled
                        </Badge>
                        {dept.overdue > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {dept.overdue} overdue
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {completionRate}% complete
                      </span>
                    </div>
                    <Progress value={completionRate} className="h-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No department training data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

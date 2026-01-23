import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  ArrowLeft,
  BookOpen,
  CircleCheck,
  Circle,
} from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import type { Profile } from "@/types/database";

interface DirectReport extends Profile {
  onboardingProgress: number;
  onboardingCompleted: number;
  onboardingTotal: number;
  trainingProgress: number;
  trainingCompleted: number;
  trainingTotal: number;
  overdueItems: number;
}

interface OnboardingItem {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
}

interface TrainingItem {
  id: string;
  course_title: string;
  category: string;
  status: string;
  progress_percent: number;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  is_mandatory: boolean;
}

interface EmployeeDetail {
  profile: DirectReport;
  onboarding: OnboardingItem[];
  training: TrainingItem[];
}

export default function TeamProgress() {
  const { profile } = useAuth();
  const [directReports, setDirectReports] = useState<DirectReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  // Detail dialog
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchTeamProgress();
    }
  }, [profile?.id]);

  const fetchTeamProgress = async () => {
    if (!profile?.id) return;

    try {
      const { data: reports } = await supabase
        .from("profiles")
        .select("*")
        .eq("manager_id", profile.id)
        .eq("is_active", true)
        .order("first_name");

      if (!reports || reports.length === 0) {
        setIsLoading(false);
        return;
      }

      const reportIds = reports.map((r) => r.id);
      const today = new Date().toISOString().split("T")[0];

      const [{ data: onboardingData }, { data: trainingData }] = await Promise.all([
        supabase
          .from("employee_onboarding")
          .select(`
            id,
            employee_id,
            status,
            onboarding_progress(is_completed)
          `)
          .in("employee_id", reportIds),
        supabase
          .from("training_enrollments")
          .select("employee_id, status, due_date")
          .in("employee_id", reportIds),
      ]);

      const reportsWithProgress: DirectReport[] = reports.map((report) => {
        const onboarding = onboardingData?.find((o) => o.employee_id === report.id);
        const trainings = trainingData?.filter((t) => t.employee_id === report.id) || [];

        const onboardingItems = (onboarding?.onboarding_progress as { is_completed: boolean }[]) || [];
        const onboardingCompleted = onboardingItems.filter((p) => p.is_completed).length;
        const onboardingTotal = onboardingItems.length;
        const onboardingProgress = onboardingTotal > 0 ? Math.round((onboardingCompleted / onboardingTotal) * 100) : 0;

        const trainingCompleted = trainings.filter((t) => t.status === "completed").length;
        const trainingTotal = trainings.length;
        const trainingProgress = trainingTotal > 0 ? Math.round((trainingCompleted / trainingTotal) * 100) : 0;

        const overdueItems = trainings.filter(
          (t) => t.due_date && t.due_date < today && t.status !== "completed"
        ).length;

        return {
          ...report,
          onboardingProgress,
          onboardingCompleted,
          onboardingTotal,
          trainingProgress,
          trainingCompleted,
          trainingTotal,
          overdueItems,
        };
      });

      setDirectReports(reportsWithProgress);
    } catch (error) {
      console.error("Error fetching team progress:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployeeDetail = async (report: DirectReport) => {
    setIsLoadingDetail(true);
    setSelectedEmployee({ profile: report, onboarding: [], training: [] });

    try {
      // Fetch onboarding details
      const { data: onboardingData } = await supabase
        .from("employee_onboarding")
        .select(`
          id,
          onboarding_progress(
            id,
            is_completed,
            completed_at,
            notes,
            item:onboarding_template_items(title, description, category)
          )
        `)
        .eq("employee_id", report.id)
        .single();

      const onboardingItems: OnboardingItem[] = [];
      if (onboardingData?.onboarding_progress) {
        const progressItems = onboardingData.onboarding_progress as {
          id: string;
          is_completed: boolean;
          completed_at: string | null;
          notes: string | null;
          item: { title: string; description: string | null; category: string | null };
        }[];
        
        progressItems.forEach((p) => {
          onboardingItems.push({
            id: p.id,
            title: p.item?.title || "Unknown Item",
            description: p.item?.description || null,
            category: p.item?.category || null,
            is_completed: p.is_completed,
            completed_at: p.completed_at,
            notes: p.notes,
          });
        });
      }

      // Fetch training details
      const { data: trainingData } = await supabase
        .from("training_enrollments")
        .select(`
          id,
          status,
          progress_percent,
          due_date,
          started_at,
          completed_at,
          course:training_courses(title, category, is_mandatory)
        `)
        .eq("employee_id", report.id)
        .order("created_at", { ascending: false });

      const trainingItems: TrainingItem[] = (trainingData || []).map((t) => ({
        id: t.id,
        course_title: (t.course as { title: string })?.title || "Unknown Course",
        category: (t.course as { category: string })?.category || "general",
        status: t.status,
        progress_percent: t.progress_percent,
        due_date: t.due_date,
        started_at: t.started_at,
        completed_at: t.completed_at,
        is_mandatory: (t.course as { is_mandatory: boolean })?.is_mandatory || false,
      }));

      setSelectedEmployee({
        profile: report,
        onboarding: onboardingItems,
        training: trainingItems,
      });
    } catch (error) {
      console.error("Error fetching employee detail:", error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in_progress": return "secondary";
      case "overdue": return "destructive";
      default: return "outline";
    }
  };

  const filteredReports = directReports.filter((report) => {
    const matchesSearch =
      `${report.first_name} ${report.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.job_title?.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "overdue") return matchesSearch && report.overdueItems > 0;
    if (statusFilter === "complete") {
      return matchesSearch && report.trainingProgress === 100 && report.onboardingProgress === 100;
    }
    if (statusFilter === "in_progress") {
      return matchesSearch && (report.trainingProgress < 100 || report.onboardingProgress < 100);
    }
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (directReports.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Team Progress</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg">No direct reports found</p>
            <p className="text-sm">Team members will appear here once assigned to you.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalOverdue = directReports.reduce((sum, r) => sum + r.overdueItems, 0);
  const fullyComplete = directReports.filter(
    (r) => r.trainingProgress === 100 && r.onboardingProgress === 100
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Progress</h1>
            <p className="text-muted-foreground mt-1">
              Detailed breakdown of your direct reports' onboarding and training
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{directReports.length}</p>
                <p className="text-sm text-muted-foreground">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold">{fullyComplete}</p>
                <p className="text-sm text-muted-foreground">Fully Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{directReports.length - fullyComplete}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{totalOverdue}</p>
                <p className="text-sm text-muted-foreground">Overdue Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            <SelectItem value="complete">Fully Complete</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="overdue">Has Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Team Members List */}
      <div className="space-y-4">
        {filteredReports.map((report) => (
          <Card key={report.id} className="overflow-hidden">
            <Collapsible
              open={expandedIds.has(report.id)}
              onOpenChange={() => toggleExpanded(report.id)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {expandedIds.has(report.id) ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={report.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {report.first_name[0]}{report.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">
                          {report.first_name} {report.last_name}
                        </CardTitle>
                        <CardDescription>{report.job_title || "Employee"}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {report.overdueItems > 0 && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {report.overdueItems} overdue
                        </Badge>
                      )}
                      {report.trainingProgress === 100 && report.onboardingProgress === 100 ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Complete
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {Math.round((report.trainingProgress + report.onboardingProgress) / 2)}% overall
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-6">
                  <div className="grid md:grid-cols-2 gap-6 pl-9">
                    {/* Onboarding Progress */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Onboarding</span>
                      </div>
                      <Progress value={report.onboardingProgress} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        {report.onboardingCompleted} of {report.onboardingTotal} items completed
                      </p>
                    </div>

                    {/* Training Progress */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Training</span>
                      </div>
                      <Progress value={report.trainingProgress} className="h-2" />
                      <p className="text-sm text-muted-foreground">
                        {report.trainingCompleted} of {report.trainingTotal} courses completed
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pl-9">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchEmployeeDetail(report)}
                    >
                      View Full Details
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}

        {filteredReports.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No team members match your filters</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Employee Detail Dialog */}
      <Dialog
        open={!!selectedEmployee}
        onOpenChange={(open) => !open && setSelectedEmployee(null)}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedEmployee?.profile.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {selectedEmployee?.profile.first_name[0]}
                  {selectedEmployee?.profile.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl">
                  {selectedEmployee?.profile.first_name} {selectedEmployee?.profile.last_name}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedEmployee?.profile.job_title || "Employee"}
                </p>
              </div>
            </div>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="space-y-6 mt-4">
              {/* Onboarding Section */}
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Onboarding Checklist
                </h3>
                {selectedEmployee?.onboarding.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No onboarding items assigned</p>
                ) : (
                  <div className="space-y-2">
                    {selectedEmployee?.onboarding.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          item.is_completed ? "bg-muted/50" : "bg-background"
                        }`}
                      >
                        {item.is_completed ? (
                          <CircleCheck className="h-5 w-5 text-emerald-600 mt-0.5" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={item.is_completed ? "line-through text-muted-foreground" : "font-medium"}>
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          )}
                          {item.completed_at && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Completed {format(parseISO(item.completed_at), "MMM d, yyyy")}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">Note: {item.notes}</p>
                          )}
                        </div>
                        {item.category && (
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Training Section */}
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Training Courses
                </h3>
                {selectedEmployee?.training.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No training courses assigned</p>
                ) : (
                  <div className="space-y-3">
                    {selectedEmployee?.training.map((item) => {
                      const isOverdue = item.due_date && isPast(parseISO(item.due_date)) && item.status !== "completed";
                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-lg border ${
                            isOverdue ? "border-destructive/50 bg-destructive/5" : "bg-background"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{item.course_title}</p>
                                  {item.is_mandatory && (
                                    <Badge variant="destructive" className="text-xs">Mandatory</Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  <Badge variant={getStatusColor(item.status)}>{item.status}</Badge>
                                  <Badge variant="outline" className="text-xs">{item.category}</Badge>
                                </div>
                              </div>
                            </div>
                            {item.due_date && (
                              <div className={`flex items-center gap-1 text-sm ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                                <Calendar className="h-4 w-4" />
                                Due {format(parseISO(item.due_date), "MMM d")}
                              </div>
                            )}
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Progress</span>
                              <span>{item.progress_percent}%</span>
                            </div>
                            <Progress value={item.progress_percent} className="h-2" />
                          </div>
                          {(item.started_at || item.completed_at) && (
                            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                              {item.started_at && (
                                <span>Started: {format(parseISO(item.started_at), "MMM d, yyyy")}</span>
                              )}
                              {item.completed_at && (
                                <span>Completed: {format(parseISO(item.completed_at), "MMM d, yyyy")}</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

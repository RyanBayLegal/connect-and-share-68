import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  GraduationCap, 
  Clock, 
  Calendar, 
  CheckCircle, 
  BookOpen, 
  ExternalLink, 
  FileText, 
  Video, 
  Link as LinkIcon,
  Download,
  Award,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday, 
  parseISO,
  differenceInDays,
  getDay,
  isSameMonth
} from "date-fns";
import { cn } from "@/lib/utils";
import logo from "@/assets/bay-legal-logo.webp";

interface TrainingCourse {
  id: string;
  title: string;
  description: string | null;
  category: string;
  duration_hours: number | null;
  is_mandatory: boolean;
}

interface TrainingEnrollment {
  id: string;
  course_id: string;
  due_date: string | null;
  status: string;
  progress_percent: number;
  started_at: string | null;
  completed_at: string | null;
  course?: TrainingCourse;
}

interface TrainingMaterial {
  id: string;
  course_id: string;
  title: string;
  type: string;
  file_path: string | null;
  external_url: string | null;
  position: number;
}

const CATEGORIES = [
  { value: "compliance", label: "Compliance" },
  { value: "technical", label: "Technical" },
  { value: "soft_skills", label: "Soft Skills" },
  { value: "safety", label: "Safety" },
  { value: "general", label: "General" },
];

const getCategoryLabel = (category?: string) => {
  return CATEGORIES.find((c) => c.value === category)?.label || category || "General";
};

export default function Training() {
  const { profile } = useAuth();
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Course detail dialog
  const [selectedEnrollment, setSelectedEnrollment] = useState<TrainingEnrollment | null>(null);
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchEnrollments();
    }
  }, [profile?.id]);

  const fetchEnrollments = async () => {
    const { data } = await supabase
      .from("training_enrollments")
      .select("*, course:training_courses(*)")
      .eq("employee_id", profile?.id)
      .order("created_at", { ascending: false });
    
    setEnrollments((data || []) as unknown as TrainingEnrollment[]);
    setIsLoading(false);
  };

  const fetchMaterials = async (courseId: string) => {
    setIsLoadingMaterials(true);
    const { data } = await supabase
      .from("training_materials")
      .select("*")
      .eq("course_id", courseId)
      .order("position");
    
    setMaterials((data || []) as TrainingMaterial[]);
    setIsLoadingMaterials(false);
  };

  const openMaterial = async (material: TrainingMaterial) => {
    if (material.external_url) {
      window.open(material.external_url, "_blank");
      return;
    }

    if (material.file_path) {
      const { data } = await supabase.storage
        .from("training-materials")
        .createSignedUrl(material.file_path, 3600);

      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    }
  };

  const openCourseDetail = (enrollment: TrainingEnrollment) => {
    setSelectedEnrollment(enrollment);
    if (enrollment.course_id) {
      fetchMaterials(enrollment.course_id);
    }
  };

  const startCourse = async (enrollment: TrainingEnrollment) => {
    const { error } = await supabase
      .from("training_enrollments")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", enrollment.id);
    
    if (!error) {
      fetchEnrollments();
      if (selectedEnrollment?.id === enrollment.id) {
        setSelectedEnrollment({ ...enrollment, status: "in_progress" });
      }
    }
  };

  const completeCourse = async (enrollment: TrainingEnrollment) => {
    const { error } = await supabase
      .from("training_enrollments")
      .update({
        status: "completed",
        progress_percent: 100,
        completed_at: new Date().toISOString(),
      })
      .eq("id", enrollment.id);
    
    if (!error) {
      fetchEnrollments();
      setSelectedEnrollment(null);
    }
  };

  // Generate PDF certificate
  const generateCertificate = async (enrollment: TrainingEnrollment) => {
    if (!profile || !enrollment.completed_at) return;
    
    const html2pdf = (await import("html2pdf.js")).default;
    
    const container = document.createElement("div");
    container.style.width = "1000px";
    container.style.padding = "60px";
    container.style.textAlign = "center";
    container.style.fontFamily = "Georgia, serif";
    container.style.background = "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)";
    container.style.border = "8px double #1a365d";
    container.style.boxSizing = "border-box";
    
    container.innerHTML = `
      <div style="margin-bottom: 30px;">
        <img src="${logo}" style="height: 60px;" crossorigin="anonymous" />
      </div>
      <h1 style="font-size: 36px; color: #1a365d; margin: 20px 0; letter-spacing: 4px;">
        CERTIFICATE OF COMPLETION
      </h1>
      <div style="width: 100px; height: 2px; background: #1a365d; margin: 20px auto;"></div>
      <p style="font-size: 16px; color: #666; margin: 30px 0 10px;">
        This certifies that
      </p>
      <h2 style="font-size: 32px; color: #2d3748; margin: 10px 0 30px; font-style: italic;">
        ${profile.first_name} ${profile.last_name}
      </h2>
      <p style="font-size: 16px; color: #666; margin: 10px 0;">
        has successfully completed the training course
      </p>
      <h3 style="font-size: 26px; color: #1a365d; margin: 20px 0 30px;">
        ${enrollment.course?.title || "Training Course"}
      </h3>
      <div style="display: flex; justify-content: center; gap: 60px; margin: 30px 0;">
        <div>
          <p style="color: #999; font-size: 12px; margin-bottom: 4px;">CATEGORY</p>
          <p style="font-weight: bold; font-size: 14px; color: #333;">${getCategoryLabel(enrollment.course?.category)}</p>
        </div>
        ${enrollment.course?.duration_hours ? `
          <div>
            <p style="color: #999; font-size: 12px; margin-bottom: 4px;">DURATION</p>
            <p style="font-weight: bold; font-size: 14px; color: #333;">${enrollment.course.duration_hours} hours</p>
          </div>
        ` : ''}
        <div>
          <p style="color: #999; font-size: 12px; margin-bottom: 4px;">COMPLETED</p>
          <p style="font-weight: bold; font-size: 14px; color: #333;">${format(new Date(enrollment.completed_at), "MMMM d, yyyy")}</p>
        </div>
      </div>
      <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="font-size: 10px; color: #999; letter-spacing: 1px;">
          CERTIFICATE ID: ${enrollment.id.slice(0, 8).toUpperCase()}
        </p>
      </div>
    `;
    
    const opt = {
      margin: 0,
      filename: `Certificate_${enrollment.course?.title?.replace(/[^a-z0-9]/gi, "_") || "Training"}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "landscape" as const }
    };
    
    await html2pdf().set(opt).from(container).save();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in_progress": return "secondary";
      case "overdue": return "destructive";
      default: return "outline";
    }
  };

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case "video": return Video;
      case "link": return LinkIcon;
      default: return FileText;
    }
  };

  // Calendar helpers
  const getEnrollmentsForDate = (date: Date) => {
    return enrollments.filter(e => {
      if (e.due_date && isSameDay(parseISO(e.due_date), date)) {
        return true;
      }
      if (e.completed_at && isSameDay(parseISO(e.completed_at), date)) {
        return true;
      }
      return false;
    });
  };

  const getDueDateStatus = (enrollment: TrainingEnrollment) => {
    if (enrollment.status === "completed") return "completed";
    if (!enrollment.due_date) return "no_due_date";
    
    const dueDate = parseISO(enrollment.due_date);
    const today = new Date();
    const daysUntilDue = differenceInDays(dueDate, today);
    
    if (daysUntilDue < 0) return "overdue";
    if (daysUntilDue <= 7) return "due_soon";
    return "on_track";
  };

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-500";
      case "on_track": return "bg-blue-500";
      case "due_soon": return "bg-amber-500";
      case "overdue": return "bg-red-500";
      default: return "bg-muted-foreground";
    }
  };

  const getDatesWithEnrollments = () => {
    const dates = new Map<string, { statuses: string[] }>();
    
    enrollments.forEach(e => {
      const status = getDueDateStatus(e);
      
      if (e.due_date && e.status !== "completed") {
        const key = format(parseISO(e.due_date), "yyyy-MM-dd");
        const existing = dates.get(key) || { statuses: [] };
        existing.statuses.push(status);
        dates.set(key, existing);
      }
      
      if (e.completed_at) {
        const key = format(parseISO(e.completed_at), "yyyy-MM-dd");
        const existing = dates.get(key) || { statuses: [] };
        existing.statuses.push("completed");
        dates.set(key, existing);
      }
    });
    
    return dates;
  };

  const calendarDays = eachDayOfInterval({
    start: startOfMonth(calendarMonth),
    end: endOfMonth(calendarMonth),
  });

  const startDayOfWeek = getDay(startOfMonth(calendarMonth));
  const datesWithEnrollments = getDatesWithEnrollments();

  const activeEnrollments = enrollments.filter((e) => e.status !== "completed");
  const completedEnrollments = enrollments.filter((e) => e.status === "completed");

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Training</h1>
        <p className="text-muted-foreground mt-1">
          Track your assigned training courses and certifications
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeEnrollments.length}</p>
                <p className="text-sm text-muted-foreground">Active Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedEnrollments.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activeEnrollments.filter((e) => e.due_date).length}
                </p>
                <p className="text-sm text-muted-foreground">With Due Dates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeEnrollments.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedEnrollments.length})</TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarDays className="h-4 w-4 mr-1" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {activeEnrollments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No active training courses</p>
                <p className="text-sm">You're all caught up!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeEnrollments.map((enrollment) => (
                <Card
                  key={enrollment.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openCourseDetail(enrollment)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Badge variant={getStatusColor(enrollment.status)}>
                        {enrollment.status}
                      </Badge>
                      {enrollment.course?.is_mandatory && (
                        <Badge variant="destructive">Mandatory</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mt-2">
                      {enrollment.course?.title || "Unknown Course"}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {enrollment.course?.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {enrollment.course?.duration_hours && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {enrollment.course.duration_hours}h
                          </div>
                        )}
                        {enrollment.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(enrollment.due_date), "MMM d")}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{enrollment.progress_percent}%</span>
                        </div>
                        <Progress value={enrollment.progress_percent} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedEnrollments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No completed courses yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedEnrollments.map((enrollment) => (
                <Card key={enrollment.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      <Badge variant="default">Completed</Badge>
                    </div>
                    <CardTitle className="text-lg mt-2">
                      {enrollment.course?.title || "Unknown Course"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Completed on{" "}
                      {enrollment.completed_at
                        ? format(new Date(enrollment.completed_at), "MMMM d, yyyy")
                        : "Unknown date"}
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        generateCertificate(enrollment);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Certificate
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>{format(calendarMonth, "MMMM yyyy")}</CardTitle>
                <div className="flex gap-1">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}

                  {/* Calendar days */}
                  {calendarDays.map((day) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const dayData = datesWithEnrollments.get(dateKey);
                    const hasEvents = !!dayData;
                    const isSelected = selectedCalendarDate && isSameDay(day, selectedCalendarDate);

                    return (
                      <button
                        key={dateKey}
                        onClick={() => setSelectedCalendarDate(day)}
                        className={cn(
                          "aspect-square p-1 rounded-lg flex flex-col items-center justify-center relative transition-colors",
                          isToday(day) && "bg-primary/10 font-bold",
                          isSelected && "ring-2 ring-primary",
                          hasEvents && "cursor-pointer hover:bg-muted",
                          !hasEvents && "hover:bg-muted/50"
                        )}
                      >
                        <span className={cn(
                          "text-sm",
                          !isSameMonth(day, calendarMonth) && "text-muted-foreground/50"
                        )}>
                          {format(day, "d")}
                        </span>
                        {hasEvents && (
                          <div className="flex gap-0.5 mt-0.5">
                            {dayData.statuses.slice(0, 3).map((status, i) => (
                              <div 
                                key={i} 
                                className={cn("w-1.5 h-1.5 rounded-full", getStatusDotColor(status))} 
                              />
                            ))}
                            {dayData.statuses.length > 3 && (
                              <span className="text-[8px] text-muted-foreground">+{dayData.statuses.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Completed</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>On Track</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Due Soon</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Overdue</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected date details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedCalendarDate 
                    ? format(selectedCalendarDate, "EEEE, MMMM d")
                    : "Select a date"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!selectedCalendarDate ? (
                  <p className="text-sm text-muted-foreground">
                    Click on a date to see training events
                  </p>
                ) : (
                  <div className="space-y-3">
                    {getEnrollmentsForDate(selectedCalendarDate).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No training events on this date
                      </p>
                    ) : (
                      getEnrollmentsForDate(selectedCalendarDate).map((enrollment) => {
                        const isDue = enrollment.due_date && isSameDay(parseISO(enrollment.due_date), selectedCalendarDate);
                        const isCompleted = enrollment.completed_at && isSameDay(parseISO(enrollment.completed_at), selectedCalendarDate);
                        const status = getDueDateStatus(enrollment);

                        return (
                          <div 
                            key={enrollment.id} 
                            className="p-3 border rounded-lg space-y-2"
                          >
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium text-sm">
                                {enrollment.course?.title}
                              </h4>
                              <div className={cn(
                                "w-2 h-2 rounded-full mt-1.5",
                                getStatusDotColor(status)
                              )} />
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              {isDue && (
                                <p>Due: {format(parseISO(enrollment.due_date!), "MMM d, yyyy")}</p>
                              )}
                              {isCompleted && (
                                <p>Completed: {format(parseISO(enrollment.completed_at!), "MMM d, yyyy")}</p>
                              )}
                              <p className="capitalize">Status: {enrollment.status.replace("_", " ")}</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full mt-2"
                              onClick={() => openCourseDetail(enrollment)}
                            >
                              View Course
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Course Detail Dialog */}
      <Dialog open={!!selectedEnrollment} onOpenChange={(open) => !open && setSelectedEnrollment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedEnrollment?.course?.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <p className="text-muted-foreground">
                {selectedEnrollment?.course?.description || "No description available"}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline">
                  {CATEGORIES.find((c) => c.value === selectedEnrollment?.course?.category)?.label ||
                    selectedEnrollment?.course?.category}
                </Badge>
                {selectedEnrollment?.course?.duration_hours && (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    {selectedEnrollment.course.duration_hours} hours
                  </Badge>
                )}
                {selectedEnrollment?.due_date && (
                  <Badge variant="secondary">
                    <Calendar className="h-3 w-3 mr-1" />
                    Due {format(new Date(selectedEnrollment.due_date), "MMM d, yyyy")}
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-3">Course Materials</h4>
              {isLoadingMaterials ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : materials.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No materials available for this course
                </p>
              ) : (
                <div className="space-y-2">
                  {materials.map((material) => {
                    const Icon = getMaterialIcon(material.type);
                    return (
                      <div
                        key={material.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <span>{material.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {material.type}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openMaterial(material)}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          {material.file_path ? "Download" : "Open"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              {selectedEnrollment?.status === "completed" && (
                <Button 
                  variant="outline"
                  onClick={() => selectedEnrollment && generateCertificate(selectedEnrollment)}
                >
                  <Award className="h-4 w-4 mr-2" />
                  Download Certificate
                </Button>
              )}
              {selectedEnrollment?.status === "assigned" && (
                <Button onClick={() => selectedEnrollment && startCourse(selectedEnrollment)}>
                  Start Course
                </Button>
              )}
              {selectedEnrollment?.status === "in_progress" && (
                <Button onClick={() => selectedEnrollment && completeCourse(selectedEnrollment)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Complete
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

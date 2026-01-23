import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GraduationCap, Clock, Calendar, CheckCircle, BookOpen, ExternalLink, FileText, Video, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";

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

export default function Training() {
  const { profile } = useAuth();
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Course detail dialog
  const [selectedEnrollment, setSelectedEnrollment] = useState<TrainingEnrollment | null>(null);
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);

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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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

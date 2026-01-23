import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, GraduationCap, Users, Clock, BookOpen, UserPlus, UsersRound, FileStack } from "lucide-react";
import { toast } from "sonner";
import type { Department, Profile } from "@/types/database";
import { ManagerSelect } from "@/components/directory/ManagerSelect";
import { TrainingMaterialsDialog } from "./TrainingMaterialsDialog";

interface TrainingCourse {
  id: string;
  title: string;
  description: string | null;
  category: string;
  duration_hours: number | null;
  is_mandatory: boolean;
  department_id: string | null;
  is_active: boolean;
  created_at: string;
}

interface TrainingEnrollment {
  id: string;
  course_id: string;
  employee_id: string;
  due_date: string | null;
  status: string;
  progress_percent: number;
  employee?: Profile;
}

const CATEGORIES = [
  { value: "compliance", label: "Compliance" },
  { value: "technical", label: "Technical" },
  { value: "soft_skills", label: "Soft Skills" },
  { value: "safety", label: "Safety" },
  { value: "general", label: "General" },
];

export function AdminTraining() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Course dialog state
  const [isCourseOpen, setIsCourseOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TrainingCourse | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [courseCategory, setCourseCategory] = useState("general");
  const [courseDuration, setCourseDuration] = useState("");
  const [courseIsMandatory, setCourseIsMandatory] = useState(false);
  const [courseDeptId, setCourseDeptId] = useState<string | null>(null);
  const [courseIsActive, setCourseIsActive] = useState(true);
  
  // Enrollment dialog state
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [enrollCourseId, setEnrollCourseId] = useState<string | null>(null);
  const [enrollEmployeeId, setEnrollEmployeeId] = useState<string | null>(null);
  const [enrollDueDate, setEnrollDueDate] = useState("");
  
  // Enrollments view
  const [viewingCourseId, setViewingCourseId] = useState<string | null>(null);
  const [courseEnrollments, setCourseEnrollments] = useState<TrainingEnrollment[]>([]);
  
  // Bulk enrollment state
  const [isBulkEnrollOpen, setIsBulkEnrollOpen] = useState(false);
  const [bulkCourseId, setBulkCourseId] = useState<string | null>(null);
  const [bulkDepartmentId, setBulkDepartmentId] = useState<string | null>(null);
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [bulkPreviewCount, setBulkPreviewCount] = useState(0);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  
  // Materials dialog state
  const [isMaterialsOpen, setIsMaterialsOpen] = useState(false);
  const [materialsCourseId, setMaterialsCourseId] = useState<string | null>(null);
  const [materialsCourseTitle, setMaterialsCourseTitle] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openMaterialsDialog = (course: TrainingCourse) => {
    setMaterialsCourseId(course.id);
    setMaterialsCourseTitle(course.title);
    setIsMaterialsOpen(true);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: coursesData }, { data: deptData }, { data: employeesData }] = await Promise.all([
      supabase.from("training_courses").select("*").order("title"),
      supabase.from("departments").select("*").order("name"),
      supabase.from("profiles").select("*").eq("is_active", true).order("first_name"),
    ]);
    
    setCourses((coursesData || []) as TrainingCourse[]);
    setDepartments((deptData || []) as Department[]);
    setEmployees((employeesData || []) as Profile[]);
    setIsLoading(false);
  };

  const fetchEnrollments = async (courseId: string) => {
    const { data } = await supabase
      .from("training_enrollments")
      .select("*")
      .eq("course_id", courseId);
    
    // Map employee data
    const enrollmentsWithEmployees = (data || []).map((enrollment) => ({
      ...enrollment,
      employee: employees.find((e) => e.id === enrollment.employee_id),
    }));
    
    setCourseEnrollments(enrollmentsWithEmployees as TrainingEnrollment[]);
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        title: courseTitle,
        description: courseDescription || null,
        category: courseCategory,
        duration_hours: courseDuration ? parseFloat(courseDuration) : null,
        is_mandatory: courseIsMandatory,
        department_id: courseDeptId,
        is_active: courseIsActive,
        created_by: profile?.id,
      };

      if (editingCourse) {
        const { error } = await supabase
          .from("training_courses")
          .update(payload)
          .eq("id", editingCourse.id);
        if (error) throw error;
        toast.success("Course updated!");
      } else {
        const { error } = await supabase
          .from("training_courses")
          .insert(payload);
        if (error) throw error;
        toast.success("Course created!");
      }
      
      setIsCourseOpen(false);
      resetCourseForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save course");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollCourseId || !enrollEmployeeId) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("training_enrollments").insert({
        course_id: enrollCourseId,
        employee_id: enrollEmployeeId,
        assigned_by: profile?.id,
        due_date: enrollDueDate || null,
        status: "assigned",
      });
      
      if (error) throw error;
      toast.success("Employee enrolled!");
      setIsEnrollOpen(false);
      resetEnrollForm();
      if (viewingCourseId) fetchEnrollments(viewingCourseId);
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Employee is already enrolled in this course");
      } else {
        toast.error(error.message || "Failed to enroll employee");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCourse = async (course: TrainingCourse) => {
    if (!confirm("Delete this course and all enrollments?")) return;
    
    const { error } = await supabase
      .from("training_courses")
      .delete()
      .eq("id", course.id);
    
    if (error) {
      toast.error("Failed to delete course");
    } else {
      toast.success("Course deleted");
      fetchData();
    }
  };

  const removeEnrollment = async (enrollment: TrainingEnrollment) => {
    if (!confirm("Remove this enrollment?")) return;
    
    const { error } = await supabase
      .from("training_enrollments")
      .delete()
      .eq("id", enrollment.id);
    
    if (error) {
      toast.error("Failed to remove enrollment");
    } else {
      toast.success("Enrollment removed");
      if (viewingCourseId) fetchEnrollments(viewingCourseId);
    }
  };

  const resetCourseForm = () => {
    setCourseTitle("");
    setCourseDescription("");
    setCourseCategory("general");
    setCourseDuration("");
    setCourseIsMandatory(false);
    setCourseDeptId(null);
    setCourseIsActive(true);
    setEditingCourse(null);
  };

  const resetEnrollForm = () => {
    setEnrollCourseId(null);
    setEnrollEmployeeId(null);
    setEnrollDueDate("");
  };

  const openEditCourse = (course: TrainingCourse) => {
    setEditingCourse(course);
    setCourseTitle(course.title);
    setCourseDescription(course.description || "");
    setCourseCategory(course.category);
    setCourseDuration(course.duration_hours?.toString() || "");
    setCourseIsMandatory(course.is_mandatory);
    setCourseDeptId(course.department_id);
    setCourseIsActive(course.is_active);
    setIsCourseOpen(true);
  };

  const openEnrollDialog = (courseId: string) => {
    setEnrollCourseId(courseId);
    setIsEnrollOpen(true);
  };

  const openViewEnrollments = (courseId: string) => {
    setViewingCourseId(courseId);
    fetchEnrollments(courseId);
  };

  const openBulkEnroll = (courseId: string) => {
    setBulkCourseId(courseId);
    setBulkDepartmentId(null);
    setBulkDueDate("");
    setBulkPreviewCount(0);
    setIsBulkEnrollOpen(true);
    calculateBulkPreview(courseId, null);
  };

  const calculateBulkPreview = async (courseId: string, departmentId: string | null) => {
    setIsBulkLoading(true);
    try {
      // Get employees to enroll
      let query = supabase.from("profiles").select("id").eq("is_active", true);
      if (departmentId) {
        query = query.eq("department_id", departmentId);
      }
      const { data: employeeList } = await query;

      // Get already enrolled employees
      const { data: existing } = await supabase
        .from("training_enrollments")
        .select("employee_id")
        .eq("course_id", courseId);

      const existingIds = new Set(existing?.map((e) => e.employee_id) || []);
      const toEnroll = employeeList?.filter((e) => !existingIds.has(e.id)) || [];
      
      setBulkPreviewCount(toEnroll.length);
    } catch (error) {
      console.error("Error calculating bulk preview:", error);
      setBulkPreviewCount(0);
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleBulkEnroll = async () => {
    if (!bulkCourseId || bulkPreviewCount === 0) return;
    setIsSubmitting(true);

    try {
      // Get employees to enroll
      let query = supabase.from("profiles").select("id").eq("is_active", true);
      if (bulkDepartmentId) {
        query = query.eq("department_id", bulkDepartmentId);
      }
      const { data: employeeList } = await query;

      // Get already enrolled employees
      const { data: existing } = await supabase
        .from("training_enrollments")
        .select("employee_id")
        .eq("course_id", bulkCourseId);

      const existingIds = new Set(existing?.map((e) => e.employee_id) || []);
      const toEnroll = employeeList?.filter((e) => !existingIds.has(e.id)) || [];

      if (toEnroll.length === 0) {
        toast.info("All employees are already enrolled");
        return;
      }

      // Insert all at once
      const enrollments = toEnroll.map((e) => ({
        course_id: bulkCourseId,
        employee_id: e.id,
        assigned_by: profile?.id,
        due_date: bulkDueDate || null,
        status: "assigned",
      }));

      const { error } = await supabase.from("training_enrollments").insert(enrollments);
      
      if (error) throw error;
      
      toast.success(`Successfully enrolled ${toEnroll.length} employee${toEnroll.length !== 1 ? "s" : ""}`);
      setIsBulkEnrollOpen(false);
      if (viewingCourseId === bulkCourseId) {
        fetchEnrollments(bulkCourseId);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to bulk enroll employees");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDepartmentChange = (deptId: string) => {
    const newDeptId = deptId === "all" ? null : deptId;
    setBulkDepartmentId(newDeptId);
    if (bulkCourseId) {
      calculateBulkPreview(bulkCourseId, newDeptId);
    }
  };

  const getDeptName = (deptId: string | null) => {
    if (!deptId) return "All";
    const dept = departments.find((d) => d.id === deptId);
    return dept?.name || "Unknown";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "in_progress": return "secondary";
      case "overdue": return "destructive";
      default: return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Training Courses</CardTitle>
            <CardDescription>Manage training programs and employee enrollments</CardDescription>
          </div>
          <Dialog
            open={isCourseOpen}
            onOpenChange={(open) => {
              setIsCourseOpen(open);
              if (!open) resetCourseForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Course
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingCourse ? "Edit" : "Create"} Training Course</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCourseSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g., Workplace Safety Training"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={courseDescription}
                    onChange={(e) => setCourseDescription(e.target.value)}
                    placeholder="Course overview and objectives"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={courseCategory} onValueChange={setCourseCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (hours)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      value={courseDuration}
                      onChange={(e) => setCourseDuration(e.target.value)}
                      placeholder="e.g., 2"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Department (optional)</Label>
                  <Select
                    value={courseDeptId || "all"}
                    onValueChange={(v) => setCourseDeptId(v === "all" ? null : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={courseIsMandatory}
                      onCheckedChange={setCourseIsMandatory}
                    />
                    <Label>Mandatory training</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={courseIsActive}
                      onCheckedChange={setCourseIsActive}
                    />
                    <Label>Active</Label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCourseOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No training courses yet</p>
              <p className="text-sm">Create a course to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{course.title}</div>
                          {course.is_mandatory && (
                            <Badge variant="destructive" className="text-xs">Mandatory</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORIES.find((c) => c.value === course.category)?.label || course.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {course.duration_hours ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {course.duration_hours}h
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{getDeptName(course.department_id)}</TableCell>
                    <TableCell>
                      <Badge variant={course.is_active ? "default" : "secondary"}>
                        {course.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Manage materials"
                          onClick={() => openMaterialsDialog(course)}
                        >
                          <FileStack className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Enroll employee"
                          onClick={() => openEnrollDialog(course.id)}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Bulk enroll department"
                          onClick={() => openBulkEnroll(course.id)}
                        >
                          <UsersRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View enrollments"
                          onClick={() => openViewEnrollments(course.id)}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditCourse(course)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteCourse(course)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Enrollment Dialog */}
      <Dialog
        open={isEnrollOpen}
        onOpenChange={(open) => {
          setIsEnrollOpen(open);
          if (!open) resetEnrollForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEnrollSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <ManagerSelect
                value={enrollEmployeeId}
                onValueChange={setEnrollEmployeeId}
                employees={employees}
                placeholder="Select employee"
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                value={enrollDueDate}
                onChange={(e) => setEnrollDueDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEnrollOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !enrollEmployeeId}>
                {isSubmitting ? "Enrolling..." : "Enroll"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Enrollments Dialog */}
      <Dialog open={!!viewingCourseId} onOpenChange={(open) => !open && setViewingCourseId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Course Enrollments: {courses.find((c) => c.id === viewingCourseId)?.title}
            </DialogTitle>
          </DialogHeader>
          {courseEnrollments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No enrollments yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseEnrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      {enrollment.employee
                        ? `${enrollment.employee.first_name} ${enrollment.employee.last_name}`
                        : "Unknown"}
                    </TableCell>
                    <TableCell>
                      {enrollment.due_date
                        ? new Date(enrollment.due_date).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(enrollment.status)}>
                        {enrollment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{enrollment.progress_percent}%</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEnrollment(enrollment)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Enrollment Dialog */}
      <Dialog
        open={isBulkEnrollOpen}
        onOpenChange={(open) => {
          setIsBulkEnrollOpen(open);
          if (!open) {
            setBulkCourseId(null);
            setBulkDepartmentId(null);
            setBulkDueDate("");
            setBulkPreviewCount(0);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5" />
              Bulk Enroll Employees
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Course</Label>
              <Input
                value={courses.find((c) => c.id === bulkCourseId)?.title || ""}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Select Department</Label>
              <Select
                value={bulkDepartmentId || "all"}
                onValueChange={handleBulkDepartmentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                value={bulkDueDate}
                onChange={(e) => setBulkDueDate(e.target.value)}
              />
            </div>
            <div className="p-3 bg-muted rounded-lg">
              {isBulkLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                  Calculating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>{bulkPreviewCount}</strong> employee{bulkPreviewCount !== 1 ? "s" : ""} will be enrolled
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Excludes employees already enrolled in this course
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBulkEnrollOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkEnroll}
                disabled={isSubmitting || bulkPreviewCount === 0 || isBulkLoading}
              >
                {isSubmitting ? "Enrolling..." : `Enroll ${bulkPreviewCount} Employee${bulkPreviewCount !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Training Materials Dialog */}
      <TrainingMaterialsDialog
        isOpen={isMaterialsOpen}
        onClose={() => {
          setIsMaterialsOpen(false);
          setMaterialsCourseId(null);
          setMaterialsCourseTitle("");
        }}
        courseId={materialsCourseId}
        courseTitle={materialsCourseTitle}
      />
    </div>
  );
}

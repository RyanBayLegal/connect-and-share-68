import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Profile, Department } from "@/types/database";

interface Project {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  created_by: string | null;
  is_archived: boolean;
  created_at: string;
  department?: Department;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  project_id: string;
  assignee_id: string | null;
  created_by: string | null;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
  position: number;
  assignee?: Profile;
}

const statusConfig = {
  todo: { label: "To Do", icon: Clock, color: "bg-slate-500" },
  in_progress: { label: "In Progress", icon: AlertCircle, color: "bg-blue-500" },
  review: { label: "In Review", icon: Clock, color: "bg-amber-500" },
  done: { label: "Done", icon: CheckCircle2, color: "bg-green-500" },
};

const priorityConfig = {
  low: { label: "Low", color: "secondary" },
  medium: { label: "Medium", color: "default" },
  high: { label: "High", color: "destructive" },
  urgent: { label: "Urgent", color: "destructive" },
};

export default function Tasks() {
  const { profile, isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // New project dialog
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectDepartment, setProjectDepartment] = useState("");

  // New task dialog
  const [isTaskOpen, setIsTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState<Task["priority"]>("medium");
  const [taskDueDate, setTaskDueDate] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchTasks(selectedProject.id);
    }
  }, [selectedProject]);

  const fetchData = async () => {
    try {
      const [{ data: projectsData }, { data: employeesData }, { data: deptsData }] =
        await Promise.all([
          supabase.from("projects").select("*, department:departments(*)").eq("is_archived", false).order("name"),
          supabase.from("profiles").select("*").eq("is_active", true).order("first_name"),
          supabase.from("departments").select("*").order("name"),
        ]);

      setProjects((projectsData as unknown as Project[]) || []);
      setEmployees((employeesData as unknown as Profile[]) || []);
      setDepartments((deptsData as unknown as Department[]) || []);

      if (projectsData && projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0] as unknown as Project);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTasks = async (projectId: string) => {
    const { data } = await supabase
      .from("tasks")
      .select("*, assignee:profiles(*)")
      .eq("project_id", projectId)
      .order("position");
    setTasks((data as unknown as Task[]) || []);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: projectName,
          description: projectDescription || null,
          department_id: projectDepartment || null,
          created_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Project created!");
      setIsProjectOpen(false);
      setProjectName("");
      setProjectDescription("");
      setProjectDepartment("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create project");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedProject) return;

    try {
      const { error } = await supabase.from("tasks").insert({
        title: taskTitle,
        description: taskDescription || null,
        project_id: selectedProject.id,
        assignee_id: taskAssignee || null,
        created_by: profile.id,
        priority: taskPriority,
        due_date: taskDueDate || null,
        position: tasks.length,
      });

      if (error) throw error;

      toast.success("Task created!");
      setIsTaskOpen(false);
      setTaskTitle("");
      setTaskDescription("");
      setTaskAssignee("");
      setTaskPriority("medium");
      setTaskDueDate("");
      fetchTasks(selectedProject.id);
    } catch (error: any) {
      toast.error(error.message || "Failed to create task");
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task["status"]) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);

      if (error) throw error;
      
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (error: any) {
      toast.error("Failed to update task");
    }
  };

  const getTasksByStatus = (status: Task["status"]) =>
    tasks.filter((t) => t.status === status);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage projects and track work
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isProjectOpen} onOpenChange={setIsProjectOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderKanban className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={projectDepartment} onValueChange={setProjectDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Departments</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsProjectOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {selectedProject && (
            <Dialog open={isTaskOpen} onOpenChange={setIsTaskOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Assignee</Label>
                      <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {employees.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.first_name} {e.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={taskPriority}
                        onValueChange={(v) => setTaskPriority(v as Task["priority"])}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsTaskOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Project Tabs */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No projects yet</h3>
            <p className="text-muted-foreground">Create a project to start managing tasks</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Tabs
            value={selectedProject?.id}
            onValueChange={(id) => {
              const proj = projects.find((p) => p.id === id);
              if (proj) setSelectedProject(proj);
            }}
          >
            <TabsList className="flex-wrap h-auto gap-1">
              {projects.map((proj) => (
                <TabsTrigger key={proj.id} value={proj.id} className="gap-2">
                  <FolderKanban className="h-4 w-4" />
                  {proj.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Kanban Board */}
          {selectedProject && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {(Object.keys(statusConfig) as Task["status"][]).map((status) => {
                const config = statusConfig[status];
                const columnTasks = getTasksByStatus(status);

                return (
                  <div key={status} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${config.color}`} />
                      <h3 className="font-semibold">{config.label}</h3>
                      <Badge variant="secondary">{columnTasks.length}</Badge>
                    </div>

                    <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-muted/50">
                      {columnTasks.map((task) => (
                        <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-medium text-sm">{task.title}</h4>
                              <Select
                                value={task.status}
                                onValueChange={(v) => handleStatusChange(task.id, v as Task["status"])}
                              >
                                <SelectTrigger className="h-6 w-6 p-0 border-0">
                                  <MoreVertical className="h-4 w-4" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(statusConfig) as Task["status"][]).map((s) => (
                                    <SelectItem key={s} value={s}>
                                      {statusConfig[s].label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={priorityConfig[task.priority].color as any}
                                  className="text-xs"
                                >
                                  {priorityConfig[task.priority].label}
                                </Badge>
                                {task.due_date && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(task.due_date), "MMM d")}
                                  </span>
                                )}
                              </div>

                              {task.assignee && (
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={task.assignee.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {task.assignee.first_name[0]}
                                    {task.assignee.last_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

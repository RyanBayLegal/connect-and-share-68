import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, FolderKanban } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn } from "@/components/tasks/KanbanColumn";
import { TaskCard } from "@/components/tasks/TaskCard";
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

const statuses: Task["status"][] = ["todo", "in_progress", "review", "done"];

export default function Tasks() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      const { error } = await supabase
        .from("projects")
        .insert({
          name: projectName,
          description: projectDescription || null,
          department_id: projectDepartment === "none" ? null : projectDepartment || null,
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
      const maxPosition = tasks.filter(t => t.status === "todo").length;
      const { error } = await supabase.from("tasks").insert({
        title: taskTitle,
        description: taskDescription || null,
        project_id: selectedProject.id,
        assignee_id: taskAssignee === "none" ? null : taskAssignee || null,
        created_by: profile.id,
        priority: taskPriority,
        due_date: taskDueDate || null,
        position: maxPosition,
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
      // Get max position in new column
      const tasksInColumn = tasks.filter(t => t.status === newStatus);
      const newPosition = tasksInColumn.length;

      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus, position: newPosition })
        .eq("id", taskId);

      if (error) throw error;
      
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus, position: newPosition } : t))
      );
    } catch (error: any) {
      toast.error("Failed to update task");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    // Check if dropping on a column
    if (statuses.includes(overId as Task["status"])) {
      if (activeTask.status !== overId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeId ? { ...t, status: overId as Task["status"] } : t
          )
        );
      }
      return;
    }

    // Check if dropping on another task
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && activeTask.status !== overTask.status) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, status: overTask.status } : t
        )
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    let newStatus = activeTask.status;
    let newTasks = [...tasks];

    // Determine new status
    if (statuses.includes(overId as Task["status"])) {
      newStatus = overId as Task["status"];
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    // Get tasks in the target column
    const columnTasks = newTasks.filter((t) => t.status === newStatus && t.id !== activeId);
    
    // Find index to insert at
    let insertIndex = columnTasks.length;
    if (!statuses.includes(overId as Task["status"])) {
      const overTask = newTasks.find((t) => t.id === overId);
      if (overTask) {
        insertIndex = columnTasks.findIndex((t) => t.id === overId);
        if (insertIndex === -1) insertIndex = columnTasks.length;
      }
    }

    // Update positions
    columnTasks.splice(insertIndex, 0, { ...activeTask, status: newStatus });
    const updatedColumnTasks = columnTasks.map((t, idx) => ({ ...t, position: idx }));

    // Merge back
    const otherTasks = newTasks.filter((t) => t.status !== newStatus && t.id !== activeId);
    newTasks = [...otherTasks, ...updatedColumnTasks];

    setTasks(newTasks);

    // Persist changes
    try {
      const updates = updatedColumnTasks.map((t) => ({
        id: t.id,
        status: t.status,
        position: t.position,
      }));

      for (const update of updates) {
        await supabase
          .from("tasks")
          .update({ status: update.status, position: update.position })
          .eq("id", update.id);
      }
    } catch (error) {
      console.error("Error updating positions:", error);
      fetchTasks(selectedProject!.id);
    }
  };

  const getTasksByStatus = (status: Task["status"]) =>
    tasks.filter((t) => t.status === status).sort((a, b) => a.position - b.position);

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
                      <SelectItem value="none">All Departments</SelectItem>
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
                          <SelectItem value="none">Unassigned</SelectItem>
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

          {/* Kanban Board with Drag and Drop */}
          {selectedProject && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statuses.map((status) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    tasks={getTasksByStatus(status)}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeTask ? (
                  <div className="opacity-80">
                    <TaskCard task={activeTask} onStatusChange={() => {}} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </>
      )}
    </div>
  );
}

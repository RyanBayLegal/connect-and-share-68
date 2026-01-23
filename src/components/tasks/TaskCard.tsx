import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, MoreVertical, GripVertical, AlertTriangle } from "lucide-react";
import { format, isPast, isToday, isTomorrow, addDays, isWithinInterval } from "date-fns";
import type { Profile } from "@/types/database";

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
  todo: { label: "To Do" },
  in_progress: { label: "In Progress" },
  review: { label: "In Review" },
  done: { label: "Done" },
};

const priorityConfig = {
  low: { label: "Low", color: "secondary" },
  medium: { label: "Medium", color: "default" },
  high: { label: "High", color: "destructive" },
  urgent: { label: "Urgent", color: "destructive" },
};

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, newStatus: Task["status"]) => void;
}

export function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Check due date status
  const getDueDateStatus = () => {
    if (!task.due_date || task.status === "done") return null;
    
    const dueDate = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isPast(dueDate) && !isToday(dueDate)) {
      return "overdue";
    }
    if (isToday(dueDate)) {
      return "today";
    }
    if (isTomorrow(dueDate)) {
      return "tomorrow";
    }
    if (isWithinInterval(dueDate, { start: today, end: addDays(today, 3) })) {
      return "soon";
    }
    return null;
  };

  const dueDateStatus = getDueDateStatus();

  const getDueDateClasses = () => {
    switch (dueDateStatus) {
      case "overdue":
        return "text-destructive font-medium";
      case "today":
        return "text-amber-600 dark:text-amber-500 font-medium";
      case "tomorrow":
        return "text-amber-500 dark:text-amber-400";
      case "soon":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-grab active:cursor-grabbing transition-all ${
        isDragging 
          ? "opacity-50 shadow-lg ring-2 ring-primary scale-105" 
          : "hover:shadow-md"
      } ${dueDateStatus === "overdue" ? "border-destructive/50 bg-destructive/5" : ""}`}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm truncate">{task.title}</h4>
              <Select
                value={task.status}
                onValueChange={(v) => onStatusChange(task.id, v as Task["status"])}
              >
                <SelectTrigger className="h-6 w-6 p-0 border-0 shrink-0">
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
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant={priorityConfig[task.priority].color as any}
                  className="text-xs"
                >
                  {priorityConfig[task.priority].label}
                </Badge>
                {task.due_date && (
                  <span className={`text-xs flex items-center gap-1 ${getDueDateClasses()}`}>
                    {dueDateStatus === "overdue" && (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    <Calendar className="h-3 w-3" />
                    {dueDateStatus === "overdue" && "Overdue: "}
                    {dueDateStatus === "today" && "Due Today"}
                    {dueDateStatus === "tomorrow" && "Due Tomorrow"}
                    {(!dueDateStatus || dueDateStatus === "soon") && format(new Date(task.due_date), "MMM d")}
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

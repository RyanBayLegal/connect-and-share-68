import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./TaskCard";
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";
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
  todo: { label: "To Do", icon: Clock, color: "bg-slate-500" },
  in_progress: { label: "In Progress", icon: AlertCircle, color: "bg-blue-500" },
  review: { label: "In Review", icon: Clock, color: "bg-amber-500" },
  done: { label: "Done", icon: CheckCircle2, color: "bg-green-500" },
};

interface KanbanColumnProps {
  status: Task["status"];
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: Task["status"]) => void;
}

export function KanbanColumn({ status, tasks, onStatusChange }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const config = statusConfig[status];
  const taskIds = tasks.map((t) => t.id);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${config.color}`} />
        <h3 className="font-semibold">{config.label}</h3>
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>

      <div
        ref={setNodeRef}
        className={`space-y-2 min-h-[200px] p-2 rounded-lg transition-colors ${
          isOver ? "bg-primary/10 ring-2 ring-primary/20" : "bg-muted/50"
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

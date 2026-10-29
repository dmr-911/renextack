"use client";

import { Trash2 } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { deleteTaskAction, updateTaskAction } from "@/features/projects/actions";
import type { TaskPriority, TaskStatus } from "../schema";

const priorityBadge = { high: "danger", medium: "warning", low: "neutral" } as const;

export interface TaskRowData {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  overdue: boolean;
}

/** One task with optimistic status changes: the UI updates instantly and rolls back if the server refuses. */
export function TaskRow({ task, editable }: { task: TaskRowData; editable: boolean }) {
  const [pending, startTransition] = useTransition();
  const [status, setOptimisticStatus] = useOptimistic(task.status);

  const changeStatus = (next: TaskStatus) =>
    startTransition(async () => {
      setOptimisticStatus(next);
      await updateTaskAction(task.id, { status: next });
    });

  const remove = () =>
    startTransition(async () => {
      await deleteTaskAction(task.id);
    });

  const done = status === "done";
  return (
    <li className={cn("flex flex-wrap items-center gap-3 px-4 py-3", pending && "opacity-70")}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-input accent-primary"
        checked={done}
        disabled={!editable}
        onChange={(event) => changeStatus(event.target.checked ? "done" : "todo")}
        aria-label={done ? `Mark “${task.title}” as not done` : `Mark “${task.title}” as done`}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", done && "text-muted-foreground line-through")}>{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={priorityBadge[task.priority]}>{task.priority}</Badge>
          {task.dueDate ? (
            <span className={cn(task.overdue && !done && "font-medium text-destructive")}>
              {task.overdue && !done ? "Overdue · " : "Due "}
              {task.dueDate}
            </span>
          ) : null}
        </div>
      </div>
      {editable ? (
        <div className="flex items-center gap-2">
          <Select
            aria-label={`Status of “${task.title}”`}
            value={status}
            onChange={(event) => changeStatus(event.target.value as TaskStatus)}
            className="h-8 w-32 text-xs"
          >
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </Select>
          <Button variant="ghost" size="icon" onClick={remove} aria-label={`Delete “${task.title}”`}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <Badge>{status.replace("_", " ")}</Badge>
      )}
    </li>
  );
}

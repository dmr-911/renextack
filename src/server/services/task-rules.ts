import type { TaskStatus } from "@/features/tasks/schema";

/**
 * Pure business rules for tasks, kept free of I/O so they can be unit tested.
 */

/**
 * Decides the `completedAt` value after a status change:
 *  - entering `done` stamps the time (keeping an earlier stamp if it was already done)
 *  - leaving `done` clears it
 *  - no status change keeps whatever was there
 */
export function completionTimestamp(
  existing: { status: TaskStatus; completedAt: Date | null },
  nextStatus: TaskStatus | undefined,
  now: Date,
): Date | null {
  if (!nextStatus || nextStatus === existing.status) return existing.completedAt;
  return nextStatus === "done" ? now : null;
}

/** A task is overdue when it has a due date in the past and isn't done. */
export function isOverdue(item: { status: TaskStatus; dueDate: Date | null }, now: Date): boolean {
  return item.status !== "done" && item.dueDate !== null && item.dueDate.getTime() < startOfDay(now).getTime();
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

/** Start of the ISO week (Monday 00:00 UTC) containing `date`. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const offset = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - offset);
  return day;
}

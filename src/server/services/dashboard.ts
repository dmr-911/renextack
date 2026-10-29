import "server-only";
import { and, count, desc, eq, gte, lt, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { activity, project, task } from "@/server/db/schema";
import { startOfDay, startOfWeek } from "./task-rules";

export interface DashboardOverview {
  activeProjects: number;
  openTasks: number;
  completedThisWeek: number;
  overdueTasks: number;
  recentActivity: { id: string; type: string; summary: string; projectId: string | null; createdAt: Date }[];
  generatedAt: Date;
}

/**
 * Aggregates for the dashboard home. Takes a user id rather than a viewer on
 * purpose: it is only ever called with the signed-in user's own id (see
 * src/server/cache/dashboard.ts), which is what lets the result be cached
 * per user. Do not expose it to arbitrary ids.
 */
export async function computeDashboardOverview(userId: string, now = new Date()): Promise<DashboardOverview> {
  const ownTasks = eq(project.ownerId, userId);
  const [[projects], [open], [completed], [overdue], recentActivity] = await Promise.all([
    db
      .select({ value: count() })
      .from(project)
      .where(and(eq(project.ownerId, userId), eq(project.status, "active"))),
    db
      .select({ value: count() })
      .from(task)
      .innerJoin(project, eq(task.projectId, project.id))
      .where(and(ownTasks, ne(task.status, "done"))),
    db
      .select({ value: count() })
      .from(task)
      .innerJoin(project, eq(task.projectId, project.id))
      .where(and(ownTasks, eq(task.status, "done"), gte(task.completedAt, startOfWeek(now)))),
    db
      .select({ value: count() })
      .from(task)
      .innerJoin(project, eq(task.projectId, project.id))
      .where(and(ownTasks, ne(task.status, "done"), lt(task.dueDate, startOfDay(now)), sql`${task.dueDate} is not null`)),
    db
      .select({
        id: activity.id,
        type: activity.type,
        summary: activity.summary,
        projectId: activity.projectId,
        createdAt: activity.createdAt,
      })
      .from(activity)
      .where(eq(activity.userId, userId))
      .orderBy(desc(activity.createdAt))
      .limit(8),
  ]);

  return {
    activeProjects: projects?.value ?? 0,
    openTasks: open?.value ?? 0,
    completedThisWeek: completed?.value ?? 0,
    overdueTasks: overdue?.value ?? 0,
    recentActivity,
    generatedAt: now,
  };
}

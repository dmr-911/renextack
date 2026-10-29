import "server-only";
import { and, asc, count, desc, eq, sql, type SQL } from "drizzle-orm";
import type { TaskInput, TaskListQuery, TaskUpdate } from "@/features/tasks/schema";
import { projectPolicy, type Viewer } from "@/server/authz/permissions";
import { db } from "@/server/db";
import { activity, project, task } from "@/server/db/schema";
import { errors } from "@/server/http/errors";
import { paginate, toOffset, type Paginated } from "@/server/http/pagination";
import { completionTimestamp } from "./task-rules";
import { findProject, isUuid, requireEditable } from "./projects";

export type Task = typeof task.$inferSelect;

export async function listTasks(viewer: Viewer, projectId: string, query: TaskListQuery): Promise<Paginated<Task>> {
  const parent = await findProject(db, projectId);
  if (!parent || !projectPolicy.canView(viewer, parent)) throw errors.notFound("Project");

  const filters: SQL[] = [eq(task.projectId, parent.id)];
  if (query.status) filters.push(eq(task.status, query.status));
  if (query.priority) filters.push(eq(task.priority, query.priority));
  const where = and(...filters);

  const { limit, offset } = toOffset(query);
  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(task)
      .where(where)
      // Open tasks first, then by priority, then newest.
      .orderBy(
        sql`case ${task.status} when 'done' then 1 else 0 end`,
        sql`case ${task.priority} when 'high' then 0 when 'medium' then 1 else 2 end`,
        desc(task.createdAt),
        asc(task.id),
      )
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(task).where(where),
  ]);
  return paginate(rows, totals?.total ?? 0, query);
}

export async function createTask(viewer: Viewer, projectId: string, input: TaskInput): Promise<Task> {
  return db.transaction(async (tx) => {
    const parent = await requireEditable(tx, viewer, projectId);
    if (parent.status === "archived") throw errors.conflict("Archived projects can't receive new tasks");
    const [created] = await tx
      .insert(task)
      .values({ projectId: parent.id, title: input.title, priority: input.priority, dueDate: input.dueDate })
      .returning();
    await tx.insert(activity).values({
      userId: viewer.id,
      projectId: parent.id,
      type: "task.created",
      summary: `Added task “${created!.title}” to ${parent.name}`,
    });
    await touchProject(tx, parent.id);
    return created!;
  });
}

export async function updateTask(viewer: Viewer, taskId: string, input: TaskUpdate): Promise<Task> {
  return db.transaction(async (tx) => {
    const existing = await findTask(tx, taskId);
    if (!existing) throw errors.notFound("Task");
    const parent = await requireEditable(tx, viewer, existing.projectId).catch((error) => {
      // A task in someone else's project is "not found" for this viewer too.
      throw error?.code === "not_found" ? errors.notFound("Task") : error;
    });

    const completedAt = completionTimestamp(existing, input.status, new Date());
    const [updated] = await tx
      .update(task)
      .set({ ...input, completedAt })
      .where(eq(task.id, existing.id))
      .returning();

    if (input.status && input.status !== existing.status) {
      await tx.insert(activity).values({
        userId: viewer.id,
        projectId: parent.id,
        type: input.status === "done" ? "task.completed" : "task.reopened",
        summary:
          input.status === "done" ? `Completed “${updated!.title}”` : `Moved “${updated!.title}” to ${label(input.status)}`,
      });
    }
    await touchProject(tx, parent.id);
    return updated!;
  });
}

export async function deleteTask(viewer: Viewer, taskId: string): Promise<Task & { ownerId: string }> {
  return db.transaction(async (tx) => {
    const existing = await findTask(tx, taskId);
    if (!existing) throw errors.notFound("Task");
    const parent = await requireEditable(tx, viewer, existing.projectId).catch((error) => {
      throw error?.code === "not_found" ? errors.notFound("Task") : error;
    });
    await tx.delete(task).where(eq(task.id, existing.id));
    await touchProject(tx, parent.id);
    return { ...existing, ownerId: parent.ownerId };
  });
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function findTask(tx: Tx, taskId: string): Promise<Task | undefined> {
  if (!isUuid(taskId)) return undefined;
  const [row] = await tx.select().from(task).where(eq(task.id, taskId)).limit(1);
  return row;
}

async function touchProject(tx: Tx, projectId: string) {
  await tx.update(project).set({ updatedAt: new Date() }).where(eq(project.id, projectId));
}

function label(status: string) {
  return status === "in_progress" ? "In progress" : status === "todo" ? "To do" : "Done";
}

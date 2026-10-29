import "server-only";
import { and, asc, count, desc, eq, ilike, sql, type SQL } from "drizzle-orm";
import type { ProjectInput, ProjectListQuery, ProjectUpdate } from "@/features/projects/schema";
import { hasPermission, projectPolicy, type Viewer } from "@/server/authz/permissions";
import { db, type Database } from "@/server/db";
import { activity, project } from "@/server/db/schema";
import { errors } from "@/server/http/errors";
import { escapeLike, paginate, toOffset, type Paginated } from "@/server/http/pagination";

/**
 * Project use-cases. Every exported function takes the acting `viewer` first
 * and performs its own authorization, so it is safe to call from a page, a
 * Server Action, or an API route without the caller remembering to check.
 */

export type Project = typeof project.$inferSelect;
export type ProjectWithCounts = Project & { taskCount: number; openTaskCount: number };

type Executor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

// Correlated subqueries. Table-qualified raw SQL on purpose: Drizzle omits table
// names in single-table selects, which would make `project_id = id` self-referential.
const taskCounts = {
  taskCount: sql<number>`(select count(*)::int from "task" t where t.project_id = "project"."id")`,
  openTaskCount: sql<number>`(select count(*)::int from "task" t where t.project_id = "project"."id" and t.status <> 'done')`,
};

export async function listProjects(viewer: Viewer, query: ProjectListQuery): Promise<Paginated<ProjectWithCounts>> {
  if (query.scope === "all" && !hasPermission(viewer, "project:list:all")) {
    throw errors.forbidden("Only administrators can list every project");
  }

  const filters: SQL[] = [];
  if (query.scope === "mine") filters.push(eq(project.ownerId, viewer.id));
  if (query.status) filters.push(eq(project.status, query.status));
  if (query.q) filters.push(ilike(project.name, `%${escapeLike(query.q)}%`));
  const where = filters.length ? and(...filters) : undefined;

  const orderBy = {
    updated: desc(project.updatedAt),
    created: desc(project.createdAt),
    name: asc(project.name),
  }[query.sort];

  const { limit, offset } = toOffset(query);
  const [rows, [totals]] = await Promise.all([
    db
      .select({ ...getProjectColumns(), ...taskCounts })
      .from(project)
      .where(where)
      .orderBy(orderBy, desc(project.id))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(project).where(where),
  ]);

  return paginate(rows, totals?.total ?? 0, query);
}

/** Loads a project the viewer may see. Missing and not-yours both yield 404, so ids can't be probed. */
export async function getProject(viewer: Viewer, projectId: string): Promise<ProjectWithCounts> {
  const found = await findProject(db, projectId);
  if (!found || !projectPolicy.canView(viewer, found)) throw errors.notFound("Project");
  return found;
}

export async function createProject(viewer: Viewer, input: ProjectInput): Promise<Project> {
  if (!hasPermission(viewer, "project:create")) throw errors.forbidden();
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(project)
      .values({ ownerId: viewer.id, name: input.name, description: input.description })
      .returning();
    await tx.insert(activity).values({
      userId: viewer.id,
      projectId: created!.id,
      type: "project.created",
      summary: `Created project “${created!.name}”`,
    });
    return created!;
  });
}

export async function updateProject(viewer: Viewer, projectId: string, input: ProjectUpdate): Promise<Project> {
  return db.transaction(async (tx) => {
    const existing = await requireEditable(tx, viewer, projectId);
    const [updated] = await tx.update(project).set(input).where(eq(project.id, existing.id)).returning();
    const type = input.status && input.status !== existing.status ? `project.${input.status}` : "project.updated";
    await tx.insert(activity).values({
      userId: viewer.id,
      projectId: existing.id,
      type,
      summary:
        type === "project.archived"
          ? `Archived project “${updated!.name}”`
          : type === "project.active"
            ? `Restored project “${updated!.name}”`
            : `Updated project “${updated!.name}”`,
    });
    return updated!;
  });
}

/** Returns the deleted project so callers can invalidate the owner's cached data. */
export async function deleteProject(viewer: Viewer, projectId: string): Promise<Project> {
  return db.transaction(async (tx) => {
    const existing = await findProject(tx, projectId);
    if (!existing || !projectPolicy.canView(viewer, existing)) throw errors.notFound("Project");
    if (!projectPolicy.canDelete(viewer, existing)) throw errors.forbidden();
    await tx.delete(project).where(eq(project.id, existing.id));
    await tx.insert(activity).values({
      userId: viewer.id,
      type: "project.deleted",
      summary: `Deleted project “${existing.name}”`,
    });
    return existing;
  });
}

// --- internals shared with the task service ----------------------------------

function getProjectColumns() {
  return {
    id: project.id,
    ownerId: project.ownerId,
    name: project.name,
    description: project.description,
    status: project.status,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

export async function findProject(executor: Executor, projectId: string): Promise<ProjectWithCounts | undefined> {
  if (!isUuid(projectId)) return undefined;
  const [row] = await executor
    .select({ ...getProjectColumns(), ...taskCounts })
    .from(project)
    .where(eq(project.id, projectId))
    .limit(1);
  return row;
}

/**
 * Loads a project for modification. Viewers who can't even see it get 404;
 * viewers who can see but not edit it (admins) get 403.
 */
export async function requireEditable(executor: Executor, viewer: Viewer, projectId: string): Promise<Project> {
  const existing = await findProject(executor, projectId);
  if (!existing || !projectPolicy.canView(viewer, existing)) throw errors.notFound("Project");
  if (!projectPolicy.canEdit(viewer, existing)) throw errors.forbidden("Only the project owner can change it");
  return existing;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: string): boolean {
  return UUID.test(value);
}

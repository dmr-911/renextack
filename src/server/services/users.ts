import "server-only";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { UserListQuery } from "@/features/admin/schema";
import { hasPermission, type Role, type Viewer } from "@/server/authz/permissions";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";
import { errors } from "@/server/http/errors";
import { escapeLike, paginate, toOffset, type Paginated } from "@/server/http/pagination";

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  createdAt: Date;
}

const columns = {
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  emailVerified: user.emailVerified,
  createdAt: user.createdAt,
};

export async function listUsers(viewer: Viewer, query: UserListQuery): Promise<Paginated<AdminUserRow>> {
  if (!hasPermission(viewer, "user:list")) throw errors.forbidden();

  const filters: SQL[] = [];
  if (query.role) filters.push(eq(user.role, query.role));
  if (query.q) {
    const pattern = `%${escapeLike(query.q)}%`;
    filters.push(or(ilike(user.name, pattern), ilike(user.email, pattern))!);
  }
  const where = filters.length ? and(...filters) : undefined;
  const { limit, offset } = toOffset(query);

  const [rows, [totals]] = await Promise.all([
    db.select(columns).from(user).where(where).orderBy(desc(user.createdAt), desc(user.id)).limit(limit).offset(offset),
    db.select({ total: count() }).from(user).where(where),
  ]);
  return paginate(rows, totals?.total ?? 0, query);
}

export async function updateUserRole(viewer: Viewer, userId: string, role: Role): Promise<AdminUserRow> {
  if (!hasPermission(viewer, "user:update-role")) throw errors.forbidden();
  // Prevents the last (or only) admin from locking everyone out by accident.
  if (userId === viewer.id && role !== "admin") {
    throw errors.conflict("You can't remove your own admin role. Ask another administrator.");
  }
  const [updated] = await db.update(user).set({ role }).where(eq(user.id, userId)).returning(columns);
  if (!updated) throw errors.notFound("User");
  return updated;
}

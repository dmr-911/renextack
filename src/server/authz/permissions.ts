/**
 * Authorization rules, as plain functions with no framework or database
 * dependencies, so they are trivial to unit test and reuse in pages, actions,
 * and API routes alike.
 *
 * Two layers:
 *  - Role permissions: "can this kind of user do this kind of thing at all?"
 *  - Resource policies: "can this user act on this specific record?"
 */

export const ROLES = ["user", "admin"] as const;
export type Role = (typeof ROLES)[number];

export interface Viewer {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
}

export function toRole(value: unknown): Role {
  return value === "admin" ? "admin" : "user";
}

const ROLE_PERMISSIONS = {
  user: ["project:create", "project:list:own"],
  admin: ["project:create", "project:list:own", "project:list:all", "user:list", "user:update-role", "admin:access"],
} as const satisfies Record<Role, readonly string[]>;

export type Permission = (typeof ROLE_PERMISSIONS)["admin"][number];

export function hasPermission(viewer: Pick<Viewer, "role"> | null | undefined, permission: Permission): boolean {
  if (!viewer) return false;
  return (ROLE_PERMISSIONS[viewer.role] as readonly string[]).includes(permission);
}

export function isAdmin(viewer: Pick<Viewer, "role"> | null | undefined): boolean {
  return viewer?.role === "admin";
}

/** Resource policy for projects (and, through their project, tasks). */
export const projectPolicy = {
  /** Owners can see their projects; admins can see any project for support purposes. */
  canView(viewer: Viewer, project: { ownerId: string }) {
    return project.ownerId === viewer.id || isAdmin(viewer);
  },
  /** Only the owner edits a project or its tasks. Admin access is read-only by design. */
  canEdit(viewer: Viewer, project: { ownerId: string }) {
    return project.ownerId === viewer.id;
  },
  /** Owners can delete; admins can delete for moderation. */
  canDelete(viewer: Viewer, project: { ownerId: string }) {
    return project.ownerId === viewer.id || isAdmin(viewer);
  },
};

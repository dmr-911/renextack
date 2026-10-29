import { describe, expect, it } from "vitest";
import { hasPermission, isAdmin, projectPolicy, toRole, type Viewer } from "@/server/authz/permissions";

const user: Viewer = { id: "u1", name: "User", email: "u@x.test", image: null, role: "user" };
const admin: Viewer = { ...user, id: "a1", role: "admin" };
const owned = { ownerId: "u1" };
const foreign = { ownerId: "someone-else" };

describe("role permissions", () => {
  it("grants admin-only permissions to admins only", () => {
    expect(hasPermission(admin, "user:list")).toBe(true);
    expect(hasPermission(user, "user:list")).toBe(false);
    expect(hasPermission(user, "project:list:all")).toBe(false);
    expect(hasPermission(user, "project:create")).toBe(true);
  });

  it("denies everything to anonymous callers", () => {
    expect(hasPermission(null, "project:create")).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it("coerces unknown role values to the least-privileged role", () => {
    expect(toRole("admin")).toBe("admin");
    expect(toRole("superuser")).toBe("user");
    expect(toRole(undefined)).toBe("user");
  });
});

describe("project policy", () => {
  it("lets owners view, edit, and delete their projects", () => {
    expect(projectPolicy.canView(user, owned)).toBe(true);
    expect(projectPolicy.canEdit(user, owned)).toBe(true);
    expect(projectPolicy.canDelete(user, owned)).toBe(true);
  });

  it("denies non-owners", () => {
    expect(projectPolicy.canView(user, foreign)).toBe(false);
    expect(projectPolicy.canEdit(user, foreign)).toBe(false);
    expect(projectPolicy.canDelete(user, foreign)).toBe(false);
  });

  it("gives admins read and delete, but not edit, on others' projects", () => {
    expect(projectPolicy.canView(admin, foreign)).toBe(true);
    expect(projectPolicy.canEdit(admin, foreign)).toBe(false);
    expect(projectPolicy.canDelete(admin, foreign)).toBe(true);
  });
});

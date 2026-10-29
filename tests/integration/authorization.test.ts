import { beforeEach, describe, expect, it } from "vitest";
import * as adminUserRoute from "@/app/api/v1/admin/users/[userId]/route";
import * as adminUsersRoute from "@/app/api/v1/admin/users/route";
import * as meRoute from "@/app/api/v1/me/route";
import * as projectsRoute from "@/app/api/v1/projects/route";
import * as projectRoute from "@/app/api/v1/projects/[projectId]/route";
import * as tasksRoute from "@/app/api/v1/projects/[projectId]/tasks/route";
import * as taskRoute from "@/app/api/v1/tasks/[taskId]/route";
import { call, createUser, resetAppTables } from "./helpers";

beforeEach(resetAppTables);

async function setup() {
  const owner = await createUser({ name: "Owner" });
  const stranger = await createUser({ name: "Stranger" });
  const admin = await createUser({ name: "Admin", role: "admin" });
  const project = (await call(projectsRoute.POST, { method: "POST", cookie: owner.cookie, body: { name: "Private plans" } })).json
    .data as { id: string };
  const task = (
    await call(tasksRoute.POST, { method: "POST", cookie: owner.cookie, params: { projectId: project.id }, body: { title: "Secret" } })
  ).json.data as { id: string };
  return { owner, stranger, admin, project, task };
}

describe("authorization: anonymous callers", () => {
  const endpoints = [
    ["GET /me", meRoute.GET, {}],
    ["GET /projects", projectsRoute.GET, {}],
    ["POST /projects", projectsRoute.POST, {}],
    ["GET /projects/:id", projectRoute.GET, { projectId: "00000000-0000-0000-0000-000000000000" }],
    ["PATCH /tasks/:id", taskRoute.PATCH, { taskId: "00000000-0000-0000-0000-000000000000" }],
    ["GET /admin/users", adminUsersRoute.GET, {}],
  ] as const;

  for (const [name, handler, params] of endpoints) {
    it(`${name} returns 401`, async () => {
      const response = await call(handler, { method: name.split(" ")[0], params, body: name.startsWith("GET") ? undefined : {} });
      expect(response.status).toBe(401);
      expect(response.json.error.code).toBe("unauthorized");
    });
  }
});

describe("authorization: resource ownership", () => {
  it("hides another user's project as 404 (no existence leak)", async () => {
    const { stranger, project } = await setup();
    const params = { projectId: project.id };
    expect((await call(projectRoute.GET, { cookie: stranger.cookie, params })).status).toBe(404);
    expect((await call(projectRoute.PATCH, { method: "PATCH", cookie: stranger.cookie, params, body: { name: "Hacked" } })).status).toBe(404);
    expect((await call(projectRoute.DELETE, { method: "DELETE", cookie: stranger.cookie, params })).status).toBe(404);
    expect((await call(tasksRoute.GET, { cookie: stranger.cookie, params })).status).toBe(404);
    expect((await call(tasksRoute.POST, { method: "POST", cookie: stranger.cookie, params, body: { title: "Spam" } })).status).toBe(404);
  });

  it("hides another user's task as 404", async () => {
    const { stranger, task } = await setup();
    const params = { taskId: task.id };
    expect((await call(taskRoute.PATCH, { method: "PATCH", cookie: stranger.cookie, params, body: { status: "done" } })).status).toBe(404);
    expect((await call(taskRoute.DELETE, { method: "DELETE", cookie: stranger.cookie, params })).status).toBe(404);
  });

  it("does not include other users' projects in a list", async () => {
    const { stranger } = await setup();
    const list = await call(projectsRoute.GET, { cookie: stranger.cookie });
    expect(list.json.data).toEqual([]);
  });

  it("treats malformed ids as not found rather than a server error", async () => {
    const { owner } = await setup();
    expect((await call(projectRoute.GET, { cookie: owner.cookie, params: { projectId: "not-a-uuid" } })).status).toBe(404);
  });
});

describe("authorization: roles", () => {
  it("lets admins read any project but not edit it", async () => {
    const { admin, project, task } = await setup();
    const params = { projectId: project.id };
    expect((await call(projectRoute.GET, { cookie: admin.cookie, params })).status).toBe(200);
    expect((await call(projectRoute.PATCH, { method: "PATCH", cookie: admin.cookie, params, body: { name: "Mine now" } })).status).toBe(403);
    expect((await call(taskRoute.PATCH, { method: "PATCH", cookie: admin.cookie, params: { taskId: task.id }, body: { status: "done" } })).status).toBe(403);
  });

  it("lets admins delete any project for moderation", async () => {
    const { admin, owner, project } = await setup();
    expect((await call(projectRoute.DELETE, { method: "DELETE", cookie: admin.cookie, params: { projectId: project.id } })).status).toBe(204);
    expect((await call(projectRoute.GET, { cookie: owner.cookie, params: { projectId: project.id } })).status).toBe(404);
  });

  it("restricts scope=all listing to admins", async () => {
    const { owner, admin } = await setup();
    expect((await call(projectsRoute.GET, { cookie: owner.cookie, path: "/api/v1/projects?scope=all" })).status).toBe(403);
    const all = await call(projectsRoute.GET, { cookie: admin.cookie, path: "/api/v1/projects?scope=all" });
    expect(all.status).toBe(200);
    expect(all.json.pagination.total).toBe(1);
  });

  it("restricts the user directory and role changes to admins", async () => {
    const { owner, stranger, admin } = await setup();
    expect((await call(adminUsersRoute.GET, { cookie: owner.cookie })).status).toBe(403);
    expect(
      (await call(adminUserRoute.PATCH, { method: "PATCH", cookie: owner.cookie, params: { userId: owner.id }, body: { role: "admin" } })).status,
    ).toBe(403);

    const directory = await call(adminUsersRoute.GET, { cookie: admin.cookie, path: "/api/v1/admin/users?role=admin" });
    expect(directory.status).toBe(200);
    expect(directory.json.data.every((row: { role: string }) => row.role === "admin")).toBe(true);

    const promoted = await call(adminUserRoute.PATCH, {
      method: "PATCH",
      cookie: admin.cookie,
      params: { userId: stranger.id },
      body: { role: "admin" },
    });
    expect(promoted.status).toBe(200);
    expect(promoted.json.data.role).toBe("admin");

    // The promotion takes effect on the very next request (no stale cached session).
    expect((await call(adminUsersRoute.GET, { cookie: stranger.cookie })).status).toBe(200);
  });

  it("stops an admin from removing their own admin role", async () => {
    const { admin } = await setup();
    const response = await call(adminUserRoute.PATCH, {
      method: "PATCH",
      cookie: admin.cookie,
      params: { userId: admin.id },
      body: { role: "user" },
    });
    expect(response.status).toBe(409);
  });

  it("rejects an unknown role value", async () => {
    const { admin, owner } = await setup();
    const response = await call(adminUserRoute.PATCH, {
      method: "PATCH",
      cookie: admin.cookie,
      params: { userId: owner.id },
      body: { role: "superuser" },
    });
    expect(response.status).toBe(422);
  });
});

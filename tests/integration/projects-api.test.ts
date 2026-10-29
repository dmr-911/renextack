import { revalidateTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as projectsRoute from "@/app/api/v1/projects/route";
import * as projectRoute from "@/app/api/v1/projects/[projectId]/route";
import * as tasksRoute from "@/app/api/v1/projects/[projectId]/tasks/route";
import * as taskRoute from "@/app/api/v1/tasks/[taskId]/route";
import * as meRoute from "@/app/api/v1/me/route";
import { call, createUser, resetAppTables } from "./helpers";

beforeEach(async () => {
  await resetAppTables();
  vi.mocked(revalidateTag).mockClear();
});

async function createProjectAs(cookie: string, name = "Alpha") {
  const response = await call(projectsRoute.POST, { method: "POST", cookie, body: { name, description: "Test project" } });
  expect(response.status).toBe(201);
  return response.json.data as { id: string; ownerId: string; name: string };
}

describe("API: projects", () => {
  it("returns the signed-in user from /me", async () => {
    const alice = await createUser({ name: "Alice" });
    const response = await call(meRoute.GET, { cookie: alice.cookie });
    expect(response.status).toBe(200);
    expect(response.json.data).toMatchObject({ id: alice.id, name: "Alice", role: "user" });
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("creates a project, records activity, and invalidates the owner's dashboard cache", async () => {
    const alice = await createUser();
    const project = await createProjectAs(alice.cookie);
    expect(project.ownerId).toBe(alice.id);
    expect(revalidateTag).toHaveBeenCalledWith(`dashboard:${alice.id}`, { expire: 0 });
  });

  it("validates input with field-level errors", async () => {
    const alice = await createUser();
    const response = await call(projectsRoute.POST, { method: "POST", cookie: alice.cookie, body: { name: "x" } });
    expect(response.status).toBe(422);
    expect(response.json.error.code).toBe("validation_failed");
    expect(response.json.error.fieldErrors.name[0]).toMatch(/at least 2/);
  });

  it("returns 400 for malformed JSON instead of crashing", async () => {
    const alice = await createUser();
    const response = await call(projectsRoute.POST, { method: "POST", cookie: alice.cookie, rawBody: "{not json" });
    expect(response.status).toBe(400);
    expect(response.json.error.code).toBe("bad_request");
  });

  it("paginates and filters the project list", async () => {
    const alice = await createUser();
    for (const name of ["Website", "Webinar", "Onboarding"]) await createProjectAs(alice.cookie, name);

    const page1 = await call(projectsRoute.GET, { cookie: alice.cookie, path: "/api/v1/projects?pageSize=2&sort=name" });
    expect(page1.json.pagination).toEqual({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
    expect(page1.json.data.map((p: { name: string }) => p.name)).toEqual(["Onboarding", "Webinar"]);

    const search = await call(projectsRoute.GET, { cookie: alice.cookie, path: "/api/v1/projects?q=web" });
    expect(search.json.pagination.total).toBe(2);

    // LIKE wildcards in user input are matched literally.
    const wildcard = await call(projectsRoute.GET, { cookie: alice.cookie, path: "/api/v1/projects?q=%25" });
    expect(wildcard.json.pagination.total).toBe(0);

    const invalid = await call(projectsRoute.GET, { cookie: alice.cookie, path: "/api/v1/projects?pageSize=1000" });
    expect(invalid.status).toBe(422);
  });

  it("counts tasks per project", async () => {
    const alice = await createUser();
    const project = await createProjectAs(alice.cookie);
    const params = { projectId: project.id };
    for (const title of ["One", "Two"]) {
      await call(tasksRoute.POST, { method: "POST", cookie: alice.cookie, params, body: { title } });
    }
    const list = await call(tasksRoute.GET, { cookie: alice.cookie, params });
    await call(taskRoute.PATCH, { method: "PATCH", cookie: alice.cookie, params: { taskId: list.json.data[0].id }, body: { status: "done" } });

    const detail = await call(projectRoute.GET, { cookie: alice.cookie, params });
    expect(detail.json.data).toMatchObject({ taskCount: 2, openTaskCount: 1 });
  });

  it("stamps completedAt when a task is done and clears it when reopened", async () => {
    const alice = await createUser();
    const project = await createProjectAs(alice.cookie);
    const created = await call(tasksRoute.POST, {
      method: "POST",
      cookie: alice.cookie,
      params: { projectId: project.id },
      body: { title: "Ship it", priority: "high", dueDate: "2030-01-15" },
    });
    expect(created.status).toBe(201);
    const taskId = created.json.data.id;

    const done = await call(taskRoute.PATCH, { method: "PATCH", cookie: alice.cookie, params: { taskId }, body: { status: "done" } });
    expect(done.json.data.completedAt).not.toBeNull();
    expect(done.json.data.dueDate).toBe("2030-01-15T00:00:00.000Z");

    const reopened = await call(taskRoute.PATCH, { method: "PATCH", cookie: alice.cookie, params: { taskId }, body: { status: "todo" } });
    expect(reopened.json.data.completedAt).toBeNull();
    // A partial update leaves fields it didn't mention alone.
    expect(reopened.json.data.dueDate).toBe("2030-01-15T00:00:00.000Z");
  });

  it("refuses new tasks on archived projects", async () => {
    const alice = await createUser();
    const project = await createProjectAs(alice.cookie);
    await call(projectRoute.PATCH, { method: "PATCH", cookie: alice.cookie, params: { projectId: project.id }, body: { status: "archived" } });
    const response = await call(tasksRoute.POST, {
      method: "POST",
      cookie: alice.cookie,
      params: { projectId: project.id },
      body: { title: "Too late" },
    });
    expect(response.status).toBe(409);
  });
});

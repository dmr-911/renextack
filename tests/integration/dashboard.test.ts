import { beforeEach, describe, expect, it } from "vitest";
import * as projectsRoute from "@/app/api/v1/projects/route";
import * as tasksRoute from "@/app/api/v1/projects/[projectId]/tasks/route";
import * as taskRoute from "@/app/api/v1/tasks/[taskId]/route";
import { computeDashboardOverview } from "@/server/services/dashboard";
import { call, createUser, resetAppTables } from "./helpers";

beforeEach(resetAppTables);

describe("dashboard overview", () => {
  it("aggregates only the user's own data", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const project = (await call(projectsRoute.POST, { method: "POST", cookie: alice.cookie, body: { name: "Launch" } })).json.data;
    await call(projectsRoute.POST, { method: "POST", cookie: bob.cookie, body: { name: "Bob's" } });

    const params = { projectId: project.id };
    await call(tasksRoute.POST, { method: "POST", cookie: alice.cookie, params, body: { title: "Late", dueDate: "2020-01-01" } });
    const doneTask = (await call(tasksRoute.POST, { method: "POST", cookie: alice.cookie, params, body: { title: "Finish" } })).json.data;
    await call(taskRoute.PATCH, { method: "PATCH", cookie: alice.cookie, params: { taskId: doneTask.id }, body: { status: "done" } });

    const overview = await computeDashboardOverview(alice.id);
    expect(overview).toMatchObject({ activeProjects: 1, openTasks: 1, completedThisWeek: 1, overdueTasks: 1 });
    expect(overview.recentActivity.map((item) => item.type)).toEqual(["task.completed", "task.created", "task.created", "project.created"]);
  });

  it("returns zeros and an empty feed for a new user", async () => {
    const carol = await createUser();
    const overview = await computeDashboardOverview(carol.id);
    expect(overview).toMatchObject({ activeProjects: 0, openTasks: 0, completedThisWeek: 0, overdueTasks: 0, recentActivity: [] });
  });
});

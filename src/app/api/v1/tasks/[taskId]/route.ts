import { taskUpdateSchema } from "@/features/tasks/schema";
import { invalidateDashboardFromRoute } from "@/server/cache/dashboard";
import { apiRoute, noContent } from "@/server/http/api-route";
import { parseOrThrow, readJson } from "@/server/http/validation";
import { rateLimitRules } from "@/server/rate-limit";
import { deleteTask, updateTask } from "@/server/services/tasks";

type Params = { taskId: string };

/** PATCH /api/v1/tasks/:taskId  body: { title?, status?, priority?, dueDate? }: project owner only. */
export const PATCH = apiRoute<Params>(
  { auth: "required", rateLimit: { name: "api-write", rule: rateLimitRules.apiWrite } },
  async ({ request, params, viewer }) => {
    const input = parseOrThrow(taskUpdateSchema, await readJson(request));
    const task = await updateTask(viewer, params.taskId, input);
    invalidateDashboardFromRoute(viewer.id);
    return task;
  },
);

/** DELETE /api/v1/tasks/:taskId: project owner only. */
export const DELETE = apiRoute<Params>(
  { auth: "required", rateLimit: { name: "api-write", rule: rateLimitRules.apiWrite } },
  async ({ params, viewer }) => {
    const task = await deleteTask(viewer, params.taskId);
    invalidateDashboardFromRoute(task.ownerId);
    return noContent();
  },
);

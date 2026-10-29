import { taskInputSchema, taskListQuerySchema } from "@/features/tasks/schema";
import { invalidateDashboardFromRoute } from "@/server/cache/dashboard";
import { apiRoute, created } from "@/server/http/api-route";
import { parseOrThrow, readJson, searchParamsToObject } from "@/server/http/validation";
import { rateLimitRules } from "@/server/rate-limit";
import { createTask, listTasks } from "@/server/services/tasks";

type Params = { projectId: string };

/** GET /api/v1/projects/:projectId/tasks?status=todo&priority=high&page=1 */
export const GET = apiRoute<Params>(
  { auth: "required", rateLimit: { name: "api-read", rule: rateLimitRules.apiRead } },
  async ({ request, params, viewer }) => {
    const query = parseOrThrow(taskListQuerySchema, searchParamsToObject(new URL(request.url).searchParams));
    return Response.json(await listTasks(viewer, params.projectId, query));
  },
);

/** POST /api/v1/projects/:projectId/tasks  body: { title, priority?, dueDate? } */
export const POST = apiRoute<Params>(
  { auth: "required", rateLimit: { name: "api-write", rule: rateLimitRules.apiWrite } },
  async ({ request, params, viewer }) => {
    const input = parseOrThrow(taskInputSchema, await readJson(request));
    const task = await createTask(viewer, params.projectId, input);
    invalidateDashboardFromRoute(viewer.id);
    return created(task);
  },
);

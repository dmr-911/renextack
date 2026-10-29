import { projectInputSchema, projectListQuerySchema } from "@/features/projects/schema";
import { after } from "next/server";
import { invalidateDashboardFromRoute } from "@/server/cache/dashboard";
import { getAnalytics } from "@/server/integrations/analytics";
import { apiRoute, created } from "@/server/http/api-route";
import { parseOrThrow, readJson, searchParamsToObject } from "@/server/http/validation";
import { rateLimitRules } from "@/server/rate-limit";
import { createProject, listProjects } from "@/server/services/projects";

/**
 * GET /api/v1/projects?page=1&pageSize=20&q=web&status=active&sort=name&scope=mine
 * Returns `{ data: Project[], pagination: { page, pageSize, total, totalPages } }`.
 */
export const GET = apiRoute(
  { auth: "required", rateLimit: { name: "api-read", rule: rateLimitRules.apiRead } },
  async ({ request, viewer }) => {
    const query = parseOrThrow(projectListQuerySchema, searchParamsToObject(new URL(request.url).searchParams));
    return Response.json(await listProjects(viewer, query));
  },
);

/** POST /api/v1/projects  body: { name, description? } */
export const POST = apiRoute(
  { auth: "required", rateLimit: { name: "api-write", rule: rateLimitRules.apiWrite } },
  async ({ request, viewer }) => {
    const input = parseOrThrow(projectInputSchema, await readJson(request));
    const project = await createProject(viewer, input);
    invalidateDashboardFromRoute(viewer.id);
    after(() => getAnalytics().track({ name: "project_created", distinctId: viewer.id, properties: { source: "api" } }));
    return created(project);
  },
);

import { projectUpdateSchema } from "@/features/projects/schema";
import { invalidateDashboardFromRoute } from "@/server/cache/dashboard";
import { apiRoute, noContent } from "@/server/http/api-route";
import { parseOrThrow, readJson } from "@/server/http/validation";
import { rateLimitRules } from "@/server/rate-limit";
import { deleteProject, getProject, updateProject } from "@/server/services/projects";

type Params = { projectId: string };

/** GET /api/v1/projects/:projectId: owner or admin; anyone else gets 404. */
export const GET = apiRoute<Params>(
  { auth: "required", rateLimit: { name: "api-read", rule: rateLimitRules.apiRead } },
  async ({ params, viewer }) => getProject(viewer, params.projectId),
);

/** PATCH /api/v1/projects/:projectId  body: { name?, description?, status? }: owner only. */
export const PATCH = apiRoute<Params>(
  { auth: "required", rateLimit: { name: "api-write", rule: rateLimitRules.apiWrite } },
  async ({ request, params, viewer }) => {
    const input = parseOrThrow(projectUpdateSchema, await readJson(request));
    const project = await updateProject(viewer, params.projectId, input);
    invalidateDashboardFromRoute(project.ownerId);
    return project;
  },
);

/** DELETE /api/v1/projects/:projectId: owner or admin. */
export const DELETE = apiRoute<Params>(
  { auth: "required", rateLimit: { name: "api-write", rule: rateLimitRules.apiWrite } },
  async ({ params, viewer }) => {
    const project = await deleteProject(viewer, params.projectId);
    invalidateDashboardFromRoute(project.ownerId);
    return noContent();
  },
);

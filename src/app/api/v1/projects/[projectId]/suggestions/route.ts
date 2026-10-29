import { apiRoute } from "@/server/http/api-route";
import { requireAiProvider, toAiError } from "@/server/integrations/ai";
import { suggestTasks } from "@/server/integrations/ai/suggest-tasks";
import { rateLimitRules } from "@/server/rate-limit";
import { getProject } from "@/server/services/projects";
import { listTasks } from "@/server/services/tasks";

/**
 * POST /api/v1/projects/:projectId/suggestions → `{ data: { suggestions: string[] } }`.
 * Example AI feature. Returns 503 `not_configured` unless AI_PROVIDER is set.
 * Paid API calls are rate limited tightly per user.
 */
export const POST = apiRoute<{ projectId: string }>(
  { auth: "required", rateLimit: { name: "ai", rule: rateLimitRules.ai } },
  async ({ params, viewer }) => {
    const provider = requireAiProvider();
    const project = await getProject(viewer, params.projectId);
    const tasks = await listTasks(viewer, project.id, { page: 1, pageSize: 50 });
    const suggestions = await suggestTasks(provider, {
      name: project.name,
      description: project.description,
      existingTasks: tasks.data.map((task) => task.title),
    }).catch(toAiError);
    return { suggestions };
  },
);

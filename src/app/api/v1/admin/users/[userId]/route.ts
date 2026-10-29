import { roleUpdateSchema } from "@/features/admin/schema";
import { apiRoute } from "@/server/http/api-route";
import { parseOrThrow, readJson } from "@/server/http/validation";
import { rateLimitRules } from "@/server/rate-limit";
import { updateUserRole } from "@/server/services/users";

/** PATCH /api/v1/admin/users/:userId  body: { role: "user" | "admin" }: admins only. */
export const PATCH = apiRoute<{ userId: string }>(
  { auth: "required", rateLimit: { name: "api-admin", rule: rateLimitRules.admin } },
  async ({ request, params, viewer }) => {
    const input = parseOrThrow(roleUpdateSchema, await readJson(request));
    const updated = await updateUserRole(viewer, params.userId, input.role);
    return updated;
  },
);

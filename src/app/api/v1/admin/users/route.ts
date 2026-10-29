import { userListQuerySchema } from "@/features/admin/schema";
import { apiRoute } from "@/server/http/api-route";
import { parseOrThrow, searchParamsToObject } from "@/server/http/validation";
import { rateLimitRules } from "@/server/rate-limit";
import { listUsers } from "@/server/services/users";

/** GET /api/v1/admin/users?q=&role=&page=: admins only (403 otherwise). */
export const GET = apiRoute(
  { auth: "required", rateLimit: { name: "api-admin", rule: rateLimitRules.admin } },
  async ({ request, viewer }) => {
    const query = parseOrThrow(userListQuerySchema, searchParamsToObject(new URL(request.url).searchParams));
    return Response.json(await listUsers(viewer, query));
  },
);

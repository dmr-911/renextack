import { apiRoute } from "@/server/http/api-route";

/** GET /api/v1/me: the signed-in user. */
export const GET = apiRoute({ auth: "required" }, async ({ viewer }) => viewer);

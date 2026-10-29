import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { logger } from "@/server/logger";

/**
 * Liveness + readiness probe for load balancers and uptime monitors.
 * Returns 200 when the database answers, 503 otherwise. Reveals no details.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logger.error("Health check failed", { error });
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

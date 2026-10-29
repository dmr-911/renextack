import "server-only";
import { cacheLife, cacheTag, revalidateTag, updateTag } from "next/cache";
import { computeDashboardOverview, type DashboardOverview } from "@/server/services/dashboard";

/**
 * Caching example: the dashboard overview.
 *
 * The overview runs five aggregate queries. It is read on every dashboard
 * visit but only changes when the user's projects, tasks, or activity change,
 * so it is a good candidate for caching per user.
 *
 * How it works
 *  - `getCachedDashboardOverview` uses `'use cache'`, keyed by `userId`
 *    (arguments become part of the cache key) and tagged `dashboard:<userId>`.
 *  - `cacheLife("minutes")` bounds staleness even if an invalidation is missed
 *    (e.g. a row changed directly in the database).
 *  - Every mutation that affects the overview calls one of the invalidators
 *    below with the *owner's* id:
 *      - Server Actions → `updateTag` (read-your-own-writes: the next render waits for fresh data)
 *      - Route Handlers → `revalidateTag(tag, { expire: 0 })` (updateTag is Server-Action-only)
 *
 * Security: the cached function is not exported. Callers go through
 * `getDashboardOverview(viewer)`, which only ever passes the signed-in user's
 * id, so nobody can read another user's cached overview by supplying an id.
 *
 * Multi-instance note: the default cache is in-memory per instance. See
 * docs/caching.md for what that means behind a load balancer.
 */

export const dashboardTag = (userId: string) => `dashboard:${userId}`;

async function getCachedDashboardOverview(userId: string): Promise<DashboardOverview> {
  "use cache";
  cacheTag(dashboardTag(userId));
  cacheLife("minutes");
  return computeDashboardOverview(userId);
}

export function getDashboardOverview(viewer: { id: string }): Promise<DashboardOverview> {
  return getCachedDashboardOverview(viewer.id);
}

/** Call from Server Actions after a change that affects `ownerId`'s dashboard. */
export function invalidateDashboardFromAction(ownerId: string) {
  updateTag(dashboardTag(ownerId));
}

/** Call from Route Handlers after a change that affects `ownerId`'s dashboard. */
export function invalidateDashboardFromRoute(ownerId: string) {
  revalidateTag(dashboardTag(ownerId), { expire: 0 });
}

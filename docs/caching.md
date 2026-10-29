# Caching and revalidation

The kit includes one complete, tested caching example: the **dashboard overview**. It is deliberately the only cached read, so you can see the whole pattern in one place before applying it elsewhere.

Code: `src/server/cache/dashboard.ts`. Tests: `tests/integration/dashboard.test.ts` (the aggregates), `tests/integration/projects-api.test.ts` (a write invalidates the owner's tag) and the "dashboard updates immediately" step in `tests/e2e/main-workflow.spec.ts`.

## Why cache this, and not everything

The overview runs five aggregate queries (active projects, open tasks, overdue, completed this week, recent activity) on every dashboard visit, but only changes when that user's data changes. That's the profile worth caching: **read often, changed rarely, expensive to compute, easy to know when it changes.**

Project and task lists are *not* cached. They're cheap indexed queries, they change on almost every interaction, and caching them would add invalidation work for no visible gain. Measure before you cache.

## How it works

```ts
async function getCachedDashboardOverview(userId: string) {
  "use cache";                       // Next.js 16 Cache Components
  cacheTag(`dashboard:${userId}`);   // what we invalidate
  cacheLife("minutes");              // upper bound on staleness
  return computeDashboardOverview(userId);
}
```

- **Key.** Function arguments are part of the cache key, so each user gets their own entry.
- **Tag.** `dashboard:<userId>` lets us drop exactly one user's entry.
- **Lifetime.** `cacheLife("minutes")` expires entries after a few minutes even if an invalidation is missed, for example when a row is edited directly in SQL or by a background job that forgets to invalidate.
- **Access control.** The cached function isn't exported. Pages call `getDashboardOverview(viewer)`, which passes only the signed-in user's id. Never cache something keyed by an id that came from the request without first checking the caller may read it.
- **No request data inside.** A `'use cache'` function can't read cookies or headers. Resolve the viewer outside and pass plain values in.

## Invalidation rules

Every mutation that changes what the overview shows invalidates the **owner's** tag (not the actor's: when an admin deletes a user's project, it's the owner's dashboard that changes).

| Where the change happens | Call | Behavior |
|---|---|---|
| Server Action | `invalidateDashboardFromAction(ownerId)` → `updateTag` | Read-your-own-writes: the page rendered after the action waits for fresh data. Only allowed in Server Actions. |
| Route Handler (`/api/v1/*`) | `invalidateDashboardFromRoute(ownerId)` → `revalidateTag(tag, { expire: 0 })` | Expires immediately; the next read recomputes. |
| Background job / script | `revalidateTag(tag, { expire: 0 })` from a Route Handler the job calls, or rely on `cacheLife` | Scripts outside Next can't reach its cache directly. |

Current call sites: create/update/delete project, create/update/delete task, in both the Server Actions (`src/features/projects/actions.ts`) and the API routes. If you add a mutation that affects the counts or activity feed, add the call. `tests/integration/projects-api.test.ts` shows how to assert that a write invalidates the right tag, and the e2e test checks the change is visible on the next page load.

## Multiple instances

Next.js's default cache handler is in-memory per server process (on Vercel, the platform provides a shared, regional cache and tag invalidation works across functions).

If you self-host more than one long-running instance, an invalidation only reaches the instance that handled the mutation. Others serve their copy until `cacheLife` expires it. Your options, from simplest:

1. **Accept it.** The staleness is bounded to minutes and the user who made the change usually lands on the same instance. Fine for a dashboard summary.
2. **Shorten the lifetime** with `cacheLife("seconds")` or a custom profile.
3. **Use a shared cache handler** (for example a Redis-backed handler configured via `cacheHandlers` in `next.config.ts`) so entries and tags are shared.

## Adding your own cached read

1. Put it in `src/server/cache/<thing>.ts` with `import "server-only"`.
2. Write the uncached function in a service first and test it.
3. Wrap it: `'use cache'`, a `cacheTag` per owner (or per record), and a `cacheLife`.
4. Export a wrapper that takes the `Viewer` and authorizes before calling the cached function.
5. Export `invalidate…FromAction` / `…FromRoute` helpers and call them from every mutation.
6. Add a test that mutates and then reads.

Things that should **not** go in `'use cache'`: anything personalized by permissions you haven't encoded in the key, anything containing secrets, and anything that must be strongly consistent (balances, inventory, auth state).

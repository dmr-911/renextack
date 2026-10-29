import { sql } from "drizzle-orm";
import type { Database } from "@/server/db";
import { apiRateLimit } from "@/server/db/schema";
import { errors } from "@/server/http/errors";

export interface RateLimitRule {
  /** Maximum requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix epoch milliseconds when the current window resets. */
  resetAt: number;
}

export interface RateLimitStore {
  /** Atomically counts one hit for `key` and returns the count inside the current window. */
  hit(key: string, windowMs: number, now: number): Promise<{ count: number; windowStart: number }>;
}

/** Single-process store. Fine for local development and single-instance deployments. */
export function createMemoryStore(): RateLimitStore {
  const buckets = new Map<string, { count: number; windowStart: number }>();
  return {
    async hit(key, windowMs, now) {
      const bucket = buckets.get(key);
      if (!bucket || bucket.windowStart <= now - windowMs) {
        const fresh = { count: 1, windowStart: now };
        buckets.set(key, fresh);
        return fresh;
      }
      bucket.count += 1;
      return bucket;
    },
  };
}

/** Postgres-backed store: one atomic upsert per hit, correct across instances. */
export function createDatabaseStore(database: Database): RateLimitStore {
  return {
    async hit(key, windowMs, now) {
      const expired = sql`${apiRateLimit.windowStart} <= ${now - windowMs}`;
      const [row] = await database
        .insert(apiRateLimit)
        .values({ key, count: 1, windowStart: now })
        .onConflictDoUpdate({
          target: apiRateLimit.key,
          set: {
            count: sql`CASE WHEN ${expired} THEN 1 ELSE ${apiRateLimit.count} + 1 END`,
            windowStart: sql`CASE WHEN ${expired} THEN ${now} ELSE ${apiRateLimit.windowStart} END`,
          },
        })
        .returning({ count: apiRateLimit.count, windowStart: apiRateLimit.windowStart });
      return row!;
    },
  };
}

export function createRateLimiter(store: RateLimitStore, clock: () => number = Date.now) {
  return {
    async check(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
      const windowMs = rule.windowSeconds * 1000;
      const { count, windowStart } = await store.hit(key, windowMs, clock());
      return {
        allowed: count <= rule.limit,
        limit: rule.limit,
        remaining: Math.max(0, rule.limit - count),
        resetAt: windowStart + windowMs,
      };
    },
    /** Like `check`, but throws a 429 `AppError` when the limit is exceeded. */
    async enforce(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
      const result = await this.check(key, rule);
      if (!result.allowed) {
        throw errors.rateLimited(Math.max(1, Math.ceil((result.resetAt - clock()) / 1000)));
      }
      return result;
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

/** Named rules so limits are tuned in one place. */
export const rateLimitRules = {
  /** Writes through the public API. */
  apiWrite: { limit: 60, windowSeconds: 60 },
  /** Reads through the public API. */
  apiRead: { limit: 300, windowSeconds: 60 },
  /** Sensitive admin operations. */
  admin: { limit: 30, windowSeconds: 60 },
  /** Calls that cost money per request (AI). */
  ai: { limit: 10, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

/** Best-effort client identifier. Trusts the first X-Forwarded-For hop, as set by your host's proxy. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

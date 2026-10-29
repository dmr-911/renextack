import "server-only";
import { env } from "@/server/config/env";
import { db } from "@/server/db";
import { createDatabaseStore, createMemoryStore, createRateLimiter, type RateLimiter } from "./index";

let limiter: RateLimiter | undefined;

/** The process-wide limiter, using the store selected by RATE_LIMIT_STORE. */
export function getRateLimiter(): RateLimiter {
  limiter ??= createRateLimiter(env().RATE_LIMIT_STORE === "database" ? createDatabaseStore(db) : createMemoryStore());
  return limiter;
}

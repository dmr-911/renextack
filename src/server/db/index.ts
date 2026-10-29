import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/server/config/env";
import { logger } from "@/server/logger";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

/**
 * One connection pool per server process.
 *
 * In development, Next.js re-evaluates modules on every hot reload; caching the
 * pool on `globalThis` stops each reload from opening a fresh set of
 * connections until Postgres runs out. In production the module is evaluated
 * once, so the global is just a plain singleton.
 *
 * On serverless hosts, point DATABASE_URL at a pooled endpoint (PgBouncer,
 * Neon/Supabase pooler) and keep DATABASE_POOL_MAX small. See docs/deployment.md.
 */
const globalForDb = globalThis as unknown as { __launchstackPool?: Pool };

function createPool(): Pool {
  const config = env();
  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: config.DATABASE_POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: config.DATABASE_SSL ? { rejectUnauthorized: true } : undefined,
  });
  pool.on("error", (error) => logger.error("Idle database client error", { error }));
  return pool;
}

export function getPool(): Pool {
  globalForDb.__launchstackPool ??= createPool();
  return globalForDb.__launchstackPool;
}

let instance: Database | undefined;

export function getDb(): Database {
  instance ??= drizzle(getPool(), { schema, casing: "snake_case" });
  return instance;
}

/**
 * Lazily-initialized database handle. Importing this module never opens a
 * connection or reads configuration; the first query does. That keeps
 * `next build` and unit tests free of database requirements.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, property) {
    const real = getDb();
    const value = Reflect.get(real, property, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };

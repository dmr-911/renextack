import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../src/server/db/schema";

/**
 * Database access for CLI scripts. Scripts run outside Next.js, so they open
 * their own short-lived pool instead of importing src/server/db (which is
 * marked server-only and tied to the app's lifecycle).
 */
export function connect(url = process.env.DATABASE_URL) {
  if (!url) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env (or run `npm run setup`) first.");
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: url,
    max: 2,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  });
  const db = drizzle(pool, { schema, casing: "snake_case" });
  return { db, pool, close: () => pool.end() };
}

export function describeConnectionError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === "ECONNREFUSED") {
    return "Could not connect to Postgres. Is it running? Try `docker compose up -d`, then check DATABASE_URL.";
  }
  if (code === "28P01") return "Postgres rejected the username or password in DATABASE_URL.";
  if (code === "3D000") return "The database named in DATABASE_URL does not exist. Create it, or check the name.";
  return error instanceof Error ? error.message : String(error);
}

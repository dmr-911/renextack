import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { TEST_DATABASE_URL } from "./test-env";

/** Recreates the test database schema from the committed migrations once per run. */
export default async function setup() {
  const pool = new Pool({ connectionString: TEST_DATABASE_URL, max: 1 });
  try {
    const db = drizzle(pool);
    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
    await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
    await migrate(db, { migrationsFolder: "drizzle" });
  } catch (error) {
    throw new Error(
      `Integration tests need Postgres at ${TEST_DATABASE_URL}. Start it with \`docker compose up -d\` ` +
        `or set TEST_DATABASE_URL. Original error: ${(error as Error).message}`,
    );
  } finally {
    await pool.end();
  }
}

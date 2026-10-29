import { sql } from "drizzle-orm";
import { connect, describeConnectionError, scriptDatabaseUrl } from "./client";

/** Drops every table in the public schema. Development and test databases only. */
async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("✗ Refusing to reset a database while NODE_ENV=production.");
    process.exit(1);
  }
  const url = scriptDatabaseUrl() ?? "";
  if (!/localhost|127\.0\.0\.1|@postgres[:/]/.test(url) && process.env.ALLOW_REMOTE_RESET !== "true") {
    console.error("✗ The database URL does not point at a local database. Set ALLOW_REMOTE_RESET=true if you really mean it (e.g. a disposable Neon branch).");
    process.exit(1);
  }
  const { db, close } = connect();
  try {
    await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
    await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    await db.execute(sql`CREATE SCHEMA public`);
    console.log("✓ Database reset");
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error(`✗ Reset failed: ${describeConnectionError(error)}`);
  process.exit(1);
});

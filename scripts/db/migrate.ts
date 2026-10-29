import { migrate } from "drizzle-orm/node-postgres/migrator";
import { connect, describeConnectionError } from "./client";

/** Applies pending SQL migrations from ./drizzle. Safe to run repeatedly (and on every deploy). */
async function main() {
  const { db, close } = connect();
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("✓ Database migrations are up to date");
  } finally {
    await close();
  }
}

main().catch((error) => {
  console.error(`✗ Migration failed: ${describeConnectionError(error)}`);
  process.exit(1);
});

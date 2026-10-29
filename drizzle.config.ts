import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    // Direct (unpooled) URL when available, e.g. Neon's non-pooler endpoint.
    url:
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.DATABASE_URL ||
      "postgres://launchstack:launchstack@localhost:5432/launchstack",
  },
  strict: true,
  verbose: true,
});

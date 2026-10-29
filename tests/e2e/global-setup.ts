import { execFileSync } from "node:child_process";
import { E2E_DATABASE_URL } from "../../playwright.config";

/** Fresh schema + demo seed data for every e2e run. */
export default function globalSetup() {
  const env = {
    ...process.env,
    DATABASE_URL: E2E_DATABASE_URL,
    NODE_ENV: "development" as const,
    SEED_DEMO_PASSWORD: "demo-password-123",
  };
  for (const script of ["scripts/db/reset.ts", "scripts/db/migrate.ts", "scripts/db/seed.ts"]) {
    execFileSync("npx", ["tsx", script], { env, stdio: "inherit" });
  }
}

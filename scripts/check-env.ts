import "dotenv/config";
import { EnvValidationError, parseEnv } from "../src/server/config/env";
import { isNeonHost } from "../src/server/db/connection-options";

function describeDatabase(url: string): string {
  const host = new URL(url).hostname;
  if (isNeonHost(host)) return `Neon (${host.includes("-pooler.") ? "pooled" : "direct, consider the -pooler host"})`;
  return /^(localhost|127\.0\.0\.1|postgres)$/.test(host) ? "local Postgres" : host;
}

/** `npm run env:check`: validates .env without starting the app. */
try {
  const config = parseEnv(process.env);
  const optional = [
    ["Email", config.EMAIL_PROVIDER],
    ["Payments", config.PAYMENTS_PROVIDER],
    ["Storage", config.STORAGE_PROVIDER],
    ["Analytics", config.ANALYTICS_PROVIDER],
    ["AI", config.AI_PROVIDER],
  ];
  console.log("✓ Environment is valid");
  console.log(`  NODE_ENV=${config.NODE_ENV}  APP_URL=${config.APP_URL}  RATE_LIMIT_STORE=${config.RATE_LIMIT_STORE}`);
  console.log(`  Database  ${describeDatabase(config.DATABASE_URL)}${config.DATABASE_URL_UNPOOLED ? " + direct URL for scripts" : ""}`);
  for (const [name, value] of optional) console.log(`  ${name.padEnd(9)} ${value}`);
} catch (error) {
  console.error(error instanceof EnvValidationError ? error.message : error);
  process.exit(1);
}

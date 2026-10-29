import "dotenv/config";
import { EnvValidationError, parseEnv } from "../src/server/config/env";

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
  for (const [name, value] of optional) console.log(`  ${name.padEnd(9)} ${value}`);
} catch (error) {
  console.error(error instanceof EnvValidationError ? error.message : error);
  process.exit(1);
}

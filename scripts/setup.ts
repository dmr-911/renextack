import { randomBytes } from "node:crypto";
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * `npm run setup`: first-run helper.
 *  1. Creates .env from .env.example if it doesn't exist.
 *  2. Replaces the placeholder BETTER_AUTH_SECRET with a freshly generated one.
 *  3. Prints the remaining steps.
 * It never overwrites an existing value you've set.
 */
const PLACEHOLDER = "replace-me-with-a-long-random-string-of-32-chars-or-more";

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("✓ Created .env from .env.example");
} else {
  console.log("• .env already exists, leaving your values in place");
}

const contents = readFileSync(".env", "utf8");
if (contents.includes(`BETTER_AUTH_SECRET=${PLACEHOLDER}`)) {
  const secret = randomBytes(32).toString("base64url");
  writeFileSync(".env", contents.replace(`BETTER_AUTH_SECRET=${PLACEHOLDER}`, `BETTER_AUTH_SECRET=${secret}`));
  console.log("✓ Generated BETTER_AUTH_SECRET");
}

console.log(`
Next steps:
  docker compose up -d     # start Postgres (or point DATABASE_URL at your own)
  npm run db:migrate       # create tables
  npm run db:seed          # demo accounts + sample data (development only)
  npm run dev              # http://localhost:3000
`);

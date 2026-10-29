import { Client } from "pg";
import { E2E_DATABASE_URL } from "../../playwright.config";
import { postgresConnectionOptions } from "../../src/server/db/connection-options";

/** Reads the most recent password-reset token, standing in for "open the email". */
export async function latestResetToken(): Promise<string> {
  const client = new Client(postgresConnectionOptions(E2E_DATABASE_URL));
  await client.connect();
  try {
    const result = await client.query<{ identifier: string }>(
      `select identifier from verification where identifier like 'reset-password:%' order by created_at desc limit 1`,
    );
    const identifier = result.rows[0]?.identifier;
    if (!identifier) throw new Error("No reset token found");
    return identifier.replace("reset-password:", "");
  } finally {
    await client.end();
  }
}

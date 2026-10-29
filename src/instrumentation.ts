/**
 * Runs once when a Next.js server instance starts. Validating configuration
 * here turns a missing variable into an immediate, readable startup error
 * instead of a failure on the first request that happens to need it.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { env, EnvValidationError } = await import("@/server/config/env");
  try {
    env();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error(`\n${error.message}\n`);
    }
    throw error;
  }
}

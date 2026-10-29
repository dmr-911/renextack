/**
 * Environment for integration tests. Uses a separate database so tests never
 * touch development data. Override with TEST_DATABASE_URL.
 */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://launchstack:launchstack@localhost:5432/launchstack_test";

export function applyTestEnv() {
  Object.assign(process.env, {
    NODE_ENV: "test",
    APP_URL: "http://localhost:3000",
    DATABASE_URL: TEST_DATABASE_URL,
    DATABASE_POOL_MAX: "5",
    BETTER_AUTH_SECRET: "integration-test-secret-0123456789abcdefghijklmnop",
    LOG_LEVEL: process.env.TEST_LOG_LEVEL ?? "silent",
    RATE_LIMIT_STORE: "database",
    EMAIL_PROVIDER: "console",
  });
}

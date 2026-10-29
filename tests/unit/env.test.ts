import { describe, expect, it } from "vitest";
import { EnvValidationError, parseEnv } from "@/server/config/env";

const valid = {
  APP_URL: "http://localhost:3000",
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  BETTER_AUTH_SECRET: "x".repeat(32),
};

describe("environment validation", () => {
  it("applies defaults for optional settings", () => {
    const env = parseEnv(valid);
    expect(env).toMatchObject({ NODE_ENV: "development", DATABASE_POOL_MAX: 10, EMAIL_PROVIDER: "console", PAYMENTS_PROVIDER: "none" });
  });

  it("lists every problem in one readable error", () => {
    try {
      parseEnv({ APP_URL: "not a url" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const message = (error as Error).message;
      expect(message).toContain("APP_URL");
      expect(message).toContain("DATABASE_URL is required");
      expect(message).toContain("BETTER_AUTH_SECRET");
      expect(message).toContain(".env.example");
    }
  });

  it("accepts Neon's pooled and direct URLs", () => {
    const env = parseEnv({
      ...valid,
      DATABASE_URL: "postgresql://neondb_owner:pw@ep-x-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require",
      DATABASE_URL_UNPOOLED: "postgresql://neondb_owner:pw@ep-x.us-east-2.aws.neon.tech/neondb?sslmode=require",
    });
    expect(env.DATABASE_URL_UNPOOLED).toContain("ep-x.us-east-2");
    expect(() => parseEnv({ ...valid, DATABASE_URL_UNPOOLED: "mysql://x" })).toThrow(EnvValidationError);
  });

  it("treats empty strings as unset", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: "" })).toThrow(/DATABASE_URL/);
  });

  it("rejects non-Postgres database URLs and short secrets", () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: "mysql://x" })).toThrow(/postgres/);
    expect(() => parseEnv({ ...valid, BETTER_AUTH_SECRET: "short" })).toThrow(/32 characters/);
  });

  it("requires provider keys only when the provider is enabled", () => {
    expect(() => parseEnv({ ...valid, EMAIL_PROVIDER: "resend" })).toThrow(/RESEND_API_KEY is required/);
    expect(() => parseEnv({ ...valid, PAYMENTS_PROVIDER: "stripe", STRIPE_SECRET_KEY: "sk_test_1" })).toThrow(/STRIPE_WEBHOOK_SECRET/);
    expect(parseEnv({ ...valid, EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_123" }).EMAIL_PROVIDER).toBe("resend");
  });

  it("refuses the example secret in production", () => {
    expect(() =>
      parseEnv({ ...valid, NODE_ENV: "production", BETTER_AUTH_SECRET: "replace-me-with-a-long-random-string-of-32-chars-or-more" }),
    ).toThrow(/example value/);
  });
});

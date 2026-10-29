import { z } from "zod";

/**
 * Centralized, validated server configuration.
 *
 * Every environment variable the server reads is declared here, once. Code
 * elsewhere imports `env()` instead of touching `process.env`, so a missing or
 * malformed value fails fast with a readable message instead of surfacing as a
 * confusing runtime error deep inside a request.
 *
 * See docs/environment-variables.md for the full reference.
 */

const PLACEHOLDER_SECRET = "replace-me-with-a-long-random-string-of-32-chars-or-more";

const booleanString = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1");

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    APP_URL: z.url({ message: "APP_URL must be an absolute URL such as http://localhost:3000" }),

    DATABASE_URL: z
      .string({ message: "DATABASE_URL is required" })
      .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must start with postgres:// or postgresql://"),
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
    DATABASE_SSL: booleanString.default(false),

    BETTER_AUTH_SECRET: z
      .string({ message: "BETTER_AUTH_SECRET is required (generate one with `openssl rand -base64 32`)" })
      .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),

    LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),

    RATE_LIMIT_STORE: z.enum(["database", "memory"]).default("database"),

    EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
    EMAIL_FROM: z.string().default("LaunchStack <no-reply@example.com>"),
    RESEND_API_KEY: z.string().optional(),

    PAYMENTS_PROVIDER: z.enum(["none", "stripe"]).default("none"),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_ID: z.string().optional(),

    STORAGE_PROVIDER: z.enum(["none", "local"]).default("none"),
    STORAGE_LOCAL_DIR: z.string().default(".storage"),

    ANALYTICS_PROVIDER: z.enum(["none", "console", "posthog"]).default("none"),
    POSTHOG_API_KEY: z.string().optional(),
    POSTHOG_HOST: z.url().default("https://us.i.posthog.com"),

    AI_PROVIDER: z.enum(["none", "anthropic"]).default("none"),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default("claude-opus-5-5"),
  })
  .superRefine((value, ctx) => {
    const requireWhen = (condition: boolean, key: keyof typeof value, reason: string) => {
      if (condition && !value[key]) {
        ctx.addIssue({ code: "custom", path: [key], message: `${key} is required when ${reason}` });
      }
    };

    requireWhen(value.EMAIL_PROVIDER === "resend", "RESEND_API_KEY", "EMAIL_PROVIDER=resend");
    requireWhen(value.PAYMENTS_PROVIDER === "stripe", "STRIPE_SECRET_KEY", "PAYMENTS_PROVIDER=stripe");
    requireWhen(value.PAYMENTS_PROVIDER === "stripe", "STRIPE_WEBHOOK_SECRET", "PAYMENTS_PROVIDER=stripe");
    requireWhen(value.PAYMENTS_PROVIDER === "stripe", "STRIPE_PRICE_ID", "PAYMENTS_PROVIDER=stripe");
    requireWhen(value.ANALYTICS_PROVIDER === "posthog", "POSTHOG_API_KEY", "ANALYTICS_PROVIDER=posthog");
    requireWhen(value.AI_PROVIDER === "anthropic", "ANTHROPIC_API_KEY", "AI_PROVIDER=anthropic");

    if (value.NODE_ENV === "production" && value.BETTER_AUTH_SECRET === PLACEHOLDER_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_SECRET"],
        message: "BETTER_AUTH_SECRET still has the example value; generate a real secret for production",
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(
      [
        "Invalid or missing environment variables:",
        ...issues.map((issue) => `  - ${issue}`),
        "",
        "Copy .env.example to .env and fill in the values. See docs/environment-variables.md.",
      ].join("\n"),
    );
    this.name = "EnvValidationError";
  }
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  // Treat empty strings as "not set" so `FOO=` in a .env file behaves like an absent key.
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ""));
  const result = envSchema.safeParse(cleaned);
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
    );
  }
  return result.data;
}

let cached: Env | undefined;

/** Validated configuration. Parsed once per process, on first use. */
export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

/** For tests only: forget the memoized value so a changed process.env is re-read. */
export function resetEnvForTests() {
  cached = undefined;
}

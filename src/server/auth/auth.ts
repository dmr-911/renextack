import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { env } from "@/server/config/env";
import { db, schema } from "@/server/db";
import { passwordResetEmail, sendEmail } from "@/server/integrations/email";
import { logger } from "@/server/logger";

const log = logger.child({ module: "auth" });

function createAuth() {
  const config = env();
  return betterAuth({
    appName: "LaunchStack",
    baseURL: config.APP_URL,
    secret: config.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        rateLimit: schema.rateLimit,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      // A password reset signs the user out everywhere, in case the old password leaked.
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      async sendResetPassword({ user, url }) {
        await sendEmail(passwordResetEmail({ to: user.email, name: user.name, url }));
        log.info("Password reset requested", { userId: user.id });
      },
    },
    user: {
      additionalFields: {
        // `input: false` means sign-up and profile-update requests can never set the role.
        role: { type: "string", required: false, defaultValue: "user", input: false },
      },
      deleteUser: { enabled: true },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh expiry at most once a day
      // Cookie caching is off so role changes and revoked sessions take effect on the next
      // request. Turning it on saves a database read per request; see docs/architecture.md.
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: config.NODE_ENV !== "test",
      storage: config.RATE_LIMIT_STORE === "database" ? "database" : "memory",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60 * 15, max: 5 },
        "/reset-password": { window: 60 * 15, max: 10 },
        "/change-password": { window: 60 * 15, max: 10 },
      },
    },
    advanced: {
      useSecureCookies: config.APP_URL.startsWith("https://"),
    },
    // Must be the last plugin: lets Server Actions set auth cookies.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { __launchstackAuth?: Auth };

/** Lazily constructed so importing this module never requires configuration (e.g. during build). */
export function getAuth(): Auth {
  globalForAuth.__launchstackAuth ??= createAuth();
  return globalForAuth.__launchstackAuth;
}

import "server-only";
import { env } from "@/server/config/env";
import { logger } from "@/server/logger";
import { createConsoleEmailProvider } from "./console-provider";
import { createResendEmailProvider } from "./resend-provider";
import type { EmailMessage, EmailProvider } from "./types";

export type { EmailMessage, EmailProvider } from "./types";
export { passwordResetEmail } from "./templates";

const log = logger.child({ module: "email" });
let provider: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (provider) return provider;
  const config = env();
  if (config.EMAIL_PROVIDER === "resend") {
    provider = createResendEmailProvider({ apiKey: config.RESEND_API_KEY!, from: config.EMAIL_FROM });
  } else {
    if (config.NODE_ENV === "production") {
      log.warn("EMAIL_PROVIDER=console in production: emails are logged, not delivered");
    }
    provider = createConsoleEmailProvider(log, { includeBody: config.NODE_ENV !== "production" });
  }
  return provider;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  await getEmailProvider().send(message);
}

import type { Logger } from "@/server/logger";
import type { EmailMessage, EmailProvider } from "./types";

/**
 * Development email "delivery": prints the message to the server log so you
 * can click password-reset links without any email account. Nothing is sent.
 *
 * Bodies can contain one-time links, so they are only printed when
 * `includeBody` is true (never in production).
 */
export function createConsoleEmailProvider(log: Logger, options: { includeBody: boolean }): EmailProvider {
  return {
    name: "console",
    async send(message: EmailMessage) {
      log.info("Email (console provider, not delivered)", {
        to: message.to,
        subject: message.subject,
        body: options.includeBody ? message.text : "[hidden in production]",
      });
    },
  };
}

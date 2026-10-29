import type { EmailMessage, EmailProvider } from "./types";

/**
 * Resend adapter (https://resend.com/docs/api-reference/emails/send-email).
 * Uses the HTTP API directly, so there is no SDK dependency to keep updated.
 *
 * Status: request/response handling is covered by unit tests with a mocked
 * `fetch`. It has not been exercised against the live Resend API in this
 * repository's CI because that needs a real account. Send yourself a password
 * reset after configuring it (see docs/integrations.md).
 */
export function createResendEmailProvider(options: {
  apiKey: string;
  from: string;
  fetchImpl?: typeof fetch;
}): EmailProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    name: "resend",
    async send(message: EmailMessage) {
      const response = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: options.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Resend rejected the email (HTTP ${response.status}): ${detail.slice(0, 300)}`);
      }
    },
  };
}

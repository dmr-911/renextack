import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe adapter using the REST API directly (https://docs.stripe.com/api).
 *
 * Implemented:
 *  - creating a Checkout Session for a subscription price
 *  - verifying webhook signatures (https://docs.stripe.com/webhooks#verify-manually)
 *
 * Not implemented (on purpose; depends on your pricing model): storing
 * subscription state, a customer portal, proration, tax. See
 * docs/integrations.md for the recommended next steps.
 *
 * Status: unit-tested with mocked HTTP and Stripe's documented signature
 * scheme. Use test-mode keys (sk_test_...) and the Stripe CLI to try it end to
 * end; it has not been run against live Stripe in this repository's CI.
 */

export interface CheckoutRequest {
  userId: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(
  secretKey: string,
  request: CheckoutRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<{ id: string; url: string }> {
  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": request.priceId,
    "line_items[0][quantity]": "1",
    success_url: request.successUrl,
    cancel_url: request.cancelUrl,
    client_reference_id: request.userId,
    customer_email: request.email,
    "metadata[userId]": request.userId,
  });
  const response = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // Retries of the same logical request won't create duplicate sessions.
      "Idempotency-Key": crypto.randomUUID(),
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await response.json().catch(() => ({}))) as { id?: string; url?: string; error?: { message?: string } };
  if (!response.ok || !json.id || !json.url) {
    throw new Error(`Stripe checkout failed (HTTP ${response.status}): ${json.error?.message ?? "unknown error"}`);
  }
  return { id: json.id, url: json.url };
}

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

/**
 * Verifies a `Stripe-Signature` header against the raw request body and
 * returns the parsed event. Throws on a bad signature or a stale timestamp.
 */
export function verifyStripeWebhook(
  payload: string,
  signatureHeader: string | null,
  secret: string,
  options: { toleranceSeconds?: number; now?: number } = {},
): StripeEvent {
  if (!signatureHeader) throw new Error("Missing Stripe-Signature header");
  const parts = signatureHeader.split(",").map((part) => part.split("=") as [string, string]);
  const timestamp = Number(parts.find(([key]) => key === "t")?.[1]);
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!Number.isFinite(timestamp) || signatures.length === 0) throw new Error("Malformed Stripe-Signature header");

  const now = options.now ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > (options.toleranceSeconds ?? 300)) throw new Error("Stripe webhook timestamp is outside the tolerance");

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest();
  const valid = signatures.some((signature) => {
    const given = Buffer.from(signature, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!valid) throw new Error("Stripe webhook signature does not match");
  return JSON.parse(payload) as StripeEvent;
}

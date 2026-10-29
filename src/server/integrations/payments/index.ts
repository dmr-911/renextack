import "server-only";
import { env } from "@/server/config/env";
import { errors } from "@/server/http/errors";
import { logger } from "@/server/logger";
import { createCheckoutSession, verifyStripeWebhook, type StripeEvent } from "./stripe";

const log = logger.child({ module: "payments" });

export function paymentsEnabled(): boolean {
  return env().PAYMENTS_PROVIDER === "stripe";
}

export async function startCheckout(viewer: { id: string; email: string }): Promise<{ url: string }> {
  const config = env();
  if (config.PAYMENTS_PROVIDER !== "stripe") throw errors.notConfigured("Billing");
  try {
    const session = await createCheckoutSession(config.STRIPE_SECRET_KEY!, {
      userId: viewer.id,
      email: viewer.email,
      priceId: config.STRIPE_PRICE_ID!,
      successUrl: `${config.APP_URL}/dashboard/settings?billing=success`,
      cancelUrl: `${config.APP_URL}/dashboard/settings?billing=cancelled`,
    });
    return { url: session.url };
  } catch (error) {
    log.error("Could not start checkout", { error });
    throw errors.upstream("Billing is temporarily unavailable.");
  }
}

export function parseWebhook(payload: string, signature: string | null): StripeEvent {
  const config = env();
  if (config.PAYMENTS_PROVIDER !== "stripe") throw errors.notConfigured("Billing");
  try {
    return verifyStripeWebhook(payload, signature, config.STRIPE_WEBHOOK_SECRET!);
  } catch (error) {
    log.warn("Rejected Stripe webhook", { reason: (error as Error).message });
    throw errors.badRequest("Invalid webhook signature");
  }
}

/**
 * Extension point: react to billing events. Persist the plan on your user or
 * an `organization` table here (see docs/integrations.md#payments). Handlers
 * must be idempotent: Stripe retries deliveries.
 */
export async function handleStripeEvent(event: StripeEvent): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      log.info("Stripe event received", { eventId: event.id, type: event.type });
      break;
    default:
      log.debug("Ignoring Stripe event", { type: event.type });
  }
}

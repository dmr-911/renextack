import { errorResponse } from "@/server/http/api-route";
import { handleStripeEvent, parseWebhook } from "@/server/integrations/payments";

/** POST /api/webhooks/stripe: signature-verified Stripe events. Configure this URL in the Stripe dashboard. */
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    // The raw body is required for signature verification: don't parse it first.
    const event = parseWebhook(await request.text(), request.headers.get("stripe-signature"));
    await handleStripeEvent(event);
    return Response.json({ received: true });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

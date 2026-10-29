import { apiRoute } from "@/server/http/api-route";
import { startCheckout } from "@/server/integrations/payments";
import { rateLimitRules } from "@/server/rate-limit";

/** POST /api/v1/billing/checkout → `{ data: { url } }` to redirect to Stripe Checkout. 503 when billing is off. */
export const POST = apiRoute(
  { auth: "required", rateLimit: { name: "billing", rule: rateLimitRules.apiWrite } },
  async ({ viewer }) => startCheckout(viewer),
);

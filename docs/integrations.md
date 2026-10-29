# Optional integrations

Every integration is **off by default** and nothing in the core product (sign-up, sign-in, password reset with console email, projects, tasks, admin) needs one. Each lives in `src/server/integrations/<name>/` behind a small interface, so replacing a provider means writing one file.

When an integration is off, the UI hides its feature and its API endpoints return `503 { "error": { "code": "not_configured" } }`. Turning one on is a matter of environment variables; `npm run env:check` tells you if a required key is missing.

## Status

This table is honest about what was verified while building the kit. "Unit-tested" means the adapter's request building, response handling and error paths are tested with the provider's HTTP API or SDK mocked. It does **not** mean a live call was made.

| Integration | Provider(s) | What works | Verified how | Not included |
|---|---|---|---|---|
| **Email** | `console` (default), `resend` | Password reset emails | Console: e2e and integration tests use it for real. Resend: unit-tested against a mocked API | Other providers, email verification on sign-up, marketing email, templates beyond reset |
| **Payments** | `stripe` | Subscription Checkout session for one price; verified webhook endpoint | Unit-tested (checkout request, signature verification incl. tampering and replay) | Persisting plans, customer portal, plan gating, invoices, taxes. Webhook handler only logs events |
| **Storage** | `local` | `put` / `get` / `delete` with path-traversal protection | Unit-tested on a temp directory | S3/R2/GCS adapter, upload UI or route (the interface is ready; nothing in the example app uploads files yet) |
| **Analytics** | `console`, `posthog` | Server-side `track()`; `project_created` is sent after the response via `after()` | Unit-tested against a mocked capture API; never throws | Client-side tracking, page views, identify, feature flags |
| **AI** | `anthropic` | `POST /api/v1/projects/:id/suggestions` suggests next tasks for a project | Unit-tested with a stubbed SDK client, including refusals and messy output | UI for suggestions, streaming, usage metering or per-plan quotas |

Before relying on any provider in production, do one manual test with real sandbox credentials as described below.

## Email

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_...
EMAIL_FROM="Your App <no-reply@yourdomain.com>"
```

1. Create a Resend account, add and verify your sending domain (SPF/DKIM records).
2. Create an API key with "sending access".
3. Request a password reset in the app and confirm the email arrives.

**Sandbox:** keep `EMAIL_PROVIDER=console` in development; links are printed to the server log. Resend also allows sending to your own address before domain verification.

**Adding a provider:** implement `EmailProvider` (`send({ to, subject, html, text })`) in a new file next to `resend-provider.ts` and select it in `email/index.ts`. Templates live in `templates.ts`; always pass user-supplied values through `escapeHtml`.

## Payments

```env
PAYMENTS_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

**Sandbox setup (test mode, no charges):**

1. In the Stripe dashboard (test mode), create a Product with a recurring Price; copy the `price_…` id.
2. Copy the test secret key (`sk_test_…`).
3. Forward webhooks locally with the Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and copy the `whsec_…` it prints.
4. Restart `npm run dev`. A **Billing** card appears in Settings. "Upgrade" redirects to Checkout; pay with `4242 4242 4242 4242`.
5. Watch the server log for `Stripe event received`.

**What's implemented:** `POST /api/v1/billing/checkout` creates a subscription Checkout session with `client_reference_id` and `metadata.userId` set to the signed-in user, and an idempotency key. `POST /api/webhooks/stripe` verifies the `Stripe-Signature` header (HMAC-SHA256, constant-time compare, 5-minute tolerance) before parsing.

**What you must add** to sell a subscription (this is the extension point, in `handleStripeEvent`):

1. A table or columns for billing state, e.g. `user.plan`, `user.stripeCustomerId`, `user.subscriptionStatus`, `user.currentPeriodEnd`. Add them to the schema and run `npm run db:generate`.
2. On `checkout.session.completed`, read `client_reference_id` and store the customer and subscription ids.
3. On `customer.subscription.updated` / `.deleted`, update the status. Store `event.id` and skip duplicates: Stripe retries deliveries.
4. Gate features with a permission check in the service layer (e.g. `requirePlan(viewer, "pro")`), never only in the UI.
5. Optional: add a Customer Portal session route for self-serve cancellation.

In production, register `https://<your-domain>/api/webhooks/stripe` as an endpoint for those three events and use its signing secret. Stripe charges per transaction; there's no fixed fee.

## Storage

```env
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=.storage
```

The local provider writes to disk and is meant for development and single-server deployments with a persistent volume. It doesn't work on Vercel or other serverless hosts.

**Adding S3 / R2 / GCS:** implement `StorageProvider` from `storage/types.ts`:

```ts
export interface StorageProvider {
  readonly name: string;
  put(key: string, body: Uint8Array, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<{ body: Uint8Array; contentType: string } | null>;
  delete(key: string): Promise<void>;
}
```

using the provider's SDK, add a `STORAGE_PROVIDER` value and its keys to `env.ts`, and select it in `storage/index.ts`. When you add an upload route: authenticate it, enforce a size limit before reading the body, allow-list content types, generate keys server-side (never trust a client filename), and store ownership in your database so downloads can be authorized. For large files, prefer presigned upload URLs so files don't pass through your server.

## Analytics

```env
ANALYTICS_PROVIDER=posthog
POSTHOG_API_KEY=phc_...
POSTHOG_HOST=https://us.i.posthog.com   # or https://eu.i.posthog.com
```

Server-side events are sent with `after()`, so they never slow down or fail a request; failures are logged as warnings. Use `ANALYTICS_PROVIDER=console` to see events in the log while developing.

To track an event: `after(() => getAnalytics().track({ name: "thing_done", distinctId: viewer.id, properties: { … } }))`. Don't put personal data in properties unless your privacy policy covers it.

Client-side analytics (page views, session replay) need the provider's browser snippet, a cookie-consent decision for your jurisdiction, and the provider's origin added to the CSP `script-src` / `connect-src` in `next.config.ts`.

## AI

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-5-5
```

**Try it:**

```bash
curl -X POST http://localhost:3000/api/v1/projects/<projectId>/suggestions \
  -H "cookie: <your session cookie>"
# → { "data": { "suggestions": ["Draft the launch email", ...] } }
```

The adapter (`ai/anthropic-provider.ts`) uses the official `@anthropic-ai/sdk` with a 60 s timeout and 2 retries. A model refusal returns an empty suggestion list instead of an error. `suggest-tasks.ts` shows the pattern for any AI feature: a focused system prompt, user content passed as data, tolerant parsing of the output, and length limits on what's returned.

**Costs:** usage is billed per token by Anthropic. The suggestions endpoint is limited to 10 calls per user per hour (`rateLimitRules.ai`). Before offering AI to all users, add per-plan quotas and log usage per user.

**Adding a provider:** implement `AiProvider` (`generateText({ system, prompt, maxTokens })`) and select it in `ai/index.ts`. Features depend only on the interface.

## Writing a new integration

Copy the shape of an existing one:

1. `types.ts`: the interface your features need, not the provider's whole API.
2. `<provider>.ts`: the implementation; network calls with timeouts; provider errors turned into `errors.upstream()` with details logged.
3. `index.ts`: picks the implementation from `env()`, exports `getX()` (nullable) and `requireX()` (throws `not_configured`).
4. Env vars in `env.ts` with a `superRefine` rule for required keys, `.env.example`, and [environment-variables.md](environment-variables.md).
5. Unit tests with `fetch` or the SDK mocked, including failure paths.
6. A row in the status table above that says exactly what was verified.

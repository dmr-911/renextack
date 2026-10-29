# Security

What the kit does for you, where it lives, and what remains your responsibility. No starter kit makes an app secure on its own; this one aims to make the safe path the default path.

## Authentication

- **Passwords** are hashed by Better Auth (scrypt). Length 10–128 is enforced on the server (`src/server/auth/auth.ts`) and mirrored in the form schema.
- **Sessions** are opaque tokens in an `httpOnly`, `SameSite=Lax` cookie, `Secure` when `APP_URL` is https. Each request validates the session against the database (cookie cache off, see [architecture.md](architecture.md#better-auth-instead-of-rolling-our-own)), so revocation and role changes apply immediately.
- **Password reset** tokens are single-use and expire after 1 hour. The "forgot password" response is identical whether or not the email exists (tested). A successful reset revokes all of that user's sessions (tested).
- **Users can review and revoke sessions** and delete their account from Settings.
- **Roles can't be self-assigned**: `role` is not accepted as sign-up input (tested).
- **Open redirects** are blocked: `?next=` is only honored for same-site relative paths (`src/lib/safe-redirect.ts`, tested).
- **CSRF**: Better Auth checks the `Origin` of state-changing requests against `APP_URL`. Server Actions are POST-only and Next.js compares `Origin` with `Host`. API routes authenticate by a `SameSite=Lax` cookie, which browsers don't attach to cross-site `POST`/`PATCH`/`DELETE` requests. If you relax `SameSite` or accept bearer tokens from browsers, add an explicit `Origin` check in `apiRoute`.

## Authorization

- **Every service function authorizes** using the policies in `src/server/authz/permissions.ts`. `src/proxy.ts` only redirects for UX and is never relied on for access control.
- **Ownership failures return 404**, so another user's record ids can't be probed. Admin read-only access returns 403 on writes.
- **Admins can't demote themselves**, which prevents locking everyone out of the admin area.
- `tests/integration/authorization.test.ts` calls every API route anonymously (expects 401), as another user (expects 404), and as an admin (expects the documented matrix). Add your routes to it.

## Input validation and output encoding

- All API bodies and query strings pass through Zod (`parseOrThrow`) with length limits. Malformed JSON returns 400, not 500.
- IDs are checked to be UUIDs before querying.
- Search text is escaped for `ILIKE` (`escapeLike`) and all queries are parameterized through Drizzle. Raw SQL fragments use the `sql` template, which parameterizes interpolated values.
- React escapes all rendered text. The only `dangerouslySetInnerHTML` is the static theme script. Email templates escape interpolated values with `escapeHtml`.
- File storage keys are validated against path traversal (`assertSafeKey`).

## Rate limiting

| Scope | Limit | Where |
|---|---|---|
| Sign in | 10 / minute / IP | Better Auth |
| Sign up | 5 / minute / IP | Better Auth |
| Request password reset | 5 / 15 minutes / IP | Better Auth |
| Reset / change password | 10 / 15 minutes / IP | Better Auth |
| Other auth endpoints | 100 / minute / IP | Better Auth |
| API reads | 300 / minute / user | `rateLimitRules.apiRead` |
| API writes | 60 / minute / user | `rateLimitRules.apiWrite` |
| Admin API | 30 / minute / user | `rateLimitRules.admin` |
| AI suggestions | 10 / hour / user | `rateLimitRules.ai` |

Limits are stored in Postgres, so they hold across instances. Exceeding one returns 429 with `Retry-After`. The client IP comes from the first `X-Forwarded-For` hop: make sure your proxy sets it and strips client-supplied values (Vercel does). For heavy abuse, add a WAF or edge rate limiting in front; an app-level limiter still costs a database round trip per request.

## HTTP security headers

Set for every route in `next.config.ts` and checked by an e2e test:

- `Content-Security-Policy` (below)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`. Remove `preload` unless you intend to submit your domain to the preload list.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `frame-ancestors 'none'`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` disabling camera, microphone, geolocation and topics
- `Cross-Origin-Opener-Policy: same-origin`
- `X-Powered-By` removed

### Content Security Policy

The default policy restricts everything to `'self'` but allows `'unsafe-inline'` scripts. Next.js inlines bootstrap scripts and the theme script must run before paint, and the strict alternative, a per-request **nonce**, forces every page to render dynamically. That disables the prerendered static shell and makes the caching example pointless.

If your threat model needs a nonce-based CSP:

1. Generate a nonce in `src/proxy.ts`, set it on a request header and in the `Content-Security-Policy` response header with `'nonce-…' 'strict-dynamic'`, and widen the proxy matcher to all pages.
2. Read it in the root layout (`(await headers()).get("x-nonce")`) and pass it to `<ThemeScript nonce={…} />`.
3. Remove the CSP from `next.config.ts`.

Follow the Next.js "Content Security Policy" guide for the version you're on. When you enable integrations that load third-party scripts or call third-party APIs from the browser, add their origins to `script-src` / `connect-src`. The kit's integrations call providers from the server, so none are needed by default.

## Secrets

- Secrets are read only on the server through `src/server/config/env.ts`. Modules that touch them import `server-only`, so importing them from a client component fails the build.
- `.env*` files are git-ignored (except `.env.example`) and excluded from the Docker build context.
- The logger redacts keys matching `password|secret|token|authorization|cookie|apiKey`. Don't log whole request objects anyway.
- Production rejects the example `BETTER_AUTH_SECRET`. Demo accounts can't be seeded in production and there is no default password in application code.
- Stripe webhooks are verified with HMAC-SHA256, a constant-time comparison and a 5-minute timestamp tolerance before any event is processed.
- Client error messages never contain internal details. Unexpected errors are logged with a request id that's also returned to the client, so support can correlate.

## Dependencies

Dependabot (`.github/dependabot.yml`) opens grouped update PRs (npm weekly, GitHub Actions monthly). See [upgrading-dependencies.md](upgrading-dependencies.md). Run `npm audit --omit=dev` before releases; advisories that only affect dev tooling are lower priority but still worth tracking.

## Your responsibilities

- Choose and enforce a privacy policy and data retention; delete or anonymize data on account deletion where the law requires more than what the kit removes (it deletes the user and, via cascades, their sessions, accounts, projects, tasks and activity).
- Backups and restore drills for Postgres.
- Monitoring and alerting on error logs and `/api/health`.
- Email domain authentication (SPF, DKIM, DMARC) with your email provider.
- A security review of features you add, especially new routes: add them to the authorization test.
- Report vulnerabilities in the kit itself to the address in your license agreement.

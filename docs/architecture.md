# Architecture and design decisions

This guide explains how LaunchStack Next is put together and, more importantly, *why*. Read it before you start changing things; most of the kit's value is in the conventions, not the individual files.

## The shape of the code

```
Browser ──► src/proxy.ts ──► src/app (pages, layouts, route handlers)
                 │                  │
     cookie-presence redirect       ├─ Server Components ──► server/services ──► server/db (Drizzle) ──► Postgres
     for /dashboard/*               ├─ Server Actions   ──► server/services
                                    └─ /api/v1 handlers ──► apiRoute() ──► server/services
```

Three layers, each with one job:

| Layer | Lives in | Responsibility | Never does |
|---|---|---|---|
| **Routes** | `src/app` | Read the request, call a service, render or return the result | Query the database, decide who may do what |
| **Services** | `src/server/services` | Business rules, authorization, transactions, activity log | Read cookies or headers, know about HTTP |
| **Data** | `src/server/db` | Schema, connection pool | Contain business rules |

Every service function takes a `Viewer` (`{ id, role, email, name }`) as its first argument. That makes authorization impossible to forget: you cannot call `updateProject` without saying who is asking, and the service checks the policy before touching anything.

## Request lifecycle

**A dashboard page** (`/dashboard/projects/:id`):

1. `src/proxy.ts` checks only that a session cookie *exists*. If not, it redirects to `/sign-in?next=…`. This is a fast UX redirect, not a security boundary: cookies can be forged.
2. The page calls `requireViewer()`, which validates the session against the database via Better Auth. An invalid session redirects to sign-in.
3. The page calls `getProject(viewer, id)`. The service loads the row and applies `projectPolicy.canView`. A project you can't see returns **404**, not 403, so ids of other users' records aren't confirmed to exist.
4. Session-dependent rendering sits inside `<Suspense>` so the static shell can be prerendered (Cache Components).

**An API request** (`PATCH /api/v1/projects/:id`):

1. `apiRoute()` assigns a request id, resolves the viewer, rejects anonymous callers (401), and enforces the per-user rate limit (429 with `Retry-After`).
2. The handler validates the body with the same Zod schema the form uses (`parseOrThrow` → 422 with `fieldErrors`).
3. The service authorizes and writes, inside a transaction when it also writes activity.
4. The handler invalidates the affected cache tag and returns `{ data }`.
5. Any `AppError` becomes `{ error: { code, message, fieldErrors? }, requestId }`. Any other exception becomes a generic 500; its details go to the log only.

**A Server Action** (forms in the dashboard) follows the same path through `runAction()`, which returns an `ActionState` that `useActionState` renders inline (field errors, success message) instead of throwing.

## Key decisions

### Next.js 16.4 with Cache Components
The App Router with `cacheComponents: true` lets static parts of a page (the shell, navigation) prerender while per-user parts stream in. It is also the reason for one rule you will notice everywhere: **anything that reads cookies, headers, or the session must be inside a `<Suspense>` boundary.** The build fails loudly if you forget, which is the behavior we want.

`src/proxy.ts` is the Next 16 name for what used to be `middleware.ts`.

### Better Auth instead of rolling our own
Auth is the part of a SaaS you least want to write yourself. Better Auth is open-source, stores everything in *your* Postgres (no per-user pricing), supports email/password, sessions and rate limiting out of the box, and has a typed client. Its tables live in `src/server/db/schema/auth.ts` alongside the app's, so migrations cover both.

Choices made in `src/server/auth/auth.ts`:

- **`role` is a server-only field** (`input: false`): users can't sign up as admin by posting `role: "admin"`. Admins are promoted from the admin UI or the API.
- **Session cookie cache is off.** With it on, Better Auth trusts a signed cookie for a few minutes without hitting the database. That saves one query per request but means a revoked session or a role change takes minutes to apply. We chose correctness; turn it on (`session.cookieCache`) if you need the throughput and accept the delay.
- **Sessions are revoked on password reset**, so a reset actually locks out an attacker.
- **Rate limits are stored in Postgres** so they hold across multiple server instances.

### Drizzle ORM + plain SQL migrations
Drizzle keeps you close to SQL, has no runtime engine or binary, works in serverless and edge-adjacent environments, and generates readable migrations you commit (`drizzle/`). The database is plain Postgres, with Neon as the recommended host; `src/server/db/connection-options.ts` handles Neon's TLS and channel-binding URL parameters, and the app keeps the standard `pg` driver so the same code runs against local Postgres in tests ([neon.md](neon.md)). The `db` export is a lazy proxy, so importing it never requires `DATABASE_URL`; this is what allows `next build` to run without a database.

### Zod schemas shared by client and server
Each feature has a `schema.ts` used by the form (for instant feedback), the Server Action, and the API route. Server-side validation is never skipped; client-side validation is a convenience.

### Authorization in one pure module
`src/server/authz/permissions.ts` holds roles, permissions and per-resource policies as pure functions with no I/O, which makes them trivially unit-testable (`tests/unit/permissions.test.ts`). Services call them; routes never make their own decisions. The example policy:

| Action on a project | Owner | Admin (not owner) | Other user |
|---|---|---|---|
| View | ✓ | ✓ | 404 |
| Edit, add tasks | ✓ | 403 (read-only) | 404 |
| Delete | ✓ | ✓ (moderation) | 404 |

### Errors as values with stable codes
Services throw `AppError` with a machine-readable code (`not_found`, `validation_failed`, …). Clients switch on `code`, never on message text. Unknown errors are never echoed back, which prevents leaking stack traces or SQL.

### Logging
`src/server/logger.ts` is ~70 lines with no dependencies: JSON lines in production, readable lines in development, and automatic redaction of keys that look like secrets (`password`, `token`, `cookie`, `apiKey`, `authorization`, …). Swap it for pino if you need transports; the interface is the same shape.

### Configuration
`src/server/config/env.ts` is the **only** file that reads `process.env` for app settings (the logger reads `LOG_LEVEL` directly so it works before validation). It validates everything once with Zod and fails with a list of every problem and a pointer to `.env.example`. `src/instrumentation.ts` runs it at server start, so a misconfigured deploy fails immediately instead of on the first request.

### Optional integrations behind small interfaces
Each integration (`src/server/integrations/*`) exposes a tiny interface and a `none`/console implementation. Features check `getX()` / `requireX()`; when an integration is off, the UI hides the feature and the API returns `503 not_configured`. Nothing in the core flow depends on a paid service.

## Trade-offs we accepted (so you can revisit them)

| Decision | Cost | When to change it |
|---|---|---|
| CSP allows `'unsafe-inline'` scripts | Weaker XSS defense than a nonce-based CSP | When you can accept fully dynamic rendering; see [security.md](security.md#content-security-policy) |
| Session cookie cache off | One DB query per authenticated request | High traffic, and stale role/revocation for up to N minutes is acceptable |
| In-process cache (Next default) | Each instance has its own cache; invalidation is per instance | Multiple long-lived instances; see [caching.md](caching.md#multiple-instances) |
| Fixed-window rate limiter | Allows bursts at window edges | You need smooth limits; swap the store for a sliding window or Redis |
| Local disk storage provider | Not usable on serverless hosts | Implement the `StorageProvider` interface for S3/R2 |
| No ORM-level soft delete | Deletes are permanent | Compliance needs; add `deletedAt` and filter in services |

## What we deliberately left out

Multi-tenant organizations/teams, OAuth providers, 2FA, i18n, and a job queue. Each is a reasonable addition but would double the surface you have to understand on day one. Better Auth has plugins for organizations, social sign-in and 2FA; [adding-a-feature.md](adding-a-feature.md) shows the pattern for wiring new tables and services in.

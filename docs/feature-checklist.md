# Feature checklist

What ships in LaunchStack Next 1.0.0, and how each item is verified. ✅ = included and covered by automated tests. ☑️ = included, covered by review or manual checks only. ⚪ = extension point: the interface or hook exists, the rest is yours to build.

## Authentication

| Feature | Status | Where / how verified |
|---|---|---|
| Sign up with email + password | ✅ | integration `auth.test.ts`, e2e |
| Sign in / sign out | ✅ | integration, e2e |
| Forgot / reset password (single-use, 1 h token) | ✅ | integration (incl. session revocation), e2e |
| No account enumeration on reset | ✅ | integration |
| Protected routes (redirect with `next=`) | ✅ | e2e; `src/proxy.ts` + `requireViewer()` |
| Database sessions, list and revoke sessions | ✅ / ☑️ | sign-out revocation tested; session list UI checked manually |
| Change password, update profile, delete account | ☑️ | Better Auth endpoints; settings UI checked manually |
| Rate limits on auth endpoints | ☑️ | configured in `auth.ts`; disabled in the test environment |
| Email verification, OAuth, 2FA, magic links | ⚪ | Better Auth plugins; not enabled |

## Authorization

| Feature | Status | Where / how verified |
|---|---|---|
| `user` / `admin` roles, role not self-assignable | ✅ | unit `permissions.test.ts`, integration |
| Server-side checks in every service | ✅ | integration `authorization.test.ts` |
| Ownership → 404 for other users' records | ✅ | integration |
| Admin read-only access and moderation delete | ✅ | integration, e2e |
| Anonymous → 401 on every API route | ✅ | integration (table-driven) |
| Admin can't demote themselves | ✅ | integration |
| Teams / organizations | ⚪ | not included |

## Dashboard

| Feature | Status | Where / how verified |
|---|---|---|
| Responsive shell, desktop sidebar, mobile drawer | ✅ / ☑️ | e2e (desktop); mobile checked via screenshots |
| Overview cards and recent activity | ✅ | integration `dashboard.test.ts`, e2e |
| Projects: list, search, filter, sort, paginate, create, edit, archive, delete | ✅ | integration, e2e (create/search) |
| Tasks: add, complete (optimistic), edit, delete, due dates, priorities | ✅ | integration, e2e (add/complete) |
| Settings: profile, password, sessions, billing, delete account | ☑️ | manual |
| Admin: user directory, role changes | ✅ | integration, e2e |
| Loading, empty, error and success states | ☑️ | e2e covers empty states; others reviewed |

## Database and API

| Feature | Status | Where / how verified |
|---|---|---|
| Drizzle schema, committed migrations | ✅ | CI drift check |
| Idempotent seed, local-only demo accounts | ☑️ | run during e2e setup; production guard reviewed |
| Typed data access | ✅ | `tsc` strict |
| Validated endpoints with field errors | ✅ | integration, unit `schemas.test.ts` |
| Consistent error format with request ids | ✅ | integration |
| Pagination, filtering, search (wildcards escaped) | ✅ | integration, unit |
| Per-user API rate limits (Postgres store) | ✅ | integration (concurrency), unit |
| Neon support: pooled/direct URLs, TLS + channel binding | ✅ / ☑️ | unit `connection-options.test.ts`; **not run against a live Neon project** |
| Health check endpoint | ✅ | e2e web server readiness |

## UI

| Feature | Status | Where / how verified |
|---|---|---|
| Buttons, inputs, selects, fields, cards, alerts, badges, tables, pagination, empty states, skeletons, avatars | ✅ | unit (selected components), `/components` gallery |
| Modal and dropdown with keyboard support | ✅ | e2e accessibility test |
| Light, dark and system themes without flash | ✅ | e2e (persists across reload) |
| Skip link, focus management, labelled controls | ✅ | e2e, unit (`Field` aria wiring) |
| Design tokens | ☑️ | `globals.css` |

## Production readiness

| Feature | Status | Where / how verified |
|---|---|---|
| Environment validation with readable errors | ✅ | unit `env.test.ts`; runs at startup |
| Structured JSON logging with secret redaction | ✅ | unit `logger.test.ts` |
| Error boundaries and safe error messages | ✅ / ☑️ | API tested; page boundaries reviewed |
| Security headers and CSP | ✅ | e2e |
| Input validation and output encoding | ✅ | integration, unit (email escaping) |
| Connection pooling, lazy DB/env for builds | ☑️ | build without env verified locally |
| Caching example with documented invalidation | ✅ | integration, e2e |
| Dockerfile (standalone, non-root, health check) | ☑️ | built in CI; standalone server verified locally |
| GitHub Actions CI | ☑️ | workflow defined; runs on the PR |
| GitHub Actions deploy to Vercel | ☑️ | workflow defined; **not run against a real Vercel project** |

## Optional integrations

See the [status table](integrations.md#status) for exactly what each adapter does and how it was tested.

| Integration | Status |
|---|---|
| Email: console | ✅ |
| Email: Resend | ✅ (mocked API) |
| Payments: Stripe Checkout + webhook verification | ✅ (mocked API); plan persistence ⚪ |
| Storage: local disk | ✅; S3/R2 ⚪ |
| Analytics: console, PostHog server-side | ✅ (mocked API) |
| AI: Anthropic task suggestions API | ✅ (stubbed SDK); UI ⚪ |

## Developer experience

| Feature | Status |
|---|---|
| One install sequence, `npm run setup` | ☑️ |
| `.env.example` with comments | ☑️ |
| Docker Compose Postgres (+ test database) | ☑️ |
| `env:check`, `verify`, `db:*`, `screenshots` scripts | ☑️ |
| Guides: architecture, install, env, deploy, caching, security, testing, UI, integrations, API, adding a feature, upgrading | ☑️ |

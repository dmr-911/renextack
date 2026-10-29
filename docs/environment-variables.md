# Environment variable reference

All variables are validated in `src/server/config/env.ts` when the server starts (and by `npm run env:check`). Empty values (`FOO=`) are treated as unset. Never commit `.env`; it is git-ignored. In production, set these in your host's secret manager (Vercel Project Settings → Environment Variables, Docker `--env-file`, Kubernetes secrets…).

## Core

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | no | `development` | Set by Next.js (`production` for `next build`/`next start`). Seeding and `db:reset` refuse to run in production. |
| `APP_URL` | **yes** | – | Public origin, e.g. `https://app.example.com`. Used for auth callbacks, trusted origins and email links. `https` enables secure cookies. |
| `DATABASE_URL` | **yes** | – | `postgres://user:pass@host:5432/db`. With Neon, the **pooled** string (host contains `-pooler`). Used by the app. |
| `DATABASE_URL_UNPOOLED` | no | – | Direct (non-pooled) string, e.g. Neon with pooling off. Used by migrations, seed, reset and drizzle-kit; falls back to `DATABASE_URL`. Vercel's Neon integration sets it automatically. |
| `DATABASE_POOL_MAX` | no | `10` | Max connections per server process. Use 1–5 on serverless, 10–20 on a long-running server. |
| `DATABASE_SSL` | no | `false` | Force TLS with certificate verification. Not needed for Neon or URLs with `sslmode=require`; TLS is enabled automatically for those. |
| `BETTER_AUTH_SECRET` | **yes** | – | ≥ 32 random characters, used to sign sessions and tokens. `openssl rand -base64 32`. The example value is rejected in production. Rotating it signs everyone out. |
| `LOG_LEVEL` | no | `info` | `debug`, `info`, `warn`, `error`, or `silent`. |
| `RATE_LIMIT_STORE` | no | `database` | `database` works across instances. `memory` is per-process (fine for one server or tests). |

## Local demo data

| Variable | Required | Default | Description |
|---|---|---|---|
| `SEED_DEMO_PASSWORD` | for `db:seed` | – | Password of the demo accounts. Read only by `scripts/db/seed.ts`, which refuses to run in production. Not read by the app. |
| `TEST_DATABASE_URL` | no | `postgres://launchstack:launchstack@localhost:5432/launchstack_test` | Database for integration tests. **It is wiped.** |
| `E2E_DATABASE_URL` | no | same as above | Database for Playwright tests. **It is wiped.** |

## Email

| Variable | Required | Default | Description |
|---|---|---|---|
| `EMAIL_PROVIDER` | no | `console` | `console` logs emails (bodies hidden when `NODE_ENV=production`). `resend` sends via Resend. |
| `EMAIL_FROM` | no | `LaunchStack <no-reply@example.com>` | Sender. Must be on a domain verified with your provider. |
| `RESEND_API_KEY` | when `resend` | – | Resend API key. |

## Payments

| Variable | Required | Default | Description |
|---|---|---|---|
| `PAYMENTS_PROVIDER` | no | `none` | `none` hides billing UI; API returns 503. `stripe` enables Checkout. |
| `STRIPE_SECRET_KEY` | when `stripe` | – | Use `sk_test_…` until you go live. |
| `STRIPE_WEBHOOK_SECRET` | when `stripe` | – | `whsec_…` from the webhook endpoint (or `stripe listen`). |
| `STRIPE_PRICE_ID` | when `stripe` | – | The recurring price to sell, `price_…`. |

## Storage

| Variable | Required | Default | Description |
|---|---|---|---|
| `STORAGE_PROVIDER` | no | `none` | `local` writes files to disk. Not suitable for serverless or multiple instances. |
| `STORAGE_LOCAL_DIR` | no | `.storage` | Directory for `local`. Git-ignored. |

## Analytics

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANALYTICS_PROVIDER` | no | `none` | `console` logs events; `posthog` sends them server-side. |
| `POSTHOG_API_KEY` | when `posthog` | – | Project API key (`phc_…`). |
| `POSTHOG_HOST` | no | `https://us.i.posthog.com` | Use `https://eu.i.posthog.com` for the EU region. |

## AI

| Variable | Required | Default | Description |
|---|---|---|---|
| `AI_PROVIDER` | no | `none` | `anthropic` enables task suggestions. |
| `ANTHROPIC_API_KEY` | when `anthropic` | – | From the Anthropic Console. Usage is billed per token. |
| `ANTHROPIC_MODEL` | no | `claude-opus-5-5` | Any model id your key can use. A smaller model (e.g. `claude-haiku-5-5`) lowers cost for simple features. |

## Build and deploy only

| Variable | Where | Description |
|---|---|---|
| `BUILD_STANDALONE` | build | `true` emits `.next/standalone` (used by the Dockerfile). |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | GitHub secrets | Used by `.github/workflows/deploy.yml`. |
| `PRODUCTION_DATABASE_URL` | GitHub secret | Production database (Neon pooled URL). Required by the deploy workflow. |
| `PRODUCTION_DATABASE_URL_UNPOOLED` | GitHub secret | Optional direct URL; the deploy workflow runs migrations over it when set. |

## Adding a variable

1. Add it to `envSchema` in `src/server/config/env.ts` (with a default or a `superRefine` rule if it's conditional).
2. Add it to `.env.example` with a comment.
3. Add a row here.
4. Read it with `env().MY_VAR` in server code. Never read `process.env` directly elsewhere, and never expose secrets to client components. Only `NEXT_PUBLIC_*` variables reach the browser, and this kit doesn't need any.

# Using Neon

[Neon](https://neon.tech) is serverless PostgreSQL and the recommended database for LaunchStack Next. It's plain Postgres, so the schema, migrations and queries are unchanged; this guide covers the connection settings that matter.

## Why Neon fits the kit

- **Free tier** that's enough for development and a small launch.
- **Built-in connection pooling** (PgBouncer), which serverless hosts like Vercel need.
- **Branches**: instant copies of your database for previews, tests and safe experiments.
- **Scale to zero**: idle compute suspends, so a hobby project costs nothing while unused.

## Setup

1. Create a project at [console.neon.tech](https://console.neon.tech). Pick the region closest to where you'll host the app (e.g. `us-east-2` for Vercel's default `iad1`). The default database is `neondb` and the owner role `neondb_owner`.
2. Click **Connect**, then copy two connection strings:
   - **Pooled**, with "Connection pooling" switched on. The host contains `-pooler`.
   - **Direct**, with pooling switched off.
3. Put them in `.env`:

   ```env
   DATABASE_URL=postgresql://neondb_owner:<password>@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   DATABASE_URL_UNPOOLED=postgresql://neondb_owner:<password>@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```

4. Check and migrate:

   ```bash
   npm run env:check   # prints "Database  Neon (pooled) + direct URL for scripts"
   npm run db:migrate
   npm run db:seed     # development branches only
   npm run dev
   ```

You don't need `docker compose` or `DATABASE_SSL` with Neon.

## How the kit connects

| Who | URL used | Why |
|---|---|---|
| The app (pages, API, auth) | `DATABASE_URL` (pooled) | Many short-lived serverless instances share Neon's pooler instead of exhausting Postgres connections |
| `db:migrate`, `db:seed`, `db:reset`, `drizzle-kit` | `DATABASE_URL_UNPOOLED` (direct), falling back to `DATABASE_URL` | Migrations rely on session state and advisory locks, which a transaction-mode pooler doesn't guarantee |

`src/server/db/connection-options.ts` reads Neon's `sslmode` and `channel_binding` parameters and turns them into explicit node-postgres options: TLS with certificate verification, plus SCRAM channel binding when the URL asks for it. TLS is also enforced for any `*.neon.tech` host, even if the parameter is missing.

The kit keeps the standard `pg` driver rather than Neon's `@neondatabase/serverless` driver. `pg` works with Neon from Vercel's Node.js functions, Docker and long-running servers, supports transactions, and lets the same code and tests run against a local Postgres. The serverless driver only becomes necessary if you move database access to the Edge runtime, which this kit doesn't use.

## Production on Vercel

The easiest route is Vercel's Neon integration (Vercel project → **Storage** → **Neon**). It creates the database and sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) for you, which are the variable names this kit reads.

Or set them by hand in Project Settings → Environment Variables. Recommended values:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Pooled connection string |
| `DATABASE_URL_UNPOOLED` | Direct connection string |
| `DATABASE_POOL_MAX` | `3`. Each function instance keeps its own small pool in front of Neon's pooler |

For the GitHub Actions deploy (`.github/workflows/deploy.yml`), add repository secrets `PRODUCTION_DATABASE_URL` (pooled) and `PRODUCTION_DATABASE_URL_UNPOOLED` (direct); migrations run over the direct one. See [deployment.md](deployment.md).

## Branches for development, previews and tests

Create branches in the Neon console (Branches → New branch) or with the CLI (`npx neonctl branches create --name dev`). Each branch has its own connection strings.

- **Your local development:** a `dev` branch so you never touch production data. Seed it freely.
- **Preview deployments:** the Vercel integration can create a branch per preview deployment automatically.
- **Integration and e2e tests:** these tests wipe their database, so give them a dedicated branch:

  ```bash
  TEST_DATABASE_URL=<test branch direct URL> npm run test:integration
  E2E_DATABASE_URL=<test branch direct URL> npm run build && npm run test:e2e
  ```

  `db:reset` refuses non-local databases unless `ALLOW_REMOTE_RESET=true`; set that only for a disposable branch.

CI uses a throwaway Postgres container by default, so it needs no Neon credentials. To run CI against Neon instead, add a `TEST_DATABASE_URL` secret pointing at a test branch and remove the `services: postgres` block in `ci.yml`.

## Cold starts and limits

- On the free tier, compute suspends after 5 minutes idle. The first query after that takes a moment while it resumes. The pool waits up to 15 seconds for a connection, and `/api/health` will wake the database too. On paid plans you can turn off scale to zero for production.
- Free tier storage and compute hours are limited; check Neon's pricing page for current numbers before launch.
- Backups: Neon keeps history for point-in-time restore (the window depends on your plan). Restore by creating a branch from a past timestamp.

## Troubleshooting

**`password authentication failed`**: copy the string again from **Connect**; resetting the role password in the console invalidates the old one.

**`endpoint is disabled` or slow first request**: the compute was suspended; retry, or check the project isn't over its free-tier compute quota.

**Migrations hang or fail with prepared-statement / lock errors**: they ran over the pooled URL. Set `DATABASE_URL_UNPOOLED` to the direct string.

**`self-signed certificate` / TLS errors**: make sure the host is the real `*.neon.tech` host (not an IP or custom proxy). Certificate verification is intentionally on.

**`too many connections`**: use the pooled URL for the app and lower `DATABASE_POOL_MAX`.

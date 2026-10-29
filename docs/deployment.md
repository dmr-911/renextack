# Deployment

LaunchStack Next is a standard Next.js 16 app plus a Postgres database. Two paths are documented: **Vercel** (managed, the default `deploy.yml`) and **Docker** (any container host). Whichever you choose, the order is always:

1. Provision Postgres (Neon recommended, see [neon.md](neon.md)) and get its pooled and direct connection strings.
2. Set the [required environment variables](environment-variables.md).
3. Run migrations (`npm run db:migrate`) **before** the new version starts serving.
4. Deploy the app.
5. Check `GET /api/health` returns `{"status":"ok"}`.

> **Compatibility.** Next.js 16.4 is supported by Vercel and by `next start` / standalone output on Node.js 20.9+. The kit's CI builds the app and the Docker image on every PR. An actual deploy to Vercel or a container platform has **not** been run as part of building this kit; the workflow and Dockerfile follow each platform's documented approach, and you should do one staging deploy before relying on them.

## Production checklist

- [ ] `APP_URL` is the exact public origin with `https://`.
- [ ] `BETTER_AUTH_SECRET` is a fresh random value (not the example), stored as a secret.
- [ ] `DATABASE_URL` is the production pooled URL and `DATABASE_URL_UNPOOLED` the direct one (Neon: from your main branch). For non-Neon hosts, `DATABASE_SSL=true` if required.
- [ ] `EMAIL_PROVIDER=resend` (or another adapter) so password reset works.
- [ ] Migrations ran against the production database.
- [ ] You have **not** run `npm run db:seed` against production (it refuses, but don't try).
- [ ] Create your first admin: sign up normally, then promote that user once in SQL:
      `UPDATE "user" SET role = 'admin' WHERE email = 'you@example.com';`
      Further admins can be promoted from **Dashboard → Admin → Users**.
- [ ] If you enabled Stripe, the webhook endpoint `https://<your-domain>/api/webhooks/stripe` is registered and `STRIPE_WEBHOOK_SECRET` matches it.
- [ ] Uptime monitoring hits `/api/health` (it checks the database too, returning 503 if it's down).

## Vercel

### One-time setup

1. Create the database. The simplest option is Vercel's **Neon** integration (Project → Storage → Neon), which sets `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) for you; see [neon.md](neon.md#production-on-vercel). With any other provider, use the **pooled** connection string (PgBouncer / "transaction" mode) for `DATABASE_URL`: serverless functions open many short-lived processes, and a direct connection string will exhaust Postgres's connection limit.
2. Import the repository in Vercel. The framework preset is detected automatically. No build settings need changing.
3. In **Project Settings → Environment Variables** (Production), set `APP_URL`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (skip both if the Neon integration added them), `DATABASE_POOL_MAX=3`, `BETTER_AUTH_SECRET` and any integration keys.
4. Run migrations once from your machine: `DATABASE_URL_UNPOOLED=<direct-url> npm run db:migrate`.

At this point Vercel's Git integration can deploy on every push, but it won't run migrations. Use either approach below.

### Option A: GitHub Actions deploy (included)

`.github/workflows/deploy.yml` runs after the CI workflow succeeds on `main`, or manually from the Actions tab. It runs migrations, then builds and deploys with the Vercel CLI (pinned version). Add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Where to get it |
|---|---|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Run `npx vercel link` locally, then read `.vercel/project.json` |
| `PRODUCTION_DATABASE_URL` | Your production connection string (Neon: pooled) |
| `PRODUCTION_DATABASE_URL_UNPOOLED` | Optional: the direct string; migrations use it when present (recommended for Neon) |

Optional repository variable: `DATABASE_SSL` (defaults to `true`; harmless for Neon, where TLS is automatic).

Until those secrets exist, the workflow logs a notice and exits successfully, so a fresh copy of the kit never shows a failing deploy. The job uses a GitHub `production` environment, so you can add required reviewers there for a manual approval step.

When using this workflow, turn off automatic production deploys from Vercel's Git integration (Project Settings → Git → Ignored Build Step, or disconnect production branch deploys) so the app isn't deployed before migrations run. Preview deploys can stay on.

### Option B: Vercel Git integration only

Keep Vercel's automatic deploys and run migrations yourself (or from a separate job) **before** merging a PR that contains a new migration. Migrations in this kit are additive by default; see [Migrations that are safe to deploy](#migrations-that-are-safe-to-deploy).

### Vercel notes

- Rate limiting uses Postgres by default, so it is consistent across function instances.
- `STORAGE_PROVIDER=local` does not work on Vercel (read-only, ephemeral filesystem). Implement an S3/R2/Vercel Blob adapter; see [integrations.md](integrations.md#storage).
- Next's default cache handler stores cached data per region on Vercel and supports tag revalidation out of the box.

## Docker (self-hosting)

The `Dockerfile` builds a small image from Next's standalone output and runs as a non-root user with a health check.

```bash
docker build -t launchstack .                               # the app
docker build --target migrator -t launchstack-migrate .     # one-shot migration job

docker run --rm --env-file .env.production launchstack-migrate
docker run -d -p 3000:3000 --env-file .env.production --name launchstack launchstack
```

`.env.production` should contain the variables from the [reference](environment-variables.md), with `NODE_ENV` left unset (the image sets it). Keep that file out of git and out of the image (`.dockerignore` excludes `.env*`).

Notes for self-hosting:

- Put a reverse proxy (Caddy, nginx, Traefik, or your platform's load balancer) in front for TLS. It must set `X-Forwarded-For`; the rate limiter uses the first hop as the client IP.
- `DATABASE_POOL_MAX` is per container. `containers × pool max` must stay below your Postgres `max_connections`.
- With more than one container, the Next.js cache is per container; see [caching.md](caching.md#multiple-instances).
- For `STORAGE_PROVIDER=local`, mount a volume at the storage directory, and run a single container (or switch to object storage).
- Railway, Render, Fly.io, Google Cloud Run, AWS App Runner/ECS and Kubernetes can all run this image. Run the `migrator` target as a release/pre-deploy command where the platform supports one.

### Without Docker

```bash
npm ci
npm run build
npm run db:migrate
npm start            # listens on PORT (default 3000)
```

Use a process manager (systemd, pm2) to keep it running.

## Migrations that are safe to deploy

Because migrations run before the new code is live, the *old* code briefly runs against the *new* schema. Keep each deploy backwards compatible:

- **Adding** a table, a nullable column, or a column with a default: safe in one deploy.
- **Renaming or dropping** a column: do it in two deploys. First ship code that no longer uses it, then ship the migration that removes it.
- **Making a column required**: add it nullable, backfill, deploy code that writes it, then add `NOT NULL`.

Always review the SQL that `npm run db:generate` writes before committing it. CI fails if the schema and the committed migrations drift apart.

## Rolling back

- **App:** redeploy the previous build (Vercel: "Promote to Production" on an earlier deployment; Docker: run the previous image tag).
- **Database:** Drizzle doesn't generate down migrations. Write a new forward migration that reverts the change, or restore from your provider's point-in-time backup. Turn on automated backups before launch.

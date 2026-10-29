# Installation

## Requirements

- **Node.js 20.9 or newer** (Next.js 16's minimum). Node 22 LTS is recommended and pinned in `.nvmrc` (`nvm use`).
- **npm 10+** (ships with Node 20/22).
- **PostgreSQL 14+**. The easiest route is Docker (`docker compose up -d` uses Postgres 17). Any hosted Postgres (Neon, Supabase, RDS, Railway…) works too.

## Install sequence

```bash
git clone <your-copy-of-the-repo> my-app && cd my-app
npm install
npm run setup          # .env from .env.example + a generated BETTER_AUTH_SECRET
docker compose up -d   # Postgres on localhost:5432 (also creates launchstack_test)
npm run db:migrate
npm run db:seed        # optional demo data, development only
npm run dev
```

Open http://localhost:3000. Demo accounts (local only):

| Email | Role | Password |
|---|---|---|
| `demo@launchstack.dev` | user | value of `SEED_DEMO_PASSWORD` |
| `admin@launchstack.dev` | admin | value of `SEED_DEMO_PASSWORD` |

The seed script refuses to run when `NODE_ENV=production` and refuses if `SEED_DEMO_PASSWORD` is unset, so demo credentials can never be created in production by accident. It is idempotent: running it twice doesn't duplicate data.

### Using your own Postgres instead of Docker

Set `DATABASE_URL` in `.env`, for example:

```
DATABASE_URL=postgres://user:password@db.example.com:5432/myapp
DATABASE_SSL=true
```

For the integration and e2e tests, create a second empty database and point `TEST_DATABASE_URL` (and `E2E_DATABASE_URL`) at it. Tests reset that database; **never point them at data you care about.**

### Checking your configuration

```bash
npm run env:check
```

prints every invalid or missing variable at once, for example:

```
Invalid or missing environment variables:
  - APP_URL: APP_URL must be an absolute URL such as http://localhost:3000
  - DATABASE_URL: DATABASE_URL is required
  - BETTER_AUTH_SECRET: BETTER_AUTH_SECRET must be at least 32 characters

Copy .env.example to .env and fill in the values. See docs/environment-variables.md.
```

The same check runs when the server starts.

## Everyday commands

See the script table in the [README](../README.md#scripts). After editing `src/server/db/schema/*`, run `npm run db:generate` and commit the new file in `drizzle/`.

## Troubleshooting

**`Could not connect to Postgres. Is it running?`**
Postgres isn't reachable at `DATABASE_URL`. Run `docker compose ps`; if the container isn't healthy, `docker compose up -d` and `docker compose logs postgres`. If port 5432 is taken by another local Postgres, either stop it or change the port mapping in `docker-compose.yml` and in `DATABASE_URL`.

**`Postgres rejected the username or password`**
The credentials in `DATABASE_URL` don't match the server. With Docker, the defaults are `launchstack` / `launchstack`. If you changed them after the volume was created, Postgres keeps the old ones: `docker compose down -v` (deletes local data) and start again.

**`The database named in DATABASE_URL does not exist`**
Create it (`createdb …`) or fix the name. With Docker, `launchstack` and `launchstack_test` are created on first start only; if your volume predates that, run `docker compose exec postgres psql -U launchstack -c 'CREATE DATABASE launchstack_test'`.

**`relation "user" does not exist` or similar**
Migrations haven't run against this database: `npm run db:migrate`.

**`BETTER_AUTH_SECRET still has the example value`**
Only raised in production. Generate one with `openssl rand -base64 32` and set it in your host's secret settings.

**Signing in works locally but not on my domain (cookie not set)**
`APP_URL` must exactly match the public origin, including `https://`. Secure cookies are used automatically when `APP_URL` is https.

**Password reset email never arrives**
With `EMAIL_PROVIDER=console`, the link is printed in the terminal running `npm run dev`. In production, set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and an `EMAIL_FROM` on a domain you've verified in Resend.

**`Too many requests` while testing**
Rate limits are real in development. Wait for the window to pass, or clear them: `psql "$DATABASE_URL" -c 'TRUNCATE rate_limit, api_rate_limit'`.

**Build error mentioning `Uncached data was accessed outside of <Suspense>`**
A component reads cookies, headers, the session or `usePathname()` outside a Suspense boundary. Wrap it in `<Suspense>` (see `src/app/(app)/dashboard/layout.tsx` for the pattern).

**Playwright: `Executable doesn't exist`**
Install the browser once: `npx playwright install chromium` (on Linux CI add `--with-deps`).

**Playwright: `Timed out waiting for webServer`**
E2E runs against a production build: run `npm run build` first. Check that port 3100 is free.

**Port 3000 already in use**
`npm run dev -- -p 3001`, and set `APP_URL=http://localhost:3001`.

**Windows**
Use WSL2 for the smoothest experience. The scripts use only Node APIs, so PowerShell works too, but Docker Desktop with WSL2 is the tested setup for Postgres.

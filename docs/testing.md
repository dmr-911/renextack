# Testing

Three layers, each answering a different question:

| Layer | Tool | Question it answers | Needs | Command |
|---|---|---|---|---|
| Unit | Vitest | Does this function/component behave correctly? | Nothing | `npm run test:unit` |
| Integration | Vitest + real Postgres | Do auth, the API and authorization work together against a real database? | Postgres (`launchstack_test`) | `npm run test:integration` |
| End-to-end | Playwright (Chromium) | Can a person actually use the product? | Postgres + a production build | `npm run build && npm run test:e2e` |

Plus static checks: `npm run lint` (zero warnings) and `npm run typecheck`. `npm run verify` runs lint, typecheck, unit, integration and build in order.

## What's covered

**Unit (`tests/unit/`)**: permission matrix and policies, env validation (every error path), pagination and `ILIKE` escaping, safe redirects, task date rules, Zod schemas, rate limiter (with a fake clock), logger redaction, email templates (HTML escaping), integration adapters (Stripe webhook signatures, storage path safety, AI response parsing and refusals, analytics never throwing) with `fetch` mocked, and UI components in jsdom (field accessibility wiring, button defaults and loading state, alert roles, avatar initials).

**Integration (`tests/integration/`)**: these call the real Route Handlers and the real Better Auth instance with a real Postgres; nothing in the data path is mocked. Only `next/cache` (the cache runtime isn't available outside Next) and `after` are stubbed.

- `auth.test.ts`: sign-up, ignored client-supplied role, password policy, wrong password, forged cookies, sign-out, password reset with session revocation, no account enumeration.
- `authorization.test.ts`: every route returns 401 anonymously; other users' projects and tasks are 404 (not 403); lists don't leak; malformed ids; admin read-only/delete/scope rules; admin-only user directory; self-demotion blocked.
- `projects-api.test.ts`: CRUD, field errors, malformed JSON, pagination/filter/sort, task counts, `completedAt` bookkeeping, archived projects, cache invalidation.
- `rate-limit.test.ts`: atomic counting under concurrency and window reset in Postgres.
- `dashboard.test.ts`: overview aggregates only the user's data.

**End-to-end (`tests/e2e/`)**: a signed-out redirect; sign up → create a project in the modal → add and complete tasks → the cached dashboard updates → search/filter → regular user blocked from admin → sign out; forgot password → reset via the emailed token → sign in; admin directory and read-only project view; theme persistence; keyboard access to skip link, menus and dialogs (focus returns to the trigger); security headers.

## Running locally

```bash
docker compose up -d                 # creates launchstack and launchstack_test
npm run test:unit
npm run test:integration             # migrates launchstack_test automatically
npm run build && npm run test:e2e    # resets, migrates and seeds launchstack_test
```

First Playwright run: `npx playwright install chromium`.

Integration and e2e tests **wipe their database**. They use `launchstack_test` by default; override with `TEST_DATABASE_URL` / `E2E_DATABASE_URL`, never with your development or production URL.

Debugging: `npx playwright test --ui`, `npx playwright show-report`, `TEST_LOG_LEVEL=debug npm run test:integration` to see server logs.

## In CI

`.github/workflows/ci.yml` runs on every pull request and push to `main`:

1. **Quality**: `npm ci`, lint, typecheck, unit tests, and a check that `drizzle-kit generate` produces no new migration (schema and committed SQL agree).
2. **Integration + e2e**: a Postgres 17 service container, integration tests, `next build`, Playwright with Chromium. The HTML report is uploaded as an artifact on failure.
3. **Docker**: builds the production image (not pushed).

Make these required status checks on `main` (Settings → Branches) so nothing merges red.

## Writing tests for a new feature

- **Rules and pure logic** → unit test next to the existing ones.
- **A new API route** → add it to the anonymous-401 table and an ownership case in `authorization.test.ts`, then a behavior test. Use the helpers in `tests/integration/helpers.ts`:

  ```ts
  const alice = await createUser();
  const response = await call(POST, { method: "POST", cookie: alice.cookie, body: { name: "Hello" } });
  expect(response.status).toBe(201);
  expect(response.json.data.name).toBe("Hello");
  ```

- **A user-visible flow** → one Playwright test for the happy path. Prefer `getByRole` / `getByLabel` locators: they double as an accessibility check.
- Keep e2e few and broad, integration many and focused, and unit tests for anything with branches.

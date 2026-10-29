# Upgrading dependencies safely

The kit pins major versions with `^` ranges and commits `package-lock.json`, so every install is reproducible. Dependabot (`.github/dependabot.yml`) opens weekly npm PRs, grouping packages that must move together (Next.js + React + eslint-config-next, drizzle-orm + drizzle-kit, the test tools), and monthly GitHub Actions updates. CI runs the full suite on each.

## Routine updates (minor and patch)

1. Let the Dependabot PR's CI finish. Lint, typecheck, unit, integration, build, e2e and the Docker build all run.
2. Skim the changelogs of anything security-related (Better Auth, Next.js, `pg`).
3. Merge when green.

Locally: `npm outdated`, then `npm update` and `npm run verify && npm run build && npm run test:e2e`.

## Major upgrades

Do one major upgrade per PR so a failure has one cause.

| Package | What to check | Where it shows up |
|---|---|---|
| **next** | The official upgrade guide and codemods (`npx @next/codemod@latest upgrade`). Watch for changes to caching APIs (`'use cache'`, `cacheLife`, `updateTag`, `revalidateTag`), `proxy.ts`, async request APIs, and config keys. Keep `eslint-config-next` on the same version. | `next.config.ts`, `src/proxy.ts`, `src/server/cache/*`, every page using `params`/`searchParams` |
| **react / react-dom** | Upgrade together with `@types/react*`. Next.js pins compatible React versions; follow Next's peer range. | Forms using `useActionState`, `useOptimistic` |
| **better-auth** | Release notes for schema changes. If it adds columns, update `src/server/db/schema/auth.ts` to match (compare with `npx @better-auth/cli generate` output) and run `npm run db:generate`. | `src/server/auth/*`, auth tests |
| **drizzle-orm / drizzle-kit** | Upgrade both together. Run `npm run db:generate` afterwards: it must produce **no** new migration for an unchanged schema. | `src/server/db/*`, `drizzle/` |
| **zod** | Error message and API changes affect `toFieldErrors` and every schema. | `src/server/http/validation.ts`, `tests/unit/schemas.test.ts` |
| **tailwindcss** | Config is CSS-first (`globals.css`); check the upgrade guide for renamed utilities. Compare screenshots (`npm run screenshots`) before and after. | `src/app/globals.css`, components |
| **@radix-ui/*** | Props and data attributes used for styling. | `modal.tsx`, `dropdown-menu.tsx`, accessibility e2e test |
| **vitest / @playwright/test** | Config format changes. After a Playwright upgrade, run `npx playwright install chromium` locally; CI installs it each run. | `vitest.config.mts`, `playwright.config.ts` |
| **Node.js** | Update `.nvmrc`, the `engines` field, `NODE_VERSION` in the `Dockerfile`, and CI's `node-version-file` (it reads `.nvmrc`). | |
| **Postgres** | Update the image in `docker-compose.yml` and the CI service. Upgrading a hosted production database is a provider operation; take a backup first. | |

### Process for a major upgrade

1. Read the release notes and upgrade guide end to end.
2. Create a branch, upgrade the package (`npm install next@<version> eslint-config-next@<version>`), and run any official codemod.
3. `npm run verify`, then `npm run build && npm run test:e2e`.
4. Run the app and click through: sign up, create a project, complete a task, the dashboard, settings, admin, both themes, the mobile menu.
5. Deploy to a preview or staging environment before production.
6. Note the upgrade in `CHANGELOG.md`.

## Security advisories

- `npm audit` reports advisories; `npm audit --omit=dev` focuses on what ships to production.
- Fix with a targeted update (`npm install <pkg>@<fixed-version>`) rather than `npm audit fix --force`, which can apply breaking majors silently.
- **Known at release (1.0.0):** `npm audit` reports a moderate advisory in an old `esbuild` that `drizzle-kit` pulls in via `@esbuild-kit/*` (GHSA-67mh-4wv8-2f99, affects esbuild's dev server). drizzle-kit is a dev dependency used only to generate migrations; it isn't part of the production server bundle, and the kit never runs esbuild's dev server. The "fix" npm suggests is a drizzle-kit downgrade, so we chose to wait for an upstream release instead.

## Upgrading your copy of the kit

When a new LaunchStack Next release comes out, you'll have changed the code, so there's no automatic upgrade. Instead:

1. Read the release's `CHANGELOG.md` entry. Breaking changes and migration steps are listed there.
2. Add the kit as a second remote and diff the release tags: `git diff v1.0.0 v1.1.0 -- src/server` shows exactly what changed upstream.
3. Cherry-pick or hand-apply the parts you want. Infrastructure files (`src/server/http`, `src/server/rate-limit`, `src/server/config`) are designed to change rarely, so they're usually easy to bring over.

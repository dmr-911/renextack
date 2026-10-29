# Changelog

All notable changes to LaunchStack Next are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Versioning policy

LaunchStack Next uses [Semantic Versioning](https://semver.org/):

- **Major (2.0.0):** changes that need work in your copy: a framework major upgrade (Next.js, Better Auth, Drizzle), a schema change that needs a data migration, or a change to a core convention (service signatures, error format, API response shape).
- **Minor (1.1.0):** new features, components, integrations or guides that you can adopt without changing existing code. New migrations are additive.
- **Patch (1.0.1):** bug fixes, security fixes, dependency patch updates and documentation.

Every release entry lists **Upgrade notes** when you need to do anything besides pulling the code. Security fixes are released as patches for the latest minor version. Releases are tagged `vX.Y.Z`, so `git diff v1.0.0 v1.1.0` shows exactly what changed (see [docs/upgrading-dependencies.md](docs/upgrading-dependencies.md#upgrading-your-copy-of-the-kit)).

## [Unreleased]

## [1.0.0] - 2026-10-29

First release.

### Added

- Next.js 16.4 App Router app with strict TypeScript, Turbopack, Cache Components and React 19.3.
- Authentication with Better Auth 1.7: sign up, sign in, sign out, forgot/reset password with session revocation, change password, session list and revoke, account deletion, database-backed auth rate limits.
- Role-based authorization (`user`, `admin`) with resource policies and ownership checks in every service; 404 for records the caller can't see.
- PostgreSQL schema with Drizzle ORM, committed migrations, idempotent local seed with demo accounts, pooled connections.
- Neon as the recommended database: pooled `DATABASE_URL` for the app, direct `DATABASE_URL_UNPOOLED` for migrations and scripts, automatic TLS and channel binding for Neon URLs, and a setup guide covering branches and Vercel.
- Versioned REST API (`/api/v1`) for projects, tasks, the current user, admin user management, billing checkout and AI suggestions, with Zod validation, a single error format, request ids, pagination, filtering, search and per-user rate limits.
- Example product "Orbit": dashboard overview with cached stats and activity feed, projects and tasks CRUD with optimistic updates, settings, admin user directory.
- Accessible UI kit (button, input, select, textarea, field, card, alert, badge, table, pagination, modal, dropdown menu, empty state, skeleton, spinner, avatar) with light, dark and system themes and a live gallery at `/components`.
- Production features: validated environment configuration, structured JSON logging with redaction, security headers and CSP, health check, Dockerfile, GitHub Actions CI (lint, typecheck, unit, integration, e2e, migration drift, Docker build) and Vercel deploy workflow.
- Optional integrations, off by default: email (console, Resend), payments (Stripe Checkout + verified webhooks), storage (local), analytics (console, PostHog), AI (Anthropic).
- Tests: Vitest unit and integration (real Postgres) suites and Playwright end-to-end tests.
- Documentation: architecture, installation and troubleshooting, environment reference, deployment, caching, security, testing, UI, integrations, API, adding a feature, upgrading, feature checklist.
- Example marketing landing page (`/`) and a standalone sales page template (`packaging/landing-page`).

### Known limitations

- The Vercel deploy workflow and the live Resend, Stripe, PostHog and Anthropic APIs were not exercised against real accounts before release; the adapters are tested against mocked APIs. See [docs/integrations.md](docs/integrations.md#status).
- `npm audit` reports a moderate advisory in a dev-only dependency of drizzle-kit. See [docs/upgrading-dependencies.md](docs/upgrading-dependencies.md#security-advisories).

[Unreleased]: https://github.com/your-org/launchstack-next/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-org/launchstack-next/releases/tag/v1.0.0

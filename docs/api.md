# API reference

A versioned JSON API under `/api/v1`. The dashboard uses Server Actions, but every operation is also available here for mobile apps, integrations, or scripts.

## Conventions

**Authentication.** Session cookie from Better Auth (sign in via `/api/auth/sign-in/email`). All `/api/v1` routes require a signed-in user; anonymous calls get 401.

**Success responses.** `{ "data": … }`. Lists add pagination:

```json
{ "data": [ … ], "pagination": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 } }
```

`201` for creates, `204` (empty body) for deletes.

**Errors.** Always the same shape, and every response has an `X-Request-Id` header that matches `requestId`:

```json
{
  "error": { "code": "validation_failed", "message": "Some fields are invalid", "fieldErrors": { "name": ["Name must be at least 2 characters"] } },
  "requestId": "6f1c…"
}
```

| Status | `code` | Meaning |
|---|---|---|
| 400 | `bad_request` | Malformed JSON or request |
| 401 | `unauthorized` | Not signed in |
| 403 | `forbidden` | Signed in, but your role can't do this (e.g. an admin editing someone else's project) |
| 404 | `not_found` | Doesn't exist **or isn't yours** (deliberately indistinguishable) |
| 409 | `conflict` | Valid request that conflicts with current state |
| 422 | `validation_failed` | Field errors in `fieldErrors` |
| 429 | `rate_limited` | See `Retry-After` header (seconds) |
| 502 | `upstream_error` | A third-party provider failed |
| 503 | `not_configured` | The optional integration is turned off |
| 500 | `internal_error` | Unexpected; details are in the server log under the request id |

Clients should branch on `code`, not on `message`.

**Pagination.** `page` (≥ 1, default 1) and `pageSize` (1–100, default 20).

**Caching.** API responses are `Cache-Control: no-store`.

**Rate limits.** Reads 300/min, writes 60/min, admin 30/min, AI 10/hour, per user. See [security.md](security.md#rate-limiting).

## Resources

### `GET /api/v1/me`
The signed-in user: `{ id, email, name, role }`.

### Projects

A project: `{ id, ownerId, name, description, status: "active" | "archived", createdAt, updatedAt, taskCount, openTaskCount }`.

| Method & path | Body / query | Who | Notes |
|---|---|---|---|
| `GET /api/v1/projects` | `q` (name search), `status`, `sort` (`updated` · `created` · `name`), `scope` (`mine` · `all`), `page`, `pageSize` | Any user | `scope=all` requires admin (403 otherwise) |
| `POST /api/v1/projects` | `{ name, description? }` | Any user | 201. Name 2–120 chars, description ≤ 2000 |
| `GET /api/v1/projects/:projectId` | | Owner, admin | Others: 404 |
| `PATCH /api/v1/projects/:projectId` | `{ name?, description?, status? }` (at least one) | Owner | Admin: 403 |
| `DELETE /api/v1/projects/:projectId` | | Owner, admin | 204. Deletes its tasks too |

### Tasks

A task: `{ id, projectId, title, status: "todo" | "in_progress" | "done", priority: "low" | "medium" | "high", dueDate, completedAt, createdAt, updatedAt }`.

| Method & path | Body / query | Who | Notes |
|---|---|---|---|
| `GET /api/v1/projects/:projectId/tasks` | `status`, `priority`, `page`, `pageSize` | Owner, admin | |
| `POST /api/v1/projects/:projectId/tasks` | `{ title, priority?, dueDate? }` | Owner | 201. 409 if the project is archived. `dueDate` is `YYYY-MM-DD` or ISO |
| `PATCH /api/v1/tasks/:taskId` | `{ title?, status?, priority?, dueDate? }` | Project owner | `completedAt` is set/cleared automatically with `status`. `dueDate: null` clears it |
| `DELETE /api/v1/tasks/:taskId` | | Project owner | 204 |

### AI suggestions (optional)

`POST /api/v1/projects/:projectId/suggestions` → `{ data: { suggestions: string[] } }`. Owner or admin. 503 unless `AI_PROVIDER` is set. See [integrations.md](integrations.md#ai).

### Billing (optional)

`POST /api/v1/billing/checkout` → `{ data: { url } }`. Redirect the browser to `url`. 503 unless `PAYMENTS_PROVIDER=stripe`.

`POST /api/webhooks/stripe` is called by Stripe, not by clients. It rejects requests without a valid signature (400).

### Admin

| Method & path | Body / query | Who |
|---|---|---|
| `GET /api/v1/admin/users` | `q` (name or email), `role`, `page`, `pageSize` | Admin |
| `PATCH /api/v1/admin/users/:userId` | `{ role: "user" \| "admin" }` | Admin. 409 if you try to remove your own admin role |

### Health

`GET /api/health` → `200 {"status":"ok"}` or `503 {"status":"unavailable"}`. Public; checks the database.

### Auth

Better Auth's endpoints are mounted at `/api/auth/*` (e.g. `sign-up/email`, `sign-in/email`, `sign-out`, `request-password-reset`, `reset-password`, `change-password`, `list-sessions`, `revoke-session`, `delete-user`). Prefer the typed client in `src/lib/auth-client.ts` from React; see the [Better Auth docs](https://www.better-auth.com/docs) for the HTTP details.

## Example

```bash
# Sign in and keep the cookie
curl -c cookies.txt -H 'content-type: application/json' \
  -d '{"email":"demo@launchstack.dev","password":"demo-password-123"}' \
  http://localhost:3000/api/auth/sign-in/email

# Create a project
curl -b cookies.txt -H 'content-type: application/json' \
  -d '{"name":"API project"}' http://localhost:3000/api/v1/projects

# List active projects, sorted by name
curl -b cookies.txt 'http://localhost:3000/api/v1/projects?status=active&sort=name'
```

## Adding an endpoint

See [adding-a-feature.md](adding-a-feature.md#5-api-route). In short: wrap the handler in `apiRoute({ auth: "required", rateLimit })`, validate with the feature's Zod schema, call a service, invalidate caches, and add the route to `tests/integration/authorization.test.ts`.

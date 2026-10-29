# Adding a new feature

This walk-through adds **Notes**: short notes attached to a project, visible to whoever can see the project and editable only by its owner. Follow the same nine steps for any feature. Each step points at the existing file to copy.

## 1. Schema and migration

Add the table to `src/server/db/schema/app.ts` (copy `task`):

```ts
export const note = pgTable(
  "note",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").notNull().references(() => project.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("note_project_idx").on(table.projectId)],
);
```

```bash
npm run db:generate   # writes drizzle/000X_*.sql: read it before committing
npm run db:migrate
```

Index every foreign key you filter by. Commit the migration with the schema change; CI fails if they drift.

## 2. Validation schema

`src/features/notes/schema.ts` (copy `src/features/tasks/schema.ts`):

```ts
export const noteInputSchema = z.object({
  body: z.string().trim().min(1, "Write something").max(5000, "Notes are limited to 5000 characters"),
});
```

The same schema validates the form, the Server Action and the API.

## 3. Authorization

Notes inherit the project's rules, so reuse `projectPolicy` (view = owner or admin, edit = owner). If a feature has its own rules, add a policy in `src/server/authz/permissions.ts` and unit-test the matrix in `tests/unit/permissions.test.ts`. If it needs a new capability for a role, add it to `ROLE_PERMISSIONS`.

## 4. Service

`src/server/services/notes.ts` (copy `tasks.ts`). Every exported function takes the `Viewer` first and authorizes before reading or writing:

```ts
export async function addNote(viewer: Viewer, projectId: string, input: NoteInput) {
  const found = await requireEditable(db, viewer, projectId); // 404 if not visible, 403 if read-only
  const [created] = await db.insert(note).values({ projectId: found.id, body: input.body }).returning();
  return created!;
}

export async function listNotes(viewer: Viewer, projectId: string) {
  const found = await getProject(viewer, projectId);         // 404 unless owner or admin
  return db.select().from(note).where(eq(note.projectId, found.id)).orderBy(desc(note.createdAt));
}
```

Throw `errors.*` for expected failures. Wrap multi-table writes in `db.transaction`. If the change should appear in the activity feed, insert an `activity` row in the same transaction.

## 5. API route

`src/app/api/v1/projects/[projectId]/notes/route.ts` (copy the tasks route):

```ts
export const POST = apiRoute<{ projectId: string }>(
  { auth: "required", rateLimit: { name: "api-write", rule: rateLimitRules.apiWrite } },
  async ({ request, params, viewer }) => {
    const input = parseOrThrow(noteInputSchema, await readJson(request));
    return created(await addNote(viewer, params.projectId, input));
  },
);
```

Keep handlers thin: no queries or permission checks here.

## 6. Server Action and UI

`src/features/notes/actions.ts` (copy `src/features/projects/actions.ts`):

```ts
"use server";
export async function addNoteAction(projectId: string, _prev: ActionState, formData: FormData) {
  return runAction(async () => {
    const viewer = await requireViewer();
    const input = parseOrThrow(noteInputSchema, Object.fromEntries(formData));
    await addNote(viewer, projectId, input);
    return { status: "success", message: "Note added" };
  });
}
```

Then a form component with `useActionState` and the UI kit (`Field`, `Textarea`, `Button loading`), modeled on `src/features/tasks/components/task-form.tsx`. Render the list in the project page, inside the existing Suspense boundary. Handle the empty state with `EmptyState`.

## 7. Caching (only if needed)

Lists like this don't need caching. If the feature changes what the dashboard overview shows, call `invalidateDashboardFromAction(ownerId)` / `invalidateDashboardFromRoute(ownerId)` after the write. For a new cached read, follow [caching.md](caching.md#adding-your-own-cached-read).

## 8. Tests

- **Unit:** the schema's edge cases (`tests/unit/schemas.test.ts`), plus any new policy.
- **Integration:** add the new route to the anonymous-401 table in `tests/integration/authorization.test.ts`; add "another user gets 404" and "admin gets 403 on write"; add a behavior test for create + list.
- **E2E:** extend the main workflow only if notes are a key user journey.

Run `npm run verify`.

## 9. Docs

Add the endpoints to [api.md](api.md), any new env vars to [environment-variables.md](environment-variables.md), and a line to `CHANGELOG.md` under "Unreleased".

## Checklist

- [ ] Migration generated, reviewed, committed
- [ ] Zod schema shared by form, action and API
- [ ] Every service function takes `Viewer` and checks a policy
- [ ] Not-yours returns 404, read-only returns 403
- [ ] Route uses `apiRoute` with a rate limit rule
- [ ] Loading, empty, error and success states in the UI
- [ ] Cache invalidated if a cached read depends on it
- [ ] Route added to the authorization test
- [ ] Docs and changelog updated

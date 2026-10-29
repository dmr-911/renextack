import { eq, like } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { getAuth } from "@/server/auth/auth";
import { getViewerFromHeaders } from "@/server/auth/viewer";
import { db } from "@/server/db";
import { user, verification } from "@/server/db/schema";
import { cookieHeader, createUser, PASSWORD, signIn } from "./helpers";

describe("authentication", () => {
  it("signs up a user with the default role and an active session", async () => {
    const created = await createUser();
    const viewer = await getViewerFromHeaders(new Headers({ cookie: created.cookie }));
    expect(viewer).toMatchObject({ id: created.id, email: created.email, role: "user" });
  });

  it("ignores a role supplied by the client at sign-up", async () => {
    const email = `escalate-${Date.now()}@test.local`;
    await getAuth()
      .api.signUpEmail({ body: { email, password: PASSWORD, name: "Mallory", role: "admin" } as never })
      .catch(() => undefined);
    const row = await db.query.user.findFirst({ where: eq(user.email, email) });
    // Better Auth either rejects the field or drops it; in both cases nobody becomes admin.
    expect(row?.role ?? "user").toBe("user");
  });

  it("rejects passwords shorter than the configured minimum", async () => {
    const response = await getAuth().api.signUpEmail({
      body: { email: `short-${Date.now()}@test.local`, password: "short", name: "Short" },
      asResponse: true,
    });
    expect(response.status).toBe(400);
  });

  it("rejects a wrong password and accepts the right one", async () => {
    const created = await createUser();
    expect((await signIn(created.email, "wrong-password-123")).status).toBe(401);
    const ok = await signIn(created.email, PASSWORD);
    expect(ok.status).toBe(200);
    expect(cookieHeader(ok)).toContain("better-auth.session_token=");
  });

  it("returns no viewer for a missing or forged session cookie", async () => {
    expect(await getViewerFromHeaders(new Headers())).toBeNull();
    expect(await getViewerFromHeaders(new Headers({ cookie: "better-auth.session_token=forged.value" }))).toBeNull();
  });

  it("invalidates the session on sign-out", async () => {
    const created = await createUser();
    const headers = new Headers({ cookie: created.cookie });
    await getAuth().api.signOut({ headers });
    expect(await getViewerFromHeaders(headers)).toBeNull();
  });

  it("resets a password with an emailed token and revokes existing sessions", async () => {
    const created = await createUser();
    await getAuth().api.requestPasswordReset({ body: { email: created.email, redirectTo: "/reset-password" } });

    const [record] = await db.select().from(verification).where(like(verification.identifier, "reset-password:%"));
    expect(record).toBeDefined();
    const token = record!.identifier.replace("reset-password:", "");

    await getAuth().api.resetPassword({ body: { token, newPassword: "a-brand-new-password" } });

    expect(await getViewerFromHeaders(new Headers({ cookie: created.cookie }))).toBeNull();
    expect((await signIn(created.email, PASSWORD)).status).toBe(401);
    expect((await signIn(created.email, "a-brand-new-password")).status).toBe(200);

    // Tokens are single-use.
    await expect(getAuth().api.resetPassword({ body: { token, newPassword: "yet-another-password" } })).rejects.toThrow();
  });

  it("does not reveal whether an email is registered when requesting a reset", async () => {
    const result = await getAuth().api.requestPasswordReset({
      body: { email: `nobody-${Date.now()}@test.local`, redirectTo: "/reset-password" },
    });
    expect(result).toMatchObject({ status: true });
  });
});

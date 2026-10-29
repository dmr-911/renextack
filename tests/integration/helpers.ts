import { eq, sql } from "drizzle-orm";
import { getAuth } from "@/server/auth/auth";
import { db } from "@/server/db";
import { user } from "@/server/db/schema";

let counter = 0;

export const PASSWORD = "correct-horse-battery";

/** Signs up a fresh user through Better Auth and returns a Cookie header for authenticated requests. */
export async function createUser(options: { role?: "user" | "admin"; name?: string } = {}) {
  counter += 1;
  const email = `user${Date.now()}-${counter}@test.local`;
  const name = options.name ?? `Test User ${counter}`;
  const response = await getAuth().api.signUpEmail({
    body: { email, password: PASSWORD, name },
    asResponse: true,
  });
  if (!response.ok) throw new Error(`Sign-up failed: ${response.status} ${await response.text()}`);
  const body = (await response.json()) as { user: { id: string } };
  if (options.role === "admin") await db.update(user).set({ role: "admin" }).where(eq(user.id, body.user.id));
  return { id: body.user.id, email, name, cookie: cookieHeader(response) };
}

export async function signIn(email: string, password: string) {
  return getAuth().api.signInEmail({ body: { email, password }, asResponse: true });
}

export function cookieHeader(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

type Handler = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

/** Invokes a Route Handler exactly as Next.js would, with optional auth cookie and JSON body. */
export async function call(
  handler: Handler,
  options: { path?: string; method?: string; cookie?: string; body?: unknown; params?: Record<string, string>; rawBody?: string } = {},
) {
  const headers = new Headers({ "x-forwarded-for": "203.0.113.10" });
  if (options.cookie) headers.set("cookie", options.cookie);
  if (options.body !== undefined || options.rawBody !== undefined) headers.set("content-type", "application/json");
  const request = new Request(`http://localhost:3000${options.path ?? "/api/test"}`, {
    method: options.method ?? "GET",
    headers,
    body: options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
  });
  const response = await handler(request, { params: Promise.resolve(options.params ?? {}) });
  const text = await response.text();
  return { status: response.status, headers: response.headers, json: text ? JSON.parse(text) : null };
}

export async function resetAppTables() {
  await db.execute(sql`TRUNCATE "activity", "task", "project", "api_rate_limit" RESTART IDENTITY CASCADE`);
}

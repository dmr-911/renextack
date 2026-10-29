import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuth } from "./auth";
import { toRole, type Viewer } from "@/server/authz/permissions";

export type { Viewer } from "@/server/authz/permissions";

/**
 * Resolves the signed-in user from request headers, or null.
 *
 * This is the only place the app turns a session cookie into an identity.
 * Everything downstream receives a narrow `Viewer`, never the raw session.
 */
export async function getViewerFromHeaders(requestHeaders: Headers): Promise<Viewer | null> {
  const result = await getAuth().api.getSession({ headers: requestHeaders });
  if (!result) return null;
  const { user } = result;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    role: toRole(user.role),
  };
}

/** Current viewer for Server Components and Server Actions. Deduplicated per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  return getViewerFromHeaders(await headers());
});

/** For pages and actions that need a user: redirects to sign-in when there is none. */
export async function requireViewer(returnTo?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    redirect(returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}` : "/sign-in");
  }
  return viewer;
}

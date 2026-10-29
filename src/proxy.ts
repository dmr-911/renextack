import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic route protection.
 *
 * This only checks that a session cookie *exists*, so signed-out visitors are
 * redirected before any page code runs. It does not validate the session:
 * real authorization happens on the server in every page, Server Action, and
 * API route (see src/server/auth/viewer.ts). Never rely on this file alone.
 */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

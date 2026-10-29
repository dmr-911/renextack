"use client";

import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { Auth } from "@/server/auth/auth";

/**
 * Browser-side auth client. Talks to /api/auth/* on the same origin, so no
 * base URL configuration is needed. Use it in Client Components for sign-in,
 * sign-up, password reset, and session management UI.
 */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<Auth>()],
});

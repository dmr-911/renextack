import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/server/auth/auth";

/** Better Auth's endpoints: /api/auth/sign-in/email, /api/auth/sign-up/email, /api/auth/reset-password, ... */
export const { GET, POST } = toNextJsHandler((request) => getAuth().handler(request));

import { z } from "zod";

/** Mirrors the server-side rules in src/server/auth/auth.ts (min 10, max 128). */
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be 128 characters or fewer");

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be 100 characters or fewer"),
  email: z.email("Enter a valid email address"),
  password: passwordSchema,
});

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((value) => value.password === value.confirm, { path: ["confirm"], message: "Passwords don't match" });

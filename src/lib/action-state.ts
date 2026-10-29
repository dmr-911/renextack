/**
 * Result shape for Server Actions used with `useActionState`. Mirrors the API
 * error format so forms can show the same field-level messages.
 */
export type ActionState =
  | { status: "idle" }
  | { status: "success"; message?: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> };

export const idleState: ActionState = { status: "idle" };

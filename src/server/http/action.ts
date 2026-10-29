import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { logger } from "@/server/logger";
import { isAppError } from "./errors";

export type { ActionState } from "@/lib/action-state";

/**
 * Runs Server Action logic and converts known `AppError`s into an error state.
 * Next.js control-flow errors (redirect, notFound) are re-thrown untouched.
 * Unknown errors are logged and replaced by a generic message, so internals
 * never reach the browser.
 */
export async function runAction(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (error) {
    unstable_rethrow(error);
    if (isAppError(error)) {
      return { status: "error", message: error.message, fieldErrors: error.details?.fieldErrors };
    }
    logger.error("Unhandled Server Action error", { error });
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}

/**
 * Application errors with a stable machine-readable `code` and HTTP status.
 *
 * Services throw these; the API wrapper (`apiRoute`) and Server Action helper
 * (`runAction`) translate them into consistent responses. Anything else that
 * is thrown is treated as an unexpected 500 and its message is never shown to
 * the client.
 */

export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation_failed"
  | "rate_limited"
  | "not_configured"
  | "upstream_error"
  | "internal_error";

export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    message: string,
    public readonly details?: { fieldErrors?: FieldErrors; retryAfterSeconds?: number },
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errors = {
  badRequest: (message = "The request is malformed") => new AppError("bad_request", 400, message),
  unauthorized: (message = "You must be signed in") => new AppError("unauthorized", 401, message),
  forbidden: (message = "You do not have permission to do that") => new AppError("forbidden", 403, message),
  // Also used when a record exists but belongs to someone else, so existence isn't leaked.
  notFound: (resource = "Resource") => new AppError("not_found", 404, `${resource} not found`),
  conflict: (message: string) => new AppError("conflict", 409, message),
  validation: (fieldErrors: FieldErrors, message = "Some fields are invalid") =>
    new AppError("validation_failed", 422, message, { fieldErrors }),
  /** An optional integration (payments, AI, ...) is switched off in configuration. */
  notConfigured: (feature: string) =>
    new AppError("not_configured", 503, `${feature} is not enabled on this server`),
  /** A third-party provider failed. The message is safe to show; details belong in logs. */
  upstream: (message = "An external service is unavailable. Please try again.") =>
    new AppError("upstream_error", 502, message),
  rateLimited: (retryAfterSeconds: number) =>
    new AppError("rate_limited", 429, "Too many requests, please slow down", { retryAfterSeconds }),
};

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

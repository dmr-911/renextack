import "server-only";
import { getViewerFromHeaders } from "@/server/auth/viewer";
import type { Viewer } from "@/server/authz/permissions";
import { logger, type Logger } from "@/server/logger";
import { clientIp, type RateLimitRule } from "@/server/rate-limit";
import { getRateLimiter } from "@/server/rate-limit/server";
import { AppError, errors, isAppError } from "./errors";

/**
 * The single wrapper every API Route Handler goes through. It provides:
 *
 *  - a request id (echoed in `X-Request-Id` and in error bodies) for log correlation
 *  - authentication: `auth: "required"` rejects anonymous callers with 401
 *  - optional rate limiting, keyed by user id (or IP when anonymous)
 *  - one error format for every failure: `{ error: { code, message, fieldErrors? }, requestId }`
 *  - structured access logs, without leaking internal error messages to clients
 *
 * Route handlers stay thin: parse input, call a service, return data.
 */

interface BaseContext<Params> {
  request: Request;
  params: Params;
  requestId: string;
  log: Logger;
}

type Handler<Params, V> = (context: BaseContext<Params> & { viewer: V }) => Promise<Response | unknown>;

interface Options {
  rateLimit?: { name: string; rule: RateLimitRule };
}

type NextRouteContext = { params: Promise<Record<string, string | string[]>> };

export function apiRoute<Params extends Record<string, string> = Record<string, never>>(
  options: Options & { auth: "required" },
  handler: Handler<Params, Viewer>,
): (request: Request, context: NextRouteContext) => Promise<Response>;
export function apiRoute<Params extends Record<string, string> = Record<string, never>>(
  options: Options & { auth: "optional" },
  handler: Handler<Params, Viewer | null>,
): (request: Request, context: NextRouteContext) => Promise<Response>;
export function apiRoute<Params extends Record<string, string>>(
  options: Options & { auth: "required" | "optional" },
  handler: Handler<Params, Viewer> | Handler<Params, Viewer | null>,
) {
  return async (request: Request, context: NextRouteContext): Promise<Response> => {
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
    const url = new URL(request.url);
    const log = logger.child({ requestId, method: request.method, path: url.pathname });
    const started = performance.now();

    let response: Response;
    try {
      const viewer = await getViewerFromHeaders(request.headers);
      if (options.auth === "required" && !viewer) throw errors.unauthorized();

      if (options.rateLimit) {
        const subject = viewer ? `user:${viewer.id}` : `ip:${clientIp(request)}`;
        await getRateLimiter().enforce(`${options.rateLimit.name}:${subject}`, options.rateLimit.rule);
      }

      const params = (await context.params) as unknown as Params;
      // Safe: with auth "required", a null viewer was rejected above.
      const result = await (handler as Handler<Params, Viewer | null>)({ request, params, requestId, log, viewer });
      response = result instanceof Response ? result : Response.json({ data: result });
    } catch (error) {
      response = errorResponse(error, requestId, log);
    }

    response.headers.set("X-Request-Id", requestId);
    response.headers.set("Cache-Control", response.headers.get("Cache-Control") ?? "no-store");
    log.info("API request", { status: response.status, durationMs: Math.round(performance.now() - started) });
    return response;
  };
}

export function errorResponse(error: unknown, requestId: string, log: Logger = logger): Response {
  const appError: AppError = isAppError(error)
    ? error
    : new AppError("internal_error", 500, "Something went wrong. Please try again.");

  if (!isAppError(error)) log.error("Unhandled API error", { error });

  const headers = new Headers();
  if (appError.details?.retryAfterSeconds) {
    headers.set("Retry-After", String(appError.details.retryAfterSeconds));
  }
  return Response.json(
    {
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details?.fieldErrors ? { fieldErrors: appError.details.fieldErrors } : {}),
      },
      requestId,
    },
    { status: appError.status, headers },
  );
}

/** 201 Created with a JSON `{ data }` body. */
export function created(data: unknown): Response {
  return Response.json({ data }, { status: 201 });
}

/** 204 No Content. */
export function noContent(): Response {
  return new Response(null, { status: 204 });
}

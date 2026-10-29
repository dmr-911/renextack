import type { z } from "zod";
import { errors, type FieldErrors } from "./errors";

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

/** Parses input with a Zod schema, throwing a 422 `AppError` with per-field messages. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw errors.validation(toFieldErrors(result.error));
  return result.data;
}

/** Reads a JSON body, mapping malformed JSON to a 400 instead of a 500. */
export async function readJson(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    throw errors.badRequest("Expected a JSON body with Content-Type: application/json");
  }
  try {
    return await request.json();
  } catch {
    throw errors.badRequest("Request body is not valid JSON");
  }
}

export function searchParamsToObject(params: URLSearchParams): Record<string, string> {
  return Object.fromEntries(params.entries());
}

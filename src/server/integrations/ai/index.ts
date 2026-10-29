import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/server/config/env";
import { errors } from "@/server/http/errors";
import { logger } from "@/server/logger";
import { createAnthropicProvider } from "./anthropic-provider";
import type { AiProvider } from "./types";

export type { AiProvider, TextGenerationRequest, TextGenerationResult } from "./types";

let provider: AiProvider | null | undefined;

/** The configured AI provider, or null when AI_PROVIDER=none. */
export function getAiProvider(): AiProvider | null {
  if (provider !== undefined) return provider;
  const config = env();
  provider =
    config.AI_PROVIDER === "anthropic"
      ? createAnthropicProvider({ apiKey: config.ANTHROPIC_API_KEY!, model: config.ANTHROPIC_MODEL })
      : null;
  return provider;
}

/** Like getAiProvider, but throws a 503 `not_configured` error when AI is off. */
export function requireAiProvider(): AiProvider {
  const configured = getAiProvider();
  if (!configured) throw errors.notConfigured("AI");
  return configured;
}

/** Maps provider SDK errors to safe AppErrors; rethrows anything else. */
export function toAiError(error: unknown): never {
  if (error instanceof Anthropic.RateLimitError) throw errors.upstream("The AI provider is busy. Try again shortly.");
  if (error instanceof Anthropic.APIError) {
    logger.error("AI provider error", { status: error.status, message: error.message });
    throw errors.upstream();
  }
  throw error;
}

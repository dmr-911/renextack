import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider, TextGenerationRequest, TextGenerationResult } from "./types";

/**
 * Anthropic (Claude) adapter using the official SDK.
 *
 * - Model comes from ANTHROPIC_MODEL (default `claude-opus-5-5`).
 * - Server-side refusal fallback is enabled (`fallbacks: "default"`): if the
 *   model declines on policy grounds, the API retries on a suitable fallback
 *   model within the same call. Remove the two marked lines to opt out.
 * - A final `refusal` stop reason is reported as `completed: false` rather
 *   than an exception, so callers can show a friendly message.
 *
 * Status: covered by unit tests with a stubbed client; not exercised against
 * the live API in CI (that needs a paid key). See docs/integrations.md.
 */
export function createAnthropicProvider(options: { apiKey: string; model: string; client?: Anthropic }): AiProvider {
  const client = options.client ?? new Anthropic({ apiKey: options.apiKey, timeout: 60_000, maxRetries: 2 });
  return {
    name: "anthropic",
    async generateText(request: TextGenerationRequest): Promise<TextGenerationResult> {
      const response = await client.beta.messages.create({
        model: options.model,
        max_tokens: request.maxTokens ?? 2_000,
        output_config: { effort: "low" },
        betas: ["server-side-fallback-2026-07-01"], // refusal fallback (opt-out: remove)
        fallbacks: "default", // refusal fallback (opt-out: remove)
        ...(request.system ? { system: request.system } : {}),
        messages: [{ role: "user", content: request.prompt }],
      });
      if (response.stop_reason === "refusal") return { text: "", completed: false };
      const text = response.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("")
        .trim();
      return { text, completed: true };
    },
  };
}

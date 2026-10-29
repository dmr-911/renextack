import { z } from "zod";
import type { AiProvider } from "./types";

/**
 * Example AI feature: suggest next tasks for a project. Pure function over an
 * AiProvider, so it is unit-testable without any network access.
 */
const SYSTEM = [
  "You help small teams plan work.",
  "Reply with a JSON array of 3 to 5 short task titles (each under 80 characters) and nothing else.",
  "Do not repeat tasks the project already has.",
].join(" ");

const suggestionsSchema = z.array(z.string().trim().min(1).max(200)).min(1).max(5);

export async function suggestTasks(
  provider: AiProvider,
  project: { name: string; description: string; existingTasks: string[] },
): Promise<string[]> {
  const prompt = [
    `Project: ${project.name}`,
    project.description ? `Description: ${project.description}` : "",
    project.existingTasks.length ? `Existing tasks:\n- ${project.existingTasks.slice(0, 50).join("\n- ")}` : "No tasks yet.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await provider.generateText({ system: SYSTEM, prompt, maxTokens: 1_000 });
  if (!result.completed) return [];
  return parseSuggestions(result.text);
}

/** Tolerates code fences or surrounding prose; returns [] if no valid list is found. */
export function parseSuggestions(text: string): string[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = suggestionsSchema.safeParse(JSON.parse(match[0]));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

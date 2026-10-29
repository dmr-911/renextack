import type { Logger } from "@/server/logger";

export interface AnalyticsEvent {
  /** e.g. "project_created". Use snake_case, past tense. */
  name: string;
  /** Stable, non-PII identifier: the user id, never an email address. */
  distinctId: string;
  properties?: Record<string, string | number | boolean | null>;
}

export interface Analytics {
  readonly name: string;
  /** Fire-and-forget: never throws, never blocks the user on a slow provider. */
  track(event: AnalyticsEvent): Promise<void>;
}

export function createAnalytics(options: {
  provider: "none" | "console" | "posthog";
  posthog?: { apiKey: string; host: string };
  log: Logger;
  fetchImpl?: typeof fetch;
}): Analytics {
  if (options.provider === "console") {
    return { name: "console", track: async (event) => options.log.info("Analytics event", { ...event }) };
  }
  if (options.provider === "posthog" && options.posthog) {
    const { apiKey, host } = options.posthog;
    const fetchImpl = options.fetchImpl ?? fetch;
    return {
      name: "posthog",
      async track(event) {
        try {
          // https://posthog.com/docs/api/capture
          const response = await fetchImpl(`${host.replace(/\/$/, "")}/i/v0/e/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: apiKey,
              event: event.name,
              distinct_id: event.distinctId,
              properties: event.properties ?? {},
              timestamp: new Date().toISOString(),
            }),
            signal: AbortSignal.timeout(3_000),
          });
          if (!response.ok) options.log.warn("PostHog rejected an event", { status: response.status });
        } catch (error) {
          options.log.warn("PostHog capture failed", { error });
        }
      },
    };
  }
  return { name: "none", track: async () => {} };
}

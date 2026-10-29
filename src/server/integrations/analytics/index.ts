import "server-only";
import { env } from "@/server/config/env";
import { logger } from "@/server/logger";
import { createAnalytics, type Analytics } from "./providers";

export type { Analytics, AnalyticsEvent } from "./providers";

let instance: Analytics | undefined;

/** Server-side product analytics. A no-op unless ANALYTICS_PROVIDER is set. */
export function getAnalytics(): Analytics {
  if (instance) return instance;
  const config = env();
  instance = createAnalytics({
    provider: config.ANALYTICS_PROVIDER,
    posthog: config.POSTHOG_API_KEY ? { apiKey: config.POSTHOG_API_KEY, host: config.POSTHOG_HOST } : undefined,
    log: logger.child({ module: "analytics" }),
  });
  return instance;
}

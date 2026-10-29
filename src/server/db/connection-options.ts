import type { PoolConfig } from "pg";

/**
 * Turns a DATABASE_URL into node-postgres options. Shared by the app and the
 * CLI scripts, so it must not import anything server-only.
 *
 * Neon (and most hosted Postgres) hands out URLs like
 *   postgresql://user:pass@ep-x-pooler.region.aws.neon.tech/neondb?sslmode=require&channel_binding=require
 * node-postgres doesn't apply `channel_binding` from the URL, and warns about
 * `sslmode=require` changing meaning in its next major. So we read both
 * ourselves, drop them from the URL, and pass explicit options instead:
 *  - TLS with certificate verification when DATABASE_SSL=true, the URL asks
 *    for it, or the host is on neon.tech (Neon always requires TLS)
 *  - SCRAM channel binding when the URL says `channel_binding=require`
 */
export function postgresConnectionOptions(
  url: string,
  options: { ssl?: boolean } = {},
): Pick<PoolConfig, "connectionString" | "ssl"> & { enableChannelBinding?: boolean } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { connectionString: url, ssl: options.ssl ? { rejectUnauthorized: true } : undefined };
  }

  const sslmode = parsed.searchParams.get("sslmode");
  const channelBinding = parsed.searchParams.get("channel_binding");
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("channel_binding");

  const urlWantsSsl = sslmode !== null && sslmode !== "disable";
  const ssl = options.ssl || urlWantsSsl || isNeonHost(parsed.hostname);

  return {
    connectionString: parsed.toString(),
    ssl: ssl ? { rejectUnauthorized: true } : undefined,
    ...(channelBinding === "require" ? { enableChannelBinding: true } : {}),
  };
}

export function isNeonHost(hostname: string): boolean {
  return hostname === "neon.tech" || hostname.endsWith(".neon.tech");
}

/** Turns a User-Agent string into a short label like "Chrome on macOS". Display only, never for security. */
export function describeUserAgent(agent?: string | null): string {
  if (!agent) return "Unknown device";
  const browser = /Firefox\//.test(agent)
    ? "Firefox"
    : /Edg\//.test(agent)
      ? "Edge"
      : /Chrome\//.test(agent)
        ? "Chrome"
        : /Safari\//.test(agent)
          ? "Safari"
          : "Browser";
  const os = /Windows/.test(agent)
    ? "Windows"
    : /iPhone|iPad/.test(agent)
      ? "iOS"
      : /Mac OS/.test(agent)
        ? "macOS"
        : /Android/.test(agent)
          ? "Android"
          : /Linux/.test(agent)
            ? "Linux"
            : "";
  return os ? `${browser} on ${os}` : browser;
}

/**
 * Minimal structured logger.
 *
 * Emits one JSON object per line in production (easy to ingest in any log
 * platform) and a compact human-readable line in development. Keys that look
 * like secrets are redacted before anything is written.
 *
 * Deliberately dependency-free: it works the same in Node, in route handlers,
 * in scripts, and in tests without bundler configuration.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const LEVELS: Record<LogLevel | "silent", number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
const REDACT = /pass(word)?|secret|token|authorization|cookie|api[-_]?key/i;

function currentThreshold(): number {
  const configured = (process.env.LOG_LEVEL ?? "info") as keyof typeof LEVELS;
  return LEVELS[configured] ?? LEVELS.info;
}

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || typeof value !== "object") return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Fields).map(([key, inner]) => [
      key,
      REDACT.test(key) ? "[redacted]" : redact(inner, depth + 1),
    ]),
  );
}

function write(level: LogLevel, message: string, fields: Fields) {
  if (LEVELS[level] < currentThreshold()) return;
  const entry = { level, time: new Date().toISOString(), msg: message, ...(redact(fields) as Fields) };
  const line =
    process.env.NODE_ENV === "production"
      ? JSON.stringify(entry)
      : `${entry.time} ${level.toUpperCase().padEnd(5)} ${message}${
          Object.keys(fields).length ? ` ${JSON.stringify(redact(fields))}` : ""
        }`;
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export interface Logger {
  debug(message: string, fields?: Fields): void;
  info(message: string, fields?: Fields): void;
  warn(message: string, fields?: Fields): void;
  error(message: string, fields?: Fields): void;
  child(bindings: Fields): Logger;
}

export function createLogger(bindings: Fields = {}): Logger {
  return {
    debug: (message, fields = {}) => write("debug", message, { ...bindings, ...fields }),
    info: (message, fields = {}) => write("info", message, { ...bindings, ...fields }),
    warn: (message, fields = {}) => write("warn", message, { ...bindings, ...fields }),
    error: (message, fields = {}) => write("error", message, { ...bindings, ...fields }),
    child: (more) => createLogger({ ...bindings, ...more }),
  };
}

export const logger = createLogger();

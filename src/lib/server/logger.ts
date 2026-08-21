/**
 * A thin structured-logging wrapper. This doesn't ship logs anywhere new --
 * it still writes to console (still picked up by `wrangler tail`/the local
 * dev console) -- it just gives every log line a consistent, greppable JSON
 * shape (timestamp, level, message, requestId, context) instead of whatever
 * shape the thrown error happened to have, and applies a basic secret-
 * pattern redaction pass as defense-in-depth. This is the "structured logs"
 * half of the readiness checklist's observability item; shipping these
 * somewhere queryable (Sentry/Logtail/etc.) needs an external account this
 * session can't create on your behalf -- see the readiness follow-up list.
 */

const SECRET_KEY_PATTERN = /(key|secret|token|password|authorization)/i;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._-]+/gi;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[redacted:too-deep]";
  if (typeof value === "string") {
    return value.replace(BEARER_PATTERN, "Bearer [redacted]");
  }
  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEY_PATTERN.test(k) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

interface LogContext {
  requestId?: string;
  [key: string]: unknown;
}

function write(level: "error" | "warn" | "info", message: string, context?: LogContext, error?: unknown): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context: redact(context) } : {}),
    ...(error !== undefined
      ? {
          error:
            error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : redact(error),
        }
      : {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  error: (message: string, context?: LogContext, error?: unknown) => write("error", message, context, error),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
};

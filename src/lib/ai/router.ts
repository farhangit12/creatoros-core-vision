import { getFallbackTextProvider, getTextProvider, resolveOperation } from "./registry";
import { ProviderHttpError, type TextProviderRequest, type TextProviderResult } from "./providers/types";
import type { TextOperation } from "./operations";

/**
 * Server-side provider-selection layer on top of the existing TextProvider
 * abstraction (providers/types.ts). Does not implement any provider itself --
 * it only decides which already-registered provider/model (from registry.ts)
 * to call, and retries with the configured fallback on an availability
 * failure. text-service.ts calls this instead of getTextProvider(...).generate()
 * directly so a fallback can occur without changing any TextService/server-fn
 * contract.
 */
export interface RoutedTextResult {
  result: TextProviderResult;
  provider: string;
  model: string;
  fellBack: boolean;
}

// Bounds how long this router waits on a single provider call. Well under a
// Workers request's hard ceiling, generous for real generation latency. A
// timeout rejects with a message containing "timeout", which
// isRetryableProviderError already classifies as retryable -- so it
// correctly triggers fallback instead of the request hanging indefinitely.
// Note this only bounds the *caller's wait*: without threading an
// AbortSignal into every provider adapter's fetch call, the original
// request keeps running in the background until it naturally settles. A
// real cancel would need that signal threaded through -- reported as a
// follow-up (see "job cancellation" in the readiness audit), not silently
// treated as solved here.
const PROVIDER_TIMEOUT_MS = 55_000;

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// Best-effort, per-isolate circuit breaker: after several consecutive
// failures for a given provider+operation, skip straight to fallback
// instead of paying the primary's latency/quota on a call likely to fail
// again. Explicitly NOT a distributed breaker -- Cloudflare Workers run many
// independent isolates with no shared memory, so this state only persists
// for one warm isolate's lifetime. Still a real, honest improvement over no
// breaker at all: a hot isolate serving repeated traffic stops hammering a
// provider that's currently down. Same "best-effort, storage-dependent"
// honesty pattern better-auth's own rate limiter uses for its in-memory
// fallback.
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_RESET_MS = 30_000;
const circuitState = new Map<string, { failures: number; openUntil: number }>();

function circuitKey(provider: string, operation: string): string {
  return `${provider}:${operation}`;
}

function isCircuitOpen(provider: string, operation: string): boolean {
  const entry = circuitState.get(circuitKey(provider, operation));
  if (!entry) return false;
  if (entry.openUntil > 0 && Date.now() < entry.openUntil) return true;
  if (entry.openUntil > 0 && Date.now() >= entry.openUntil) {
    circuitState.delete(circuitKey(provider, operation));
  }
  return false;
}

function recordCircuitOutcome(provider: string, operation: string, succeeded: boolean): void {
  const key = circuitKey(provider, operation);
  if (succeeded) {
    circuitState.delete(key);
    return;
  }
  const entry = circuitState.get(key) ?? { failures: 0, openUntil: 0 };
  entry.failures += 1;
  if (entry.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    entry.openUntil = Date.now() + CIRCUIT_RESET_MS;
  }
  circuitState.set(key, entry);
}

/**
 * Only availability-shaped failures trigger a fallback: rate limits (429),
 * upstream 5xx, and transport-level failures (timeout/connection reset,
 * which surface as plain Error instances from fetch, not ProviderHttpError).
 * Anything else -- bad input, missing config, a provider explicitly
 * rejecting an unsupported operation -- is a real error and must propagate
 * unchanged, per the "do not blindly fall back" requirement.
 */
function isRetryableProviderError(error: unknown): boolean {
  if (error instanceof ProviderHttpError) {
    return error.status === 429 || error.status >= 500;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("fetch failed") ||
      message.includes("econnreset") ||
      message.includes("econnrefused") ||
      message.includes("timeout") ||
      message.includes("temporarily rate-limited") ||
      message.includes("rate limit") ||
      message.includes("rate-limited") ||
      message.includes("unavailable")
    );
  }
  return false;
}

export async function generateText(
  operation: TextOperation,
  request: Omit<TextProviderRequest, "operation" | "model">,
  /** Overrides the primary model only (e.g. a caller-supplied model); the fallback always uses its configured model. */
  primaryModelOverride?: string,
): Promise<RoutedTextResult> {
  const config = resolveOperation(operation);
  const primaryProvider = getTextProvider(operation);
  const primaryModel = primaryModelOverride ?? config.model;
  const fallback = config.fallback;

  const openCircuitFallback = fallback && isCircuitOpen(config.provider, operation)
    ? getFallbackTextProvider(operation)
    : undefined;
  if (fallback && openCircuitFallback) {
    const result = await withTimeout(
      openCircuitFallback.generate({ ...request, operation, model: fallback.model }),
      PROVIDER_TIMEOUT_MS,
      `${fallback.provider}/${operation}`,
    );
    recordCircuitOutcome(fallback.provider, operation, true);
    return { result, provider: fallback.provider, model: fallback.model, fellBack: true };
  }

  try {
    const result = await withTimeout(
      primaryProvider.generate({ ...request, operation, model: primaryModel }),
      PROVIDER_TIMEOUT_MS,
      `${config.provider}/${operation}`,
    );
    recordCircuitOutcome(config.provider, operation, true);
    return { result, provider: config.provider, model: primaryModel, fellBack: false };
  } catch (primaryError) {
    recordCircuitOutcome(config.provider, operation, false);
    const fallbackProvider = fallback ? getFallbackTextProvider(operation) : undefined;

    if (!fallback || !fallbackProvider || !isRetryableProviderError(primaryError)) {
      throw primaryError;
    }

    try {
      const result = await withTimeout(
        fallbackProvider.generate({ ...request, operation, model: fallback.model }),
        PROVIDER_TIMEOUT_MS,
        `${fallback.provider}/${operation}`,
      );
      recordCircuitOutcome(fallback.provider, operation, true);
      return { result, provider: fallback.provider, model: fallback.model, fellBack: true };
    } catch (fallbackError) {
      recordCircuitOutcome(fallback.provider, operation, false);
      const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(
        `Primary provider "${config.provider}" failed: ${primaryMessage}. Fallback provider "${fallback.provider}" also failed: ${fallbackMessage}.`,
      );
    }
  }
}

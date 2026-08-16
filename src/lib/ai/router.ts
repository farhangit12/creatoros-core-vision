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

  try {
    const result = await primaryProvider.generate({ ...request, operation, model: primaryModel });
    return { result, provider: config.provider, model: primaryModel, fellBack: false };
  } catch (primaryError) {
    const fallback = config.fallback;
    const fallbackProvider = fallback ? getFallbackTextProvider(operation) : undefined;

    if (!fallback || !fallbackProvider || !isRetryableProviderError(primaryError)) {
      throw primaryError;
    }

    try {
      const result = await fallbackProvider.generate({ ...request, operation, model: fallback.model });
      return { result, provider: fallback.provider, model: fallback.model, fellBack: true };
    } catch (fallbackError) {
      const primaryMessage = primaryError instanceof Error ? primaryError.message : String(primaryError);
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(
        `Primary provider "${config.provider}" failed: ${primaryMessage}. Fallback provider "${fallback.provider}" also failed: ${fallbackMessage}.`,
      );
    }
  }
}

/**
 * Server-only boundary: provider adapters (providers/text/*, providers/image/*)
 * are the sole place that will ever hold real API keys / SDK clients (Phase 3G).
 * Everything above this layer — registry.ts, text-service.ts, image-service.ts,
 * and the server functions that will call them in Phase 3E — must go through
 * the TextProvider / ImageProvider interfaces below rather than importing a
 * provider module's internals directly.
 */
import type { ImageOperation, TextOperation } from "../operations";
import type { ChatMessage, TokenUsage } from "../types";

export interface TextProviderRequest {
  operation: TextOperation;
  model: string;
  messages?: ChatMessage[];
  prompt?: string;
  metadata?: Record<string, unknown>;
  /**
   * Wired by router.ts's withTimeout so a timed-out call actually aborts
   * the underlying fetch, instead of just abandoning the caller's wait
   * while the real request keeps running server-side (see router.ts's
   * PROVIDER_TIMEOUT_MS comment). Adapters that call fetch() directly
   * (groq.ts, openrouter.ts) should pass this through as the request's
   * `signal` option.
   */
  signal?: AbortSignal;
}

export interface TextProviderResult {
  content: string;
  finishReason: "stop" | "length" | "error";
  usage: TokenUsage;
}

export interface TextProvider {
  id: string;
  label: string;
  generate(request: TextProviderRequest): Promise<TextProviderResult>;
}

/**
 * Thrown by HTTP-based provider adapters (groq.ts, openrouter.ts) on a
 * non-2xx response, carrying the status code so callers (router.ts) can
 * classify failures as retryable (429/5xx) without string-matching error
 * messages. Adapters that don't hit an HTTP API directly (gemini.ts uses the
 * SDK) aren't required to use this.
 */
export class ProviderHttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ProviderHttpError";
    this.status = status;
  }
}

export interface ImageProviderRequest {
  operation: ImageOperation;
  model: string;
  prompt: string;
  count: number;
  aspectRatio: string;
  style?: string | undefined;
  sourceAssetId?: string;
  /**
   * Publicly fetchable URL of a source/reference image, resolved by the
   * caller so providers never need their own DB access (keeps the
   * server-only boundary above scoped to API keys / SDK clients only).
   * Required for image.variation (the asset being varied); optional for
   * image.generate (a user-supplied reference image for img2img).
   */
  sourceAssetUrl?: string;
  /**
   * Exact text the user wants rendered legibly in the output (e.g. a
   * thumbnail headline). Diffusion models render text unreliably, so
   * providers should composite this as a real text overlay (e.g. a
   * Cloudinary l_text transformation) instead of asking the model to draw
   * the characters itself.
   */
  overlayText?: string;
  metadata?: Record<string, unknown>;
}

export interface ImageProviderAsset {
  url: string;
  width: number;
  height: number;
  variantIndex: number;
  recommended: boolean;
}

export interface ImageProviderResult {
  assets: ImageProviderAsset[];
}

export interface ImageProvider {
  id: string;
  label: string;
  generate(request: ImageProviderRequest): Promise<ImageProviderResult>;
}

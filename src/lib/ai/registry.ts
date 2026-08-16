import { mockImageProvider } from "./providers/image/mock";
import { cloudflareImageProvider } from "./providers/image/cloudflare";
import { mockTextProvider } from "./providers/text/mock";
import { geminiTextProvider } from "./providers/text/gemini";
import { openrouterTextProvider } from "./providers/text/openrouter";
import { groqTextProvider } from "./providers/text/groq";
import type { ImageProvider, TextProvider } from "./providers/types";
import type { AiFeature, ImageOperation, TextOperation } from "./operations";

export interface OperationConfig {
  operation: TextOperation | ImageOperation;
  feature: AiFeature;
  provider: string;
  model: string;
  /**
   * Optional secondary provider/model to retry with when the primary fails
   * for an availability reason (429/5xx/timeout/unavailable), per router.ts.
   * Undefined means no fallback is configured for this operation.
   */
  fallback?: { provider: string; model: string };
}

// Preserved from the Phase 3H-A paid-OpenRouter routing decision (2026-08-16)
// for a future production upgrade -- NOT currently wired into the registry
// below. gpt-5.6-luna for chat/rewrite, claude-sonnet-5 for script generation.
const OPENROUTER_CHAT_MODEL = "openai/gpt-5.6-luna";
const OPENROUTER_SCRIPT_GENERATE_MODEL = "anthropic/claude-sonnet-5";
const OPENROUTER_SCRIPT_REWRITE_MODEL = "openai/gpt-5.6-luna";

// Locked by the Phase 3H-A.2 free-provider benchmark (2026-08-16): Groq's
// llama-3.3-70b-versatile is primary for all three text operations (generous
// per-account 12K TPM / 1K RPD headroom, no shared-pool contention, quality
// close to the OpenRouter free candidates). OpenRouter's free Nemotron 3
// Ultra is the fallback for availability failures only -- see router.ts.
const GROQ_TEXT_MODEL = "llama-3.3-70b-versatile";
const FREE_FALLBACK_PROVIDER = openrouterTextProvider.id;
const FREE_FALLBACK_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
const FREE_FALLBACK = { provider: FREE_FALLBACK_PROVIDER, model: FREE_FALLBACK_MODEL };

// Phase 3H-B: Cloudflare Workers AI, model flux-2-klein-4b (see
// providers/image/cloudflare.ts for why this model was picked over
// SDXL/flux-1-schnell/flux-2-klein-9b). Covers all three image operations,
// including image.variation, since it's the one free-plan model verified to
// support real image-to-image editing.
const CLOUDFLARE_IMAGE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";

/**
 * Operation -> provider/model mapping. Picking a different provider or model
 * per operation is a change confined to this table.
 */
const registry: Record<TextOperation | ImageOperation, OperationConfig> = {
  chat: {
    operation: "chat",
    feature: "chat",
    provider: groqTextProvider.id,
    model: GROQ_TEXT_MODEL,
    fallback: FREE_FALLBACK,
  },
  "script.generate": {
    operation: "script.generate",
    feature: "script-studio",
    provider: groqTextProvider.id,
    model: GROQ_TEXT_MODEL,
    fallback: FREE_FALLBACK,
  },
  "script.rewrite": {
    operation: "script.rewrite",
    feature: "script-studio",
    provider: groqTextProvider.id,
    model: GROQ_TEXT_MODEL,
    fallback: FREE_FALLBACK,
  },
  "structured.generate": {
    operation: "structured.generate",
    feature: "chat",
    provider: mockTextProvider.id,
    model: "mock-text-precise",
  },
  "image.generate": {
    operation: "image.generate",
    feature: "image-studio",
    provider: cloudflareImageProvider.id,
    model: CLOUDFLARE_IMAGE_MODEL,
  },
  "thumbnail.generate": {
    operation: "thumbnail.generate",
    feature: "thumbnail-studio",
    provider: cloudflareImageProvider.id,
    model: CLOUDFLARE_IMAGE_MODEL,
  },
  "image.variation": {
    operation: "image.variation",
    feature: "image-studio",
    provider: cloudflareImageProvider.id,
    model: CLOUDFLARE_IMAGE_MODEL,
  },
};

const textProviders: Record<string, TextProvider> = {
  [mockTextProvider.id]: mockTextProvider,
  [geminiTextProvider.id]: geminiTextProvider,
  [openrouterTextProvider.id]: openrouterTextProvider,
  [groqTextProvider.id]: groqTextProvider,
};

const imageProviders: Record<string, ImageProvider> = {
  [mockImageProvider.id]: mockImageProvider,
  [cloudflareImageProvider.id]: cloudflareImageProvider,
};

export function resolveOperation(operation: TextOperation | ImageOperation): OperationConfig {
  return registry[operation];
}

function getTextProviderById(providerId: string): TextProvider {
  const provider = textProviders[providerId];
  if (!provider) {
    throw new Error(`No text provider registered for id "${providerId}".`);
  }
  return provider;
}

export function getTextProvider(operation: TextOperation): TextProvider {
  return getTextProviderById(resolveOperation(operation).provider);
}

/** Returns the configured fallback TextProvider for an operation, if any. */
export function getFallbackTextProvider(operation: TextOperation): TextProvider | undefined {
  const fallback = resolveOperation(operation).fallback;
  return fallback ? getTextProviderById(fallback.provider) : undefined;
}

function getImageProviderById(providerId: string): ImageProvider {
  const provider = imageProviders[providerId];
  if (!provider) {
    throw new Error(`No image provider registered for id "${providerId}".`);
  }
  return provider;
}

export function getImageProvider(operation: ImageOperation): ImageProvider {
  return getImageProviderById(resolveOperation(operation).provider);
}

export function listOperations(): OperationConfig[] {
  return Object.values(registry);
}

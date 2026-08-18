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

// ASCEND A3 (2026-08-18): llama-3.3-70b-versatile was removed from Groq's
// catalog entirely (confirmed via a live GET /openai/v1/models call against
// this project's key -- it's no longer in the list at all, and every chat/
// script request was failing with a real 404 "model does not exist"). Replaced
// with groq/compound-mini after checking the current live model list and
// testing real candidates against our actual prompts (chat, script.generate's
// JSON-array shape, script.rewrite) -- see router.ts's isRetryableProviderError
// comment for why a 404 correctly does NOT trigger fallback (dead model config,
// not a transient failure). compound-mini has a 70K TPM ceiling on this
// account (vs. 8K TPM shared by openai/gpt-oss-120b, openai/gpt-oss-20b, AND
// qwen/qwen3.6-27b -- confirmed via live x-ratelimit-limit-tokens response
// headers, so those three would hit the exact same collision that killed
// llama-3.3-70b-versatile's replacement candidates), verified live to return
// clean text/JSON with no markdown fences and no tool_calls for all three of
// our prompt shapes despite being one of Groq's tool-using "compound" systems.
// OpenRouter's free Nemotron 3 Ultra remains the fallback for availability
// failures only -- see router.ts.
const GROQ_TEXT_MODEL = "groq/compound-mini";
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

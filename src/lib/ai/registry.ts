import { mockImageProvider } from "./providers/image/mock";
import { mockTextProvider } from "./providers/text/mock";
import { geminiTextProvider } from "./providers/text/gemini";
import type { ImageProvider, TextProvider } from "./providers/types";
import type { AiFeature, ImageOperation, TextOperation } from "./operations";

export interface OperationConfig {
  operation: TextOperation | ImageOperation;
  feature: AiFeature;
  provider: string;
  model: string;
}

const GEMINI_TEXT_MODEL = "gemini-3.6-flash";

/**
 * Operation -> provider/model mapping. Picking a different provider or model
 * per operation is a change confined to this table. Image operations still
 * point at the mock adapter (Phase 3G only covers text operations).
 */
const registry: Record<TextOperation | ImageOperation, OperationConfig> = {
  chat: {
    operation: "chat",
    feature: "chat",
    provider: geminiTextProvider.id,
    model: GEMINI_TEXT_MODEL,
  },
  "script.generate": {
    operation: "script.generate",
    feature: "script-studio",
    provider: geminiTextProvider.id,
    model: GEMINI_TEXT_MODEL,
  },
  "script.rewrite": {
    operation: "script.rewrite",
    feature: "script-studio",
    provider: geminiTextProvider.id,
    model: GEMINI_TEXT_MODEL,
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
    provider: mockImageProvider.id,
    model: "mock-image-standard",
  },
  "thumbnail.generate": {
    operation: "thumbnail.generate",
    feature: "thumbnail-studio",
    provider: mockImageProvider.id,
    model: "mock-image-standard",
  },
  "image.variation": {
    operation: "image.variation",
    feature: "image-studio",
    provider: mockImageProvider.id,
    model: "mock-image-standard",
  },
};

const textProviders: Record<string, TextProvider> = {
  [mockTextProvider.id]: mockTextProvider,
  [geminiTextProvider.id]: geminiTextProvider,
};

export function resolveOperation(operation: TextOperation | ImageOperation): OperationConfig {
  return registry[operation];
}

export function getTextProvider(operation: TextOperation): TextProvider {
  const providerId = resolveOperation(operation).provider;
  const provider = textProviders[providerId];
  if (!provider) {
    throw new Error(`No text provider registered for id "${providerId}".`);
  }
  return provider;
}

export function getImageProvider(): ImageProvider {
  return mockImageProvider;
}

export function listOperations(): OperationConfig[] {
  return Object.values(registry);
}

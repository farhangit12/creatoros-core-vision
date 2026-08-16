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

export interface ImageProviderRequest {
  operation: ImageOperation;
  model: string;
  prompt: string;
  count: number;
  aspectRatio: string;
  style?: string | undefined;
  sourceAssetId?: string;
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

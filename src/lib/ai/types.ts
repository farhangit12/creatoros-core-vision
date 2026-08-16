import type { AiFeature, AiOperation } from "./operations";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type GenerationStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Normalized shape of one AI call, provider-agnostic. Mirrors the `ai_generations`
 * table added in Phase 3B (src/db/schema.ts) so a future persistence-backed
 * UsageLogger (Phase 3E) can satisfy the same UsageLogger interface without
 * changing any caller in text-service.ts / image-service.ts.
 */
export interface GenerationRecord {
  id: string;
  userId: string;
  feature: AiFeature;
  operation: AiOperation;
  provider: string;
  model: string;
  conversationId: string | null;
  status: GenerationStatus;
  input: unknown;
  output: unknown;
  usage: TokenUsage | null;
  costCents: number | null;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface ScriptSection {
  id: string;
  label: string;
  text: string;
}

export interface ScriptOption {
  key: string;
  label: string;
  recommended: boolean;
  rationale?: string | undefined;
  sections: ScriptSection[];
}

export interface ImageAsset {
  id: string;
  url: string;
  width: number;
  height: number;
  variantIndex: number;
  recommended: boolean;
}

export interface ThumbnailVariation {
  id: string;
  label: string;
  recommended: boolean;
  rationale: string;
  asset: ImageAsset;
}

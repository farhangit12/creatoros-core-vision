import { randomUUID } from "node:crypto";
import type { AiFeature, AiOperation } from "./operations";
import type { GenerationRecord, TokenUsage } from "./types";

export interface StartGenerationParams {
  userId: string;
  feature: AiFeature;
  operation: AiOperation;
  provider: string;
  model: string;
  conversationId?: string | undefined;
  input?: unknown;
}

export interface CompleteGenerationParams {
  output?: unknown;
  usage?: TokenUsage | null;
  costCents?: number | null;
}

/**
 * Contract a real, DB-backed logger must satisfy in Phase 3E (writing to the
 * `ai_generations` table from src/db/schema.ts). No persistence happens here —
 * this is the in-memory hook the task calls for; credit deduction is Phase 3H.
 */
export interface UsageLogger {
  start(params: StartGenerationParams): GenerationRecord;
  complete(id: string, params?: CompleteGenerationParams): GenerationRecord;
  fail(id: string, errorMessage: string): GenerationRecord;
  get(id: string): GenerationRecord | undefined;
  list(filter?: { userId?: string; feature?: AiFeature; conversationId?: string }): GenerationRecord[];
}

class InMemoryUsageLogger implements UsageLogger {
  private records = new Map<string, GenerationRecord>();

  start(params: StartGenerationParams): GenerationRecord {
    const record: GenerationRecord = {
      id: randomUUID(),
      userId: params.userId,
      feature: params.feature,
      operation: params.operation,
      provider: params.provider,
      model: params.model,
      conversationId: params.conversationId ?? null,
      status: "processing",
      input: params.input ?? null,
      output: null,
      usage: null,
      costCents: null,
      errorMessage: null,
      durationMs: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    this.records.set(record.id, record);
    return record;
  }

  complete(id: string, params: CompleteGenerationParams = {}): GenerationRecord {
    const existing = this.getOrThrow(id);
    const completedAt = new Date().toISOString();
    const updated: GenerationRecord = {
      ...existing,
      status: "completed",
      output: params.output ?? null,
      usage: params.usage ?? null,
      costCents: params.costCents ?? null,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(existing.createdAt).getTime(),
    };
    this.records.set(id, updated);
    return updated;
  }

  fail(id: string, errorMessage: string): GenerationRecord {
    const existing = this.getOrThrow(id);
    const completedAt = new Date().toISOString();
    const updated: GenerationRecord = {
      ...existing,
      status: "failed",
      errorMessage,
      completedAt,
      durationMs: new Date(completedAt).getTime() - new Date(existing.createdAt).getTime(),
    };
    this.records.set(id, updated);
    return updated;
  }

  get(id: string): GenerationRecord | undefined {
    return this.records.get(id);
  }

  list(filter: { userId?: string; feature?: AiFeature; conversationId?: string } = {}): GenerationRecord[] {
    return Array.from(this.records.values()).filter((record) => {
      if (filter.userId && record.userId !== filter.userId) return false;
      if (filter.feature && record.feature !== filter.feature) return false;
      if (filter.conversationId && record.conversationId !== filter.conversationId) return false;
      return true;
    });
  }

  private getOrThrow(id: string): GenerationRecord {
    const existing = this.records.get(id);
    if (!existing) {
      throw new Error(`Unknown generation id: ${id}`);
    }
    return existing;
  }
}

export const usageLogger: UsageLogger = new InMemoryUsageLogger();

export function getGenerationStatus(id: string): GenerationRecord | undefined {
  return usageLogger.get(id);
}

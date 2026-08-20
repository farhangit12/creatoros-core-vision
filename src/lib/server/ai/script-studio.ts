import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { aiConversations, aiGenerations } from "@/db/schema";
import { generateScript, rewriteScript } from "@/lib/ai/text-service";
import { resolveOperation } from "@/lib/ai/registry";
import { checkAndReserveCredits, deductCredits, getOrInitCreditAccount } from "@/lib/server/credits";
import { scriptGenerateCost, scriptRewriteCost, type PlanId } from "@/lib/credits";
import { FeatureNotAvailableError, hasFeature } from "@/lib/plan-features";
import type { GenerationRecord } from "@/lib/ai/types";
import type { TextOperation } from "@/lib/ai/operations";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function toSerializableGeneration(generation: GenerationRecord) {
  return { ...generation, input: generation.input as Json, output: generation.output as Json };
}

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  if (!session) {
    throw new Error("Not authenticated.");
  }
  return session.user.id;
}

async function assertOwnedConversation(userId: string, conversationId: string): Promise<void> {
  const [conversation] = await db
    .select({ id: aiConversations.id })
    .from(aiConversations)
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)));
  if (!conversation) {
    throw new Error("Conversation not found.");
  }
}

function toDbGeneration(userId: string, generation: GenerationRecord) {
  return {
    id: generation.id,
    userId,
    conversationId: generation.conversationId,
    feature: generation.feature,
    operation: generation.operation,
    provider: generation.provider,
    model: generation.model,
    status: generation.status,
    input: generation.input,
    output: generation.output,
    errorMessage: generation.errorMessage,
    promptTokens: generation.usage?.promptTokens ?? null,
    completionTokens: generation.usage?.completionTokens ?? null,
    totalTokens: generation.usage?.totalTokens ?? null,
    costCents: generation.costCents,
    durationMs: generation.durationMs,
    createdAt: new Date(generation.createdAt),
    completedAt: generation.completedAt ? new Date(generation.completedAt) : null,
  };
}

async function recordFailedGeneration(params: {
  userId: string;
  operation: TextOperation;
  conversationId?: string | null;
  input: unknown;
  error: unknown;
  startedAt: Date;
}): Promise<void> {
  const config = resolveOperation(params.operation);
  const completedAt = new Date();
  await db.insert(aiGenerations).values({
    id: crypto.randomUUID(),
    userId: params.userId,
    conversationId: params.conversationId ?? null,
    feature: config.feature,
    operation: config.operation,
    provider: config.provider,
    model: config.model,
    status: "failed",
    input: params.input,
    output: null,
    errorMessage: params.error instanceof Error ? params.error.message : "Generation failed.",
    durationMs: completedAt.getTime() - params.startedAt.getTime(),
    createdAt: params.startedAt,
    completedAt,
  });
}

const generateScriptSchema = z.object({
  topic: z.string().trim().min(1, "Topic is required.").max(300),
  platform: z.string().trim().min(1).max(60),
  contentType: z.string().trim().min(1).max(60),
  duration: z.string().trim().min(1).max(60),
  tone: z.string().trim().min(1).max(60),
  language: z.string().trim().min(1).max(60),
  creativity: z.number().min(0).max(1),
  multiOption: z.boolean(),
  audience: z.string().trim().max(200).optional(),
  conversationId: z.string().min(1).optional(),
});

const rewriteScriptSchema = z.object({
  sectionText: z.string().trim().min(1, "Section text is required.").max(4000),
  action: z.string().trim().min(1).max(60),
  tone: z.string().trim().min(1).max(60).optional(),
  conversationId: z.string().min(1).optional(),
});

export const generateScriptAction = createServerFn({ method: "POST" })
  .validator((input: unknown) => generateScriptSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    if (data.conversationId) {
      await assertOwnedConversation(userId, data.conversationId);
    }
    const account = await getOrInitCreditAccount(userId);
    if (data.multiOption && !hasFeature(account.planId as PlanId, "script.multiOption")) {
      throw new FeatureNotAvailableError("script.multiOption");
    }
    const cost = scriptGenerateCost(data.multiOption);
    await checkAndReserveCredits(userId, cost);
    const startedAt = new Date();
    const { conversationId, audience, ...rest } = data;
    const input = { ...rest, ...(audience !== undefined ? { audience } : {}) };

    try {
      const result = await generateScript({
        userId,
        ...input,
        ...(conversationId !== undefined ? { conversationId } : {}),
      });
      await db.insert(aiGenerations).values(toDbGeneration(userId, result.generation));
      await deductCredits({ userId, cost, generationId: result.generation.id });
      return { ...result, generation: toSerializableGeneration(result.generation) };
    } catch (error) {
      await recordFailedGeneration({
        userId,
        operation: "script.generate",
        ...(conversationId !== undefined ? { conversationId } : {}),
        input,
        error,
        startedAt,
      });
      throw error;
    }
  });

export const rewriteScriptAction = createServerFn({ method: "POST" })
  .validator((input: unknown) => rewriteScriptSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    if (data.conversationId) {
      await assertOwnedConversation(userId, data.conversationId);
    }
    const cost = scriptRewriteCost(data.action);
    await checkAndReserveCredits(userId, cost);
    const startedAt = new Date();
    const { conversationId, tone, ...rest } = data;

    try {
      const result = await rewriteScript({
        userId,
        ...rest,
        ...(conversationId !== undefined ? { conversationId } : {}),
        ...(tone !== undefined ? { tone } : {}),
      });
      await db.insert(aiGenerations).values(toDbGeneration(userId, result.generation));
      await deductCredits({ userId, cost, generationId: result.generation.id });
      return { ...result, generation: toSerializableGeneration(result.generation) };
    } catch (error) {
      await recordFailedGeneration({
        userId,
        operation: "script.rewrite",
        ...(conversationId !== undefined ? { conversationId } : {}),
        input: { ...rest, ...(tone !== undefined ? { tone } : {}) },
        error,
        startedAt,
      });
      throw error;
    }
  });

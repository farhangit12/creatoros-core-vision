import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { aiAssets, aiConversations, aiGenerations } from "@/db/schema";
import { generateThumbnails } from "@/lib/ai/image-service";
import { resolveOperation } from "@/lib/ai/registry";
import { checkAndReserveCredits, checkGlobalImageCapacity, deductCredits } from "@/lib/server/credits";
import { imageCost } from "@/lib/credits";
import type { GenerationRecord, ThumbnailVariation } from "@/lib/ai/types";

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

async function persistThumbnailAssets(
  userId: string,
  generationId: string,
  variations: ThumbnailVariation[],
): Promise<void> {
  if (variations.length === 0) return;
  await db.insert(aiAssets).values(
    variations.map((variation) => ({
      id: variation.asset.id,
      userId,
      generationId,
      assetType: "thumbnail",
      url: variation.asset.url,
      variantIndex: variation.asset.variantIndex,
      width: variation.asset.width,
      height: variation.asset.height,
      metadata: {
        label: variation.label,
        recommended: variation.recommended,
        rationale: variation.rationale,
      },
    })),
  );
}

async function recordFailedGeneration(params: {
  userId: string;
  conversationId?: string | null;
  input: unknown;
  error: unknown;
  startedAt: Date;
}): Promise<void> {
  const config = resolveOperation("thumbnail.generate");
  const completedAt = new Date();
  await db.insert(aiGenerations).values({
    id: randomUUID(),
    userId: params.userId,
    conversationId: params.conversationId ?? null,
    feature: config.feature,
    operation: config.operation,
    provider: config.provider,
    model: config.model,
    status: "failed",
    input: params.input,
    output: null,
    errorMessage: params.error instanceof Error ? params.error.message : "Thumbnail generation failed.",
    durationMs: completedAt.getTime() - params.startedAt.getTime(),
    createdAt: params.startedAt,
    completedAt,
  });
}

const generateThumbnailSchema = z.object({
  topic: z.string().trim().min(1, "Topic is required.").max(300),
  aspectRatio: z.string().trim().min(1).max(20),
  // ASCEND A3-B: locked to 1-2 (never 4) to bound Cloudflare/Cloudinary
  // concurrency -- see image-service.ts and cloudflare.ts's Promise.all.
  count: z.number().int().min(1).max(2).optional(),
  style: z.string().trim().max(100).optional(),
  platform: z.string().trim().max(60).optional(),
  conversationId: z.string().min(1).optional(),
  referenceImageUrl: z.string().url().optional(),
});

export const generateThumbnailAction = createServerFn({ method: "POST" })
  .validator((input: unknown) => generateThumbnailSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    if (data.conversationId) {
      await assertOwnedConversation(userId, data.conversationId);
    }
    const cost = imageCost(data.count ?? 1);
    await checkAndReserveCredits(userId, cost);
    await checkGlobalImageCapacity();
    const startedAt = new Date();
    const { conversationId, style, platform, count, referenceImageUrl, ...rest } = data;
    const input = {
      ...rest,
      count: count ?? 1,
      ...(style !== undefined ? { style } : {}),
      ...(platform !== undefined ? { platform } : {}),
      ...(referenceImageUrl !== undefined ? { referenceImageUrl } : {}),
    };

    try {
      const result = await generateThumbnails({
        userId,
        ...input,
        ...(conversationId !== undefined ? { conversationId } : {}),
      });
      await db.insert(aiGenerations).values(toDbGeneration(userId, result.generation));
      await persistThumbnailAssets(userId, result.generation.id, result.variations);
      await deductCredits({ userId, cost, generationId: result.generation.id });
      return { ...result, generation: toSerializableGeneration(result.generation) };
    } catch (error) {
      await recordFailedGeneration({
        userId,
        ...(conversationId !== undefined ? { conversationId } : {}),
        input,
        error,
        startedAt,
      });
      throw error;
    }
  });

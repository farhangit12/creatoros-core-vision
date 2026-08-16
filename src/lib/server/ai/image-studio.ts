import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { aiAssets, aiConversations, aiGenerations } from "@/db/schema";
import { createVariation, generateImages } from "@/lib/ai/image-service";
import { resolveOperation } from "@/lib/ai/registry";
import type { GenerationRecord, ImageAsset } from "@/lib/ai/types";
import type { ImageOperation } from "@/lib/ai/operations";

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

async function loadOwnedAsset(userId: string, assetId: string): Promise<typeof aiAssets.$inferSelect> {
  const [asset] = await db
    .select()
    .from(aiAssets)
    .where(and(eq(aiAssets.id, assetId), eq(aiAssets.userId, userId)));
  if (!asset) {
    throw new Error("Source asset not found.");
  }
  return asset;
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

async function persistImageAssets(
  userId: string,
  generationId: string,
  assets: ImageAsset[],
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (assets.length === 0) return;
  await db.insert(aiAssets).values(
    assets.map((asset) => ({
      id: asset.id,
      userId,
      generationId,
      assetType: "image",
      url: asset.url,
      variantIndex: asset.variantIndex,
      width: asset.width,
      height: asset.height,
      metadata: { recommended: asset.recommended, ...metadata },
    })),
  );
}

async function recordFailedGeneration(params: {
  userId: string;
  operation: ImageOperation;
  conversationId?: string | null;
  input: unknown;
  error: unknown;
  startedAt: Date;
}): Promise<void> {
  const config = resolveOperation(params.operation);
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
    errorMessage: params.error instanceof Error ? params.error.message : "Generation failed.",
    durationMs: completedAt.getTime() - params.startedAt.getTime(),
    createdAt: params.startedAt,
    completedAt,
  });
}

const generateImageSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required.").max(2000),
  count: z.number().int().min(1).max(8),
  aspectRatio: z.string().trim().min(1).max(20),
  style: z.string().trim().max(100).optional(),
  useCase: z.string().trim().max(100).optional(),
  platform: z.string().trim().max(60).optional(),
  conversationId: z.string().min(1).optional(),
});

const createVariationSchema = z.object({
  sourceAssetId: z.string().min(1),
  aspectRatio: z.string().trim().min(1).max(20),
  prompt: z.string().trim().max(2000).optional(),
  count: z.number().int().min(1).max(8).optional(),
  conversationId: z.string().min(1).optional(),
});

export const generateImageAction = createServerFn({ method: "POST" })
  .validator((input: unknown) => generateImageSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    if (data.conversationId) {
      await assertOwnedConversation(userId, data.conversationId);
    }
    const startedAt = new Date();
    const { conversationId, style, useCase, platform, ...rest } = data;
    const input = {
      ...rest,
      ...(style !== undefined ? { style } : {}),
      ...(useCase !== undefined ? { useCase } : {}),
      ...(platform !== undefined ? { platform } : {}),
    };

    try {
      const result = await generateImages({
        userId,
        ...input,
        ...(conversationId !== undefined ? { conversationId } : {}),
      });
      await db.insert(aiGenerations).values(toDbGeneration(userId, result.generation));
      await persistImageAssets(userId, result.generation.id, result.assets);
      return { ...result, generation: toSerializableGeneration(result.generation) };
    } catch (error) {
      await recordFailedGeneration({
        userId,
        operation: "image.generate",
        ...(conversationId !== undefined ? { conversationId } : {}),
        input,
        error,
        startedAt,
      });
      throw error;
    }
  });

export const createImageVariationAction = createServerFn({ method: "POST" })
  .validator((input: unknown) => createVariationSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    if (data.conversationId) {
      await assertOwnedConversation(userId, data.conversationId);
    }
    const sourceAsset = await loadOwnedAsset(userId, data.sourceAssetId);
    const startedAt = new Date();
    const { conversationId, prompt, count, ...rest } = data;
    const input = {
      ...rest,
      ...(prompt !== undefined ? { prompt } : {}),
      ...(count !== undefined ? { count } : {}),
    };

    try {
      const result = await createVariation({
        userId,
        ...input,
        sourceAssetUrl: sourceAsset.url,
        ...(conversationId !== undefined ? { conversationId } : {}),
      });
      await db.insert(aiGenerations).values(toDbGeneration(userId, result.generation));
      await persistImageAssets(userId, result.generation.id, result.assets, {
        sourceAssetId: data.sourceAssetId,
      });
      return { ...result, generation: toSerializableGeneration(result.generation) };
    } catch (error) {
      await recordFailedGeneration({
        userId,
        operation: "image.variation",
        ...(conversationId !== undefined ? { conversationId } : {}),
        input,
        error,
        startedAt,
      });
      throw error;
    }
  });

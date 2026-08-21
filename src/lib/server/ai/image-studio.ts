import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { aiAssets, aiConversations, aiGenerations } from "@/db/schema";
import { createVariation, generateImages } from "@/lib/ai/image-service";
import { resolveOperation } from "@/lib/ai/registry";
import { uploadImageToCloudinary } from "@/lib/ai/providers/image/cloudinary-upload";
import { checkAndReserveCredits, checkGlobalImageCapacity, deductCredits, getOrInitCreditAccount } from "@/lib/server/credits";
import { imageCost, type PlanId } from "@/lib/credits";
import { BatchLimitExceededError, FeatureNotAvailableError, hasFeature, maxImageBatch } from "@/lib/plan-features";
import { assertNotDuplicateSubmission } from "@/lib/server/ai/idempotency";
import type { GenerationRecord, ImageAsset } from "@/lib/ai/types";
import type { ImageOperation } from "@/lib/ai/operations";

const REFERENCE_IMAGE_FOLDER = "creatoros-ai-assets/references";
const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_REFERENCE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

const generateImageSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required.").max(2000),
  count: z.number().int().min(1).max(8),
  aspectRatio: z.string().trim().min(1).max(20),
  style: z.string().trim().max(100).optional(),
  useCase: z.string().trim().max(100).optional(),
  platform: z.string().trim().max(60).optional(),
  conversationId: z.string().min(1).optional(),
  referenceImageUrl: z.string().url().optional(),
  overlayText: z.string().trim().min(1).max(120).optional(),
});

const uploadReferenceImageSchema = z.object({
  dataUrl: z.string().min(1).max(Math.ceil((MAX_REFERENCE_IMAGE_BYTES * 4) / 3) + 200),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

const createVariationSchema = z.object({
  sourceAssetId: z.string().min(1),
  aspectRatio: z.string().trim().min(1).max(20),
  prompt: z.string().trim().max(2000).optional(),
  count: z.number().int().min(1).max(8).optional(),
  conversationId: z.string().min(1).optional(),
});

/**
 * Uploads a user-supplied reference image (e.g. for image.generate img2img)
 * to Cloudinary via the AI pipeline's own server-only upload helper -- the
 * browser sends bytes as a data URL in the request body rather than doing a
 * signed direct-to-Cloudinary upload, since the file only needs to become a
 * fetchable URL for the provider, not a persisted "asset" in its own right.
 */
export const uploadReferenceImageAction = createServerFn({ method: "POST" })
  .validator((input: unknown) => uploadReferenceImageSchema.parse(input))
  .handler(async ({ data }) => {
    await requireUserId();
    const commaIndex = data.dataUrl.indexOf(",");
    if (!data.dataUrl.startsWith("data:") || commaIndex === -1) {
      throw new Error("Invalid image data.");
    }
    const base64 = data.dataUrl.slice(commaIndex + 1);
    const bytes = Buffer.from(base64, "base64");
    if (bytes.byteLength > MAX_REFERENCE_IMAGE_BYTES) {
      throw new Error("Reference image must be 8MB or smaller.");
    }
    if (!ALLOWED_REFERENCE_MIME_TYPES.has(data.mimeType)) {
      throw new Error("Unsupported image type.");
    }
    const uploaded = await uploadImageToCloudinary(bytes, data.mimeType, REFERENCE_IMAGE_FOLDER);
    return { url: uploaded.url };
  });

export const generateImageAction = createServerFn({ method: "POST" })
  .validator((input: unknown) => generateImageSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    if (data.conversationId) {
      await assertOwnedConversation(userId, data.conversationId);
    }
    const account = await getOrInitCreditAccount(userId);
    const planId = account.planId as PlanId;
    if (data.referenceImageUrl && !hasFeature(planId, "image.referenceImage")) {
      throw new FeatureNotAvailableError("image.referenceImage");
    }
    const batchLimit = maxImageBatch(planId);
    if (data.count > batchLimit) {
      throw new BatchLimitExceededError(batchLimit, data.count);
    }
    const cost = imageCost(data.count);
    await checkAndReserveCredits(userId, cost);
    await checkGlobalImageCapacity();
    const startedAt = new Date();
    const { conversationId, style, useCase, platform, referenceImageUrl, overlayText, ...rest } = data;
    const input = {
      ...rest,
      ...(style !== undefined ? { style } : {}),
      ...(useCase !== undefined ? { useCase } : {}),
      ...(platform !== undefined ? { platform } : {}),
      ...(referenceImageUrl !== undefined ? { referenceImageUrl } : {}),
      ...(overlayText !== undefined ? { overlayText } : {}),
    };
    await assertNotDuplicateSubmission({
      userId,
      feature: "image-studio",
      operation: "image.generate",
      clientData: input,
    });

    try {
      const result = await generateImages({
        userId,
        ...input,
        ...(conversationId !== undefined ? { conversationId } : {}),
      });
      await db.insert(aiGenerations).values(toDbGeneration(userId, result.generation));
      await persistImageAssets(userId, result.generation.id, result.assets);
      await deductCredits({ userId, cost, generationId: result.generation.id });
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
    const cost = imageCost(data.count ?? 1);
    await checkAndReserveCredits(userId, cost);
    await checkGlobalImageCapacity();
    const startedAt = new Date();
    const { conversationId, prompt, count, ...rest } = data;
    const input = {
      ...rest,
      ...(prompt !== undefined ? { prompt } : {}),
      ...(count !== undefined ? { count } : {}),
    };
    await assertNotDuplicateSubmission({
      userId,
      feature: "image-studio",
      operation: "image.variation",
      clientData: input,
    });

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
      await deductCredits({ userId, cost, generationId: result.generation.id });
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

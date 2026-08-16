import { randomUUID } from "node:crypto";
import { getImageProvider, resolveOperation } from "./registry";
import { usageLogger } from "./usage";
import type { GenerationRecord, ImageAsset, ThumbnailVariation } from "./types";
import type { ImageProviderAsset } from "./providers/types";

function toImageAsset(asset: ImageProviderAsset): ImageAsset {
  return {
    id: randomUUID(),
    url: asset.url,
    width: asset.width,
    height: asset.height,
    variantIndex: asset.variantIndex,
    recommended: asset.recommended,
  };
}

export interface GenerateImagesParams {
  userId: string;
  prompt: string;
  count: number;
  aspectRatio: string;
  style?: string;
  useCase?: string;
  platform?: string;
  conversationId?: string;
  model?: string;
}

export interface GenerateImagesResult {
  assets: ImageAsset[];
  generation: GenerationRecord;
}

export async function generateImages(params: GenerateImagesParams): Promise<GenerateImagesResult> {
  const config = resolveOperation("image.generate");
  const model = params.model ?? config.model;
  const generation = usageLogger.start({
    userId: params.userId,
    feature: config.feature,
    operation: config.operation,
    provider: config.provider,
    model,
    conversationId: params.conversationId,
    input: params,
  });

  try {
    const result = await getImageProvider("image.generate").generate({
      operation: "image.generate",
      model,
      prompt: params.prompt,
      count: params.count,
      aspectRatio: params.aspectRatio,
      style: params.style,
      metadata: { useCase: params.useCase, platform: params.platform },
    });
    const assets = result.assets.map(toImageAsset);
    const completed = usageLogger.complete(generation.id, { output: assets });
    return { assets, generation: completed };
  } catch (error) {
    usageLogger.fail(generation.id, error instanceof Error ? error.message : "Image generation failed.");
    throw error;
  }
}

const THUMBNAIL_LABELS = ["A", "B", "C", "D"];

export interface GenerateThumbnailsParams {
  userId: string;
  topic: string;
  aspectRatio: string;
  style?: string;
  platform?: string;
  conversationId?: string;
  model?: string;
}

export interface GenerateThumbnailsResult {
  variations: ThumbnailVariation[];
  generation: GenerationRecord;
}

export async function generateThumbnails(params: GenerateThumbnailsParams): Promise<GenerateThumbnailsResult> {
  const config = resolveOperation("thumbnail.generate");
  const model = params.model ?? config.model;
  const generation = usageLogger.start({
    userId: params.userId,
    feature: config.feature,
    operation: config.operation,
    provider: config.provider,
    model,
    conversationId: params.conversationId,
    input: params,
  });

  try {
    const result = await getImageProvider("thumbnail.generate").generate({
      operation: "thumbnail.generate",
      model,
      prompt: params.topic,
      count: THUMBNAIL_LABELS.length,
      aspectRatio: params.aspectRatio,
      style: params.style,
      metadata: { platform: params.platform },
    });
    const variations: ThumbnailVariation[] = result.assets.map((asset, i) => ({
      id: randomUUID(),
      label: `Variation ${THUMBNAIL_LABELS[i] ?? String(i + 1)}`,
      recommended: asset.recommended,
      rationale: asset.recommended
        ? "High-contrast face + bold text tests best for CTR on this topic."
        : "Alternative composition generated from the same prompt.",
      asset: toImageAsset(asset),
    }));
    const completed = usageLogger.complete(generation.id, { output: variations });
    return { variations, generation: completed };
  } catch (error) {
    usageLogger.fail(generation.id, error instanceof Error ? error.message : "Thumbnail generation failed.");
    throw error;
  }
}

export interface CreateVariationParams {
  userId: string;
  sourceAssetId: string;
  /** Publicly fetchable URL of the source asset -- see providers/types.ts. */
  sourceAssetUrl?: string;
  aspectRatio: string;
  prompt?: string;
  count?: number;
  conversationId?: string;
  model?: string;
}

export interface CreateVariationResult {
  assets: ImageAsset[];
  generation: GenerationRecord;
}

export async function createVariation(params: CreateVariationParams): Promise<CreateVariationResult> {
  const config = resolveOperation("image.variation");
  const model = params.model ?? config.model;
  const generation = usageLogger.start({
    userId: params.userId,
    feature: config.feature,
    operation: config.operation,
    provider: config.provider,
    model,
    conversationId: params.conversationId,
    input: params,
  });

  try {
    const result = await getImageProvider("image.variation").generate({
      operation: "image.variation",
      model,
      prompt: params.prompt ?? "",
      count: params.count ?? 1,
      aspectRatio: params.aspectRatio,
      sourceAssetId: params.sourceAssetId,
      ...(params.sourceAssetUrl !== undefined ? { sourceAssetUrl: params.sourceAssetUrl } : {}),
    });
    const assets = result.assets.map(toImageAsset);
    const completed = usageLogger.complete(generation.id, { output: assets });
    return { assets, generation: completed };
  } catch (error) {
    usageLogger.fail(generation.id, error instanceof Error ? error.message : "Variation generation failed.");
    throw error;
  }
}

export { getGenerationStatus } from "./usage";

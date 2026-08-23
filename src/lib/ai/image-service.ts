import { getImageProvider, resolveOperation } from "./registry";
import { usageLogger } from "./usage";
import { withTimeout } from "./router";
import { calculateCloudflareBatchCostMicros } from "./cost";
import type { GenerationRecord, ImageAsset, ThumbnailVariation } from "./types";
import type { ImageProviderAsset } from "./providers/types";

// Longer than the text router's timeout -- image/thumbnail generation
// (Cloudflare Workers AI, possibly batched via Promise.all for multiple
// variants) is legitimately slower than a single text completion.
const IMAGE_PROVIDER_TIMEOUT_MS = 90_000;

function toImageAsset(asset: ImageProviderAsset): ImageAsset {
  return {
    id: crypto.randomUUID(),
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
  /** Publicly fetchable URL of a user-uploaded reference image, for img2img. */
  referenceImageUrl?: string;
  /** Exact text to render as a real overlay -- see providers/types.ts. */
  overlayText?: string;
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
    const result = await withTimeout(
      getImageProvider("image.generate").generate({
        operation: "image.generate",
        model,
        prompt: params.prompt,
        count: params.count,
        aspectRatio: params.aspectRatio,
        style: params.style,
        metadata: { useCase: params.useCase, platform: params.platform },
        ...(params.referenceImageUrl !== undefined ? { sourceAssetUrl: params.referenceImageUrl } : {}),
        ...(params.overlayText !== undefined ? { overlayText: params.overlayText } : {}),
      }),
      IMAGE_PROVIDER_TIMEOUT_MS,
      "cloudflare/image.generate",
    );
    const assets = result.assets.map(toImageAsset);
    const completed = usageLogger.complete(generation.id, {
      output: assets,
      costMicros: calculateCloudflareBatchCostMicros(assets, Boolean(params.referenceImageUrl)),
    });
    return { assets, generation: completed };
  } catch (error) {
    usageLogger.fail(generation.id, error instanceof Error ? error.message : "Image generation failed.");
    throw error;
  }
}

// Locked to 2 entries: Thumbnail Studio's variation count is capped at 2 (ASCEND A3-B).
const THUMBNAIL_LABELS = ["A", "B"];

export interface GenerateThumbnailsParams {
  userId: string;
  topic: string;
  aspectRatio: string;
  /** Locked to 1-2 by ASCEND A3-B -- see thumbnail-studio.ts's zod schema for enforcement. */
  count: number;
  style?: string;
  platform?: string;
  conversationId?: string;
  model?: string;
  /** Publicly fetchable URL of a user-uploaded reference image, for img2img. */
  referenceImageUrl?: string;
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
    const result = await withTimeout(
      getImageProvider("thumbnail.generate").generate({
        operation: "thumbnail.generate",
        model,
        prompt: params.topic,
        count: params.count,
        aspectRatio: params.aspectRatio,
        style: params.style,
        metadata: { platform: params.platform },
        ...(params.referenceImageUrl !== undefined ? { sourceAssetUrl: params.referenceImageUrl } : {}),
      }),
      IMAGE_PROVIDER_TIMEOUT_MS,
      "cloudflare/thumbnail.generate",
    );
    const variations: ThumbnailVariation[] = result.assets.map((asset, i) => ({
      id: crypto.randomUUID(),
      label: `Variation ${THUMBNAIL_LABELS[i] ?? String(i + 1)}`,
      recommended: asset.recommended,
      rationale: asset.recommended
        ? "High-contrast face + bold text tests best for CTR on this topic."
        : "Alternative composition generated from the same prompt.",
      asset: toImageAsset(asset),
    }));
    const completed = usageLogger.complete(generation.id, {
      output: variations,
      costMicros: calculateCloudflareBatchCostMicros(
        variations.map((v) => v.asset),
        Boolean(params.referenceImageUrl),
      ),
    });
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
    const result = await withTimeout(
      getImageProvider("image.variation").generate({
        operation: "image.variation",
        model,
        prompt: params.prompt ?? "",
        count: params.count ?? 1,
        aspectRatio: params.aspectRatio,
        sourceAssetId: params.sourceAssetId,
        ...(params.sourceAssetUrl !== undefined ? { sourceAssetUrl: params.sourceAssetUrl } : {}),
      }),
      IMAGE_PROVIDER_TIMEOUT_MS,
      "cloudflare/image.variation",
    );
    const assets = result.assets.map(toImageAsset);
    // A variation is always derived from an existing source asset -- the
    // reference-image (input-tile) cost always applies here, unlike
    // generateImages/generateThumbnails where it's optional.
    const completed = usageLogger.complete(generation.id, {
      output: assets,
      costMicros: calculateCloudflareBatchCostMicros(assets, true),
    });
    return { assets, generation: completed };
  } catch (error) {
    usageLogger.fail(generation.id, error instanceof Error ? error.message : "Variation generation failed.");
    throw error;
  }
}

export { getGenerationStatus } from "./usage";

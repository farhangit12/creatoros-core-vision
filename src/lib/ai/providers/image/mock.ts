import type { ImageProvider, ImageProviderRequest, ImageProviderResult } from "../types";

const MOCK_LATENCY_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function dimsForAspect(ratio: string): { width: number; height: number } {
  switch (ratio) {
    case "9:16":
      return { width: 1080, height: 1920 };
    case "1:1":
      return { width: 1080, height: 1080 };
    case "4:5":
      return { width: 1080, height: 1350 };
    default:
      return { width: 1920, height: 1080 };
  }
}

function placeholderUrl(operation: string, seed: number, variantIndex: number): string {
  return `https://mock-ai.creatoros.local/${operation}/${seed.toString(36)}-${variantIndex + 1}.png`;
}

export const mockImageProvider: ImageProvider = {
  id: "mock-image",
  label: "CreatorOS Mock Image",

  async generate(request: ImageProviderRequest): Promise<ImageProviderResult> {
    await delay(MOCK_LATENCY_MS);

    const { width, height } = dimsForAspect(request.aspectRatio);
    const seedSource = request.operation === "image.variation" ? (request.sourceAssetId ?? request.prompt) : request.prompt;
    const seed = hashSeed(seedSource.trim() || request.operation);
    const count = Math.max(1, request.count);

    const assets = Array.from({ length: count }).map((_, i) => ({
      url: placeholderUrl(request.operation, seed, i),
      width,
      height,
      variantIndex: i,
      recommended: i === 0,
    }));

    return { assets };
  },
};

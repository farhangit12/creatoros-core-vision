import {
  ProviderHttpError,
  type ImageProvider,
  type ImageProviderAsset,
  type ImageProviderRequest,
  type ImageProviderResult,
} from "../types";
import { uploadImageToCloudinary } from "./cloudinary-upload";

/**
 * Only this file may read CLOUDFLARE_* env vars or call the Cloudflare
 * Workers AI API, per the server-only boundary documented in providers/types.ts.
 *
 * Model: @cf/black-forest-labs/flux-2-klein-4b. Chosen over
 * stable-diffusion-xl-base-1.0 and flux-1-schnell (Phase 3H-B eval) because
 * it's the only free-plan-compatible model that was live-verified to support
 * ALL THREE image operations in one model: text-to-image, arbitrary
 * width/height (aspect ratio), and real image-to-image editing via a
 * multipart `image` field -- SDXL's documented img2img params are accepted
 * by validation but rejected at execution ("input tensor `image` is not
 * present in the model"), and the dedicated stable-diffusion-v1-5-img2img
 * model was persistently capacity-exhausted (429) during evaluation.
 * flux-2-klein-9b was ruled out: ~14x the Neuron cost per image (would burn
 * the entire 10k/day free allocation in ~7 images).
 *
 * Unlike the other Workers AI image models, this one requires
 * multipart/form-data (JSON is rejected: "required properties at '/' are
 * 'multipart'"), confirmed live.
 */
const CLOUDFLARE_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
const CLOUDINARY_FOLDER = "creatoros-ai-assets";

// Longest side capped at 1024px. Verified live at 1024x1024 and 1280x720;
// staying at/under the smaller of those two keeps every aspect ratio inside
// already-proven bounds without guessing at this model's undocumented max.
const MAX_DIMENSION = 1024;

function getAccountId(): string {
  const accountId = process.env["CLOUDFLARE_ACCOUNT_ID"];
  if (!accountId) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID is not configured on the server.");
  }
  return accountId;
}

function getApiToken(): string {
  const apiToken = process.env["CLOUDFLARE_API_TOKEN"];
  if (!apiToken) {
    throw new Error("CLOUDFLARE_API_TOKEN is not configured on the server.");
  }
  return apiToken;
}

function dimensionsForAspectRatio(ratio: string): { width: number; height: number } {
  const match = /^(\d+):(\d+)$/.exec(ratio.trim());
  const w = match ? Number(match[1]) : 0;
  const h = match ? Number(match[2]) : 0;
  if (!w || !h) {
    return { width: MAX_DIMENSION, height: MAX_DIMENSION };
  }
  const toMultipleOf8 = (n: number) => Math.max(8, Math.round(n / 8) * 8);
  return w >= h
    ? { width: MAX_DIMENSION, height: toMultipleOf8((MAX_DIMENSION * h) / w) }
    : { width: toMultipleOf8((MAX_DIMENSION * w) / h), height: MAX_DIMENSION };
}

function buildPrompt(request: ImageProviderRequest): string {
  const parts = [request.prompt.trim(), request.style?.trim()].filter(
    (part): part is string => Boolean(part),
  );
  return parts.length > 0 ? parts.join(", ") : "A high quality image for a content creator's video.";
}

interface SourceImage {
  bytes: Buffer;
  mimeType: string;
}

async function fetchSourceImage(sourceAssetUrl: string): Promise<SourceImage> {
  const response = await fetch(sourceAssetUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch source image for variation (status ${response.status}).`);
  }
  const mimeType = response.headers.get("content-type") ?? "image/jpeg";
  const bytes = Buffer.from(await response.arrayBuffer());
  return { bytes, mimeType };
}

async function runFluxKlein(params: {
  prompt: string;
  width: number;
  height: number;
  sourceImage: SourceImage | undefined;
}): Promise<Buffer> {
  const form = new FormData();
  form.append("prompt", params.prompt);
  form.append("width", String(params.width));
  form.append("height", String(params.height));
  if (params.sourceImage) {
    form.append(
      "image",
      new Blob([Uint8Array.from(params.sourceImage.bytes)], { type: params.sourceImage.mimeType }),
      "source",
    );
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${getAccountId()}/ai/run/${CLOUDFLARE_MODEL}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${getApiToken()}` },
    body: form,
  });

  const json = (await response.json()) as {
    success?: boolean;
    result?: { image?: string };
    errors?: Array<{ message?: string; code?: number }>;
  };

  if (!response.ok || json.success === false) {
    const message =
      json.errors?.[0]?.message ?? `Cloudflare Workers AI request failed with status ${response.status}.`;
    throw new ProviderHttpError(message, response.status);
  }
  if (!json.result?.image) {
    throw new Error("Cloudflare Workers AI returned no image data.");
  }
  return Buffer.from(json.result.image, "base64");
}

async function generateOne(
  request: ImageProviderRequest,
  prompt: string,
  dimensions: { width: number; height: number },
  variantIndex: number,
  sourceImage: SourceImage | undefined,
): Promise<ImageProviderAsset> {
  const imageBytes = await runFluxKlein({ prompt, ...dimensions, sourceImage });
  // Klein returns JPEG bytes regardless of the base64 field being named
  // "image" -- verified live via magic-byte inspection (ffd8ff... = JPEG).
  const uploaded = await uploadImageToCloudinary(imageBytes, "image/jpeg", CLOUDINARY_FOLDER);
  return {
    url: uploaded.url,
    width: uploaded.width || dimensions.width,
    height: uploaded.height || dimensions.height,
    variantIndex,
    recommended: variantIndex === 0,
  };
}

export const cloudflareImageProvider: ImageProvider = {
  id: "cloudflare",
  label: "Cloudflare Workers AI (FLUX.2 Klein)",

  async generate(request: ImageProviderRequest): Promise<ImageProviderResult> {
    const count = Math.max(1, request.count);
    const prompt = buildPrompt(request);
    const dimensions = dimensionsForAspectRatio(request.aspectRatio);

    let sourceImage: SourceImage | undefined;
    if (request.operation === "image.variation") {
      if (!request.sourceAssetUrl) {
        throw new Error("Cloudflare image provider requires sourceAssetUrl for image.variation.");
      }
      sourceImage = await fetchSourceImage(request.sourceAssetUrl);
    }

    const assets = await Promise.all(
      Array.from({ length: count }, (_, variantIndex) =>
        generateOne(request, prompt, dimensions, variantIndex, sourceImage),
      ),
    );

    return { assets };
  },
};

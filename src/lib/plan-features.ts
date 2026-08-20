/**
 * Single source of truth for which studio capabilities are Paid-only
 * (Pro & Scale share the same unlock set -- Scale differs from Pro purely by
 * credit volume, not capability). Imported by both the studio route files
 * (disable + upsell UI) and their server fns (real hard-block), so what a
 * user sees locked can never drift from what's actually enforced -- same
 * pattern as src/lib/credits.ts.
 */

import type { PlanId } from "@/lib/credits";

export type FeatureKey =
  | "chat.attachments"
  | "script.multiOption"
  | "image.referenceImage"
  | "image.upscale"
  | "image.removeBackground"
  | "thumbnail.referenceImage"
  | "thumbnail.upscale"
  | "thumbnail.removeBackground";

const PAID_FEATURES: ReadonlySet<FeatureKey> = new Set<FeatureKey>([
  "chat.attachments",
  "script.multiOption",
  "image.referenceImage",
  "image.upscale",
  "image.removeBackground",
  "thumbnail.referenceImage",
  "thumbnail.upscale",
  "thumbnail.removeBackground",
]);

export function hasFeature(planId: PlanId, feature: FeatureKey): boolean {
  if (!PAID_FEATURES.has(feature)) return true;
  return planId === "pro" || planId === "scale";
}

const FREE_IMAGE_BATCH_CAP = 2;
const PAID_IMAGE_BATCH_CAP = 8;
const FREE_THUMBNAIL_BATCH_CAP = 1;
const PAID_THUMBNAIL_BATCH_CAP = 2;

export function maxImageBatch(planId: PlanId): number {
  return planId === "free" ? FREE_IMAGE_BATCH_CAP : PAID_IMAGE_BATCH_CAP;
}

export function maxThumbnailBatch(planId: PlanId): number {
  return planId === "free" ? FREE_THUMBNAIL_BATCH_CAP : PAID_THUMBNAIL_BATCH_CAP;
}

export class FeatureNotAvailableError extends Error {
  constructor(feature: FeatureKey) {
    super(`This is a Pro feature (${feature}) -- upgrade your plan to unlock it.`);
    this.name = "FeatureNotAvailableError";
  }
}

export class BatchLimitExceededError extends Error {
  constructor(
    public limit: number,
    public requested: number,
  ) {
    super(`Your plan allows up to ${limit} at a time (requested ${requested}) -- upgrade to generate more per batch.`);
    this.name = "BatchLimitExceededError";
  }
}

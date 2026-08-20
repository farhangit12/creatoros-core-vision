/**
 * Real, Cloudinary-backed post-generation edits for Image Studio / Thumbnail
 * Studio's "Basic editing" panels. Pure URL construction (same pattern as
 * the export helpers already in those route files and `applyTextOverlay` in
 * `src/lib/ai/providers/image/cloudflare.ts`) -- Cloudinary renders the
 * derived asset on first request, so no server round trip is needed here.
 *
 * Effect choice verified live against a real generated asset before wiring
 * up direction/labels (see session diagnostic): `e_gamma` positive values
 * measurably brighten, negative measurably darken; `e_fill_light` with
 * bias -100 measurably concentrates the lift on the image's darker tonal
 * range (near-zero effect on an already-bright test image, as expected for
 * a shadow-targeted adjustment) rather than guessed from docs alone.
 */

const UPLOAD_MARKER = "/upload/";

export interface ImageEditOptions {
  /** 0-100. Lifts shadow detail via Cloudinary's fill-light effect biased toward the shadow range. 0 = no effect. */
  shadows: number;
  /** -50 to 50. Real gamma adjustment: negative recovers/darkens blown highlights, positive brightens them. */
  highlights: number;
  /** AI 4x upscale (Cloudinary `e_upscale`) -- only applied when true; source must be under ~4.2MP. */
  upscale: boolean;
  /**
   * Cloudinary's AI Background Removal add-on (`e_background_removal`) --
   * verified live and enabled on this account (see session diagnostic: a
   * real generated asset came back with a cleanly removed background, not
   * an error or unchanged passthrough). Forces PNG output when active so
   * the removed area is genuinely transparent (alpha channel) rather than
   * flattened to a solid color, which JPEG can't represent.
   */
  removeBackground: boolean;
}

export function applyImageEdits(url: string, opts: ImageEditOptions): string {
  if (!url.includes(UPLOAD_MARKER)) return url;
  const segments: string[] = [];
  if (opts.upscale) segments.push("e_upscale");
  if (opts.shadows > 0) segments.push(`e_fill_light:${Math.round(opts.shadows)}:-100`);
  if (opts.highlights !== 0) segments.push(`e_gamma:${Math.round(opts.highlights)}`);
  if (opts.removeBackground) segments.push("e_background_removal", "f_png");
  if (segments.length === 0) return url;
  return url.replace(UPLOAD_MARKER, `${UPLOAD_MARKER}${segments.join("/")}/`);
}

export const NO_IMAGE_EDITS: ImageEditOptions = {
  shadows: 0,
  highlights: 0,
  upscale: false,
  removeBackground: false,
};

export function hasImageEdits(opts: ImageEditOptions): boolean {
  return opts.shadows > 0 || opts.highlights !== 0 || opts.upscale || opts.removeBackground;
}

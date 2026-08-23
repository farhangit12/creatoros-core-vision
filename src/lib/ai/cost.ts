import type { TokenUsage } from "./types";

/**
 * Estimated real-money cost per AI generation, in micro-dollars (1,000,000 =
 * $1.00 -- see drizzle/0010_generation_cost_micros.sql for why this needs
 * more precision than the existing costCents column, which can't represent
 * typical sub-cent per-request costs without rounding to 0).
 *
 * Pricing sourced 2026-08-23, not guessed from training data:
 * - Groq: this app's real production model is "groq/compound-mini"
 *   (registry.ts), which bundles server-side tool-use and does NOT publish a
 *   single flat per-token rate -- Groq's own docs describe it as passing
 *   through the cost of whichever underlying model it routes to (GPT-OSS
 *   120B / Llama 4 Scout / Llama 3.3 70B) plus any tool calls made. This app
 *   doesn't invoke compound's tool-use features (plain chat completions
 *   only) and has no visibility into which underlying model a given request
 *   actually used, so an exact bill can't be computed from here. Estimated
 *   instead using Llama 3.3 70B-class pricing ($0.59/$0.79 per million
 *   input/output tokens), corroborated across multiple independent pricing
 *   trackers -- a reasonable approximation, not Groq's literal itemized
 *   charge. Labeled "Estimated cost" in the UI for this reason.
 * - OpenRouter fallback: the app's fallback model
 *   ("nvidia/nemotron-3-ultra-550b-a55b:free") is a real $0 free-tier model
 *   by definition -- no estimation needed, cost is genuinely zero.
 * - Cloudflare Workers AI (flux-2-klein-4b): real published per-tile price
 *   from Cloudflare's own model docs (developers.cloudflare.com/workers-ai/
 *   models/flux-2-klein-4b) -- $0.000059 per input 512x512 tile, $0.000287
 *   per output 512x512 tile. Not an approximation.
 */

const GROQ_ESTIMATED_INPUT_PER_MILLION_MICROS = 590_000; // $0.59/M tokens
const GROQ_ESTIMATED_OUTPUT_PER_MILLION_MICROS = 790_000; // $0.79/M tokens

const CLOUDFLARE_TILE_PX = 512;
const CLOUDFLARE_INPUT_TILE_MICROS = 59; // $0.000059
const CLOUDFLARE_OUTPUT_TILE_MICROS = 287; // $0.000287

/** Real cost for a Groq compound-mini text generation, estimated from
 * underlying-model-class per-token pricing (see module comment). Returns
 * null when there's no usage to price (e.g. a failed generation). */
export function estimateGroqCostMicros(usage: TokenUsage | null | undefined): number | null {
  if (!usage) return null;
  const inputMicros = (usage.promptTokens / 1_000_000) * GROQ_ESTIMATED_INPUT_PER_MILLION_MICROS;
  const outputMicros = (usage.completionTokens / 1_000_000) * GROQ_ESTIMATED_OUTPUT_PER_MILLION_MICROS;
  return Math.round(inputMicros + outputMicros);
}

/** OpenRouter's configured fallback is a genuine free-tier ":free" model --
 * real $0, not an estimate. */
export function openrouterFreeCostMicros(): number {
  return 0;
}

/** Provider-aware dispatcher for text generations -- text-service.ts calls
 * this with whichever provider actually served the request (router.ts can
 * fall back from Groq to OpenRouter mid-request), so the recorded cost
 * always matches who really generated the output. */
export function estimateTextCostMicros(provider: string, usage: TokenUsage | null | undefined): number | null {
  if (provider === "openrouter") return openrouterFreeCostMicros();
  if (provider === "groq") return estimateGroqCostMicros(usage);
  return null;
}

function tileCount(pixels: number): number {
  return Math.ceil(pixels / CLOUDFLARE_TILE_PX);
}

/** Real Cloudflare Workers AI cost for one generated image, from published
 * per-512x512-tile pricing. `hasReferenceImage` adds one input-tile charge
 * (img2img) at the same output resolution as a reasonable stand-in for the
 * reference image's own size, which this function doesn't otherwise know. */
export function calculateCloudflareImageCostMicros(
  width: number,
  height: number,
  hasReferenceImage: boolean,
): number {
  const outputTiles = tileCount(width) * tileCount(height);
  const outputMicros = outputTiles * CLOUDFLARE_OUTPUT_TILE_MICROS;
  const inputMicros = hasReferenceImage ? outputTiles * CLOUDFLARE_INPUT_TILE_MICROS : 0;
  return outputMicros + inputMicros;
}

/** Sums per-asset image costs for a batch (Image/Thumbnail Studio can
 * generate multiple variations in one call). */
export function calculateCloudflareBatchCostMicros(
  assets: Array<{ width: number; height: number }>,
  hasReferenceImage: boolean,
): number {
  return assets.reduce(
    (total, asset) => total + calculateCloudflareImageCostMicros(asset.width, asset.height, hasReferenceImage),
    0,
  );
}

/** Formats micro-dollars as a real, human-readable dollar amount. Never
 * rounds a genuinely non-zero cost down to "$0.00" -- shows "<$0.0001" for
 * anything smaller than that instead, so the number stays honest. */
export function formatCostMicros(costMicros: number | null | undefined): string {
  if (costMicros === null || costMicros === undefined) return "—";
  if (costMicros === 0) return "$0.00";
  const dollars = costMicros / 1_000_000;
  if (dollars < 0.0001) return "<$0.0001";
  return `$${dollars.toFixed(4)}`;
}

/**
 * Single source of truth for plan definitions and per-operation credit
 * costs -- imported by both the studio route files (CostHint display) and
 * src/lib/server/credits.ts (real deduction), so the number a user sees
 * before generating can never drift from what actually gets charged.
 */

export const PLAN_IDS = ["free", "pro", "scale"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface PlanDefinition {
  id: PlanId;
  name: string;
  monthlyPriceUsd: number;
  monthlyCredits: number;
  /** When true, credit enforcement is skipped entirely (see server/credits.ts).
   * monthlyCredits stays a real number as an unused baseline/safety net for
   * any call site that forgets to check this flag first. */
  unlimited?: boolean;
}

// Scale's credits were halved from an earlier 8,000/mo draft after checking
// real backend capacity: the image pipeline runs on Cloudflare Workers AI's
// free tier, a shared ~2,000 small-image-generations/day ceiling for the
// WHOLE app, not per user. At 8,000cr a single Scale user spending it all on
// single images (3cr each) could burst to ~88 images/day alone -- enough to
// meaningfully threaten the shared daily budget. 4,000cr keeps that worst
// case around ~44/day, still clearly bigger than Pro without being able to
// single-handedly starve everyone else. See the Global image-generation
// safety valve in server/credits.ts for the actual technical backstop.
export const PLANS: Record<PlanId, PlanDefinition> = {
  free: { id: "free", name: "Free", monthlyPriceUsd: 0, monthlyCredits: 150 },
  pro: { id: "pro", name: "Pro", monthlyPriceUsd: 29, monthlyCredits: 2000 },
  scale: { id: "scale", name: "Scale", monthlyPriceUsd: 79, monthlyCredits: 4000, unlimited: true },
};

/** "Unlimited" for Scale, otherwise the real monthly credit amount --
 * the one place both Billing and AI Usage should read this from so the
 * label can never drift between pages. */
export function formatCredits(plan: PlanDefinition): string {
  return plan.unlimited ? "Unlimited" : `${plan.monthlyCredits.toLocaleString()} credits`;
}

export function isUnlimitedPlan(planId: PlanId): boolean {
  return PLANS[planId]?.unlimited === true;
}

export const CREDIT_COSTS = {
  chat: 4,
  scriptGenerateSingle: 7,
  scriptGenerateMulti: 18,
  perImage: 3,
} as const;

const SCRIPT_REWRITE_COSTS: Record<string, number> = {
  rewrite: 3,
  expand: 4,
  shorten: 2,
  improve: 3,
  continue: 4,
};
const TONE_CHANGE_COST = 3;

/** action is one of rewrite/expand/shorten/improve/continue, or "tone-{name}"
 * for an explicit tone-change chip -- matches Script Studio's runAction/
 * rewriteActionFor conventions. */
export function scriptRewriteCost(action: string): number {
  if (action.startsWith("tone-")) return TONE_CHANGE_COST;
  return SCRIPT_REWRITE_COSTS[action] ?? SCRIPT_REWRITE_COSTS["rewrite"]!;
}

export function scriptGenerateCost(multiOption: boolean): number {
  return multiOption ? CREDIT_COSTS.scriptGenerateMulti : CREDIT_COSTS.scriptGenerateSingle;
}

export function imageCost(count: number): number {
  return count * CREDIT_COSTS.perImage;
}

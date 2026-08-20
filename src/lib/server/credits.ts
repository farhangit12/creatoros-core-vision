import { randomUUID } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { aiGenerations, creditLedger, userCredits } from "@/db/schema";
import { PLANS, type PlanId } from "@/lib/credits";

export type CreditAccountRecord = typeof userCredits.$inferSelect;

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  if (!session) {
    throw new Error("Not authenticated.");
  }
  return session.user.id;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export class InsufficientCreditsError extends Error {
  constructor(
    public required: number,
    public available: number,
  ) {
    super(`Not enough credits — this needs ${required}, you have ${available}.`);
    this.name = "InsufficientCreditsError";
  }
}

export class DailyImageCapacityError extends Error {
  constructor() {
    super(
      "We've hit today's shared image-generation capacity across all users. It resets at midnight UTC — try Script Studio or Chat in the meantime.",
    );
    this.name = "DailyImageCapacityError";
  }
}

/** Mirrors settings.ts's loadOrCreateSettings pattern: lazily creates a
 * Free-tier account on first read, so an account created before the
 * databaseHooks wiring (or if that hook ever fails) is never left without a
 * balance row. */
async function loadOrCreateAccount(userId: string): Promise<CreditAccountRecord> {
  const [existing] = await db.select().from(userCredits).where(eq(userCredits.userId, userId));
  if (existing) {
    return existing;
  }
  const plan = PLANS.free;
  const [created] = await db
    .insert(userCredits)
    .values({ userId, planId: plan.id, balance: plan.monthlyCredits, renewsAt: addMonths(new Date(), 1) })
    .onConflictDoNothing()
    .returning();
  if (created) {
    await db.insert(creditLedger).values({
      id: randomUUID(),
      userId,
      delta: plan.monthlyCredits,
      reason: "signup_bonus",
      balanceAfter: plan.monthlyCredits,
    });
    return created;
  }
  // Lost a create race to a concurrent request -- reread the row it created.
  const [row] = await db.select().from(userCredits).where(eq(userCredits.userId, userId));
  if (!row) {
    throw new Error("Failed to initialize credit account.");
  }
  return row;
}

async function applyMonthlyResetIfDue(account: CreditAccountRecord): Promise<CreditAccountRecord> {
  if (new Date() < new Date(account.renewsAt)) {
    return account;
  }
  const plan = PLANS[account.planId as PlanId] ?? PLANS.free;
  const [updated] = await db
    .update(userCredits)
    .set({ balance: plan.monthlyCredits, renewsAt: addMonths(new Date(), 1), updatedAt: new Date() })
    .where(eq(userCredits.userId, account.userId))
    .returning();
  const finalRow = updated ?? account;
  await db.insert(creditLedger).values({
    id: randomUUID(),
    userId: account.userId,
    delta: plan.monthlyCredits - account.balance,
    reason: "monthly_reset",
    balanceAfter: finalRow.balance,
  });
  return finalRow;
}

/** Lazy-reset-aware balance getter -- no cron needed. Every read checks
 * whether the account's renewsAt has passed and resets it in place first. */
export async function getOrInitCreditAccount(userId: string): Promise<CreditAccountRecord> {
  const account = await loadOrCreateAccount(userId);
  return applyMonthlyResetIfDue(account);
}

export const getCreditBalance = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  return getOrInitCreditAccount(userId);
});

/** Called from better-auth's databaseHooks.user.create.after (auth.ts) --
 * covers both email/password and Google OAuth signups, since both create a
 * `user` row through the same path. Safe to call redundantly; loadOrCreate
 * is idempotent. */
export async function initCreditAccountForNewUser(userId: string): Promise<void> {
  await loadOrCreateAccount(userId);
}

/** Throws InsufficientCreditsError if the balance can't cover cost. Call
 * this BEFORE the AI provider call so a doomed request never spends free-
 * tier request budget on output that gets discarded. */
export async function checkAndReserveCredits(userId: string, cost: number): Promise<void> {
  const account = await getOrInitCreditAccount(userId);
  if (account.balance < cost) {
    throw new InsufficientCreditsError(cost, account.balance);
  }
}

/** Atomically decrements the balance and logs a ledger row. Call this only
 * after a generation has been persisted as completed -- a failed generation
 * is never charged. The WHERE balance >= cost guard makes this safe even if
 * a race slipped past checkAndReserveCredits. */
export async function deductCredits(params: {
  userId: string;
  cost: number;
  generationId: string;
}): Promise<void> {
  const [updated] = await db
    .update(userCredits)
    .set({ balance: sql`${userCredits.balance} - ${params.cost}`, updatedAt: new Date() })
    .where(and(eq(userCredits.userId, params.userId), gte(userCredits.balance, params.cost)))
    .returning();
  if (!updated) {
    throw new InsufficientCreditsError(params.cost, 0);
  }
  await db.insert(creditLedger).values({
    id: randomUUID(),
    userId: params.userId,
    delta: -params.cost,
    reason: "ai_generation",
    generationId: params.generationId,
    balanceAfter: updated.balance,
  });
}

// Conservative 25% headroom under the researched ~2,000/day Cloudflare
// Workers AI free-tier estimate for this app's image sizes -- see the
// billing/credits plan for the full capacity research.
const SAFE_DAILY_IMAGE_CAP = 1500;

function utcMidnightToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Global, account-wide safety valve -- independent of any single user's
 * balance. Protects the shared Cloudflare Workers AI free-tier quota from
 * being exhausted by app-wide demand, not just one heavy user. Reuses
 * ai_generations directly (already indexed on createdAt); no new counter
 * table needed. */
export async function checkGlobalImageCapacity(): Promise<void> {
  const [row] = await db
    .select({ value: count() })
    .from(aiGenerations)
    .where(
      and(
        inArray(aiGenerations.feature, ["image-studio", "thumbnail-studio"]),
        eq(aiGenerations.status, "completed"),
        gte(aiGenerations.createdAt, utcMidnightToday()),
      ),
    );
  if ((row?.value ?? 0) >= SAFE_DAILY_IMAGE_CAP) {
    throw new DailyImageCapacityError();
  }
}

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { creditLedger, userCredits } from "@/db/schema";
import { PLANS, type PlanId } from "@/lib/credits";
import { polarClient, POLAR_PRODUCT_TO_PLAN } from "@/lib/server/polar-client";
import { recordAuditEvent } from "@/lib/server/audit-log";

/**
 * The only place that writes Polar-derived subscription state into our own
 * DB -- called from both the webhook handler (auth.ts) and the
 * checkout-return page (billing.tsx), so there's one code path to reason
 * about instead of duplicated logic. Treats Polar's own Customer State
 * (looked up live by externalId = our user.id) as the single source of
 * truth, never trusts our cached polarCustomerId/subscriptionId for
 * anything beyond convenience display.
 */
export async function syncPolarSubscriptionState(userId: string): Promise<void> {
  const state = await polarClient.customers.getStateExternal({ externalId: userId });
  const activeSubscription = state.activeSubscriptions.find(
    (s) => s.status === "active" || s.status === "trialing",
  );

  const [account] = await db.select().from(userCredits).where(eq(userCredits.userId, userId));
  if (!account) {
    // No credit account yet -- databaseHooks.user.create.after always
    // creates one, so this is only reachable from a race with signup.
    // Nothing to sync against; the next webhook/return-page call will
    // find the account and sync correctly.
    return;
  }

  if (!activeSubscription) {
    // No active/trialing subscription -- revert to Free if not already
    // there. Balance is left as-is: a downgrade doesn't claw back credits
    // already granted, it just stops future paid-tier grants. Feature
    // gating and the daily cap key off planId alone, so this takes effect
    // immediately.
    const wasPaid = account.planId !== "free";
    await db.transaction(async (tx) => {
      await tx
        .update(userCredits)
        .set({
          polarCustomerId: state.id,
          polarSubscriptionId: null,
          subscriptionStatus: null,
          updatedAt: new Date(),
          ...(wasPaid ? { planId: "free" satisfies PlanId } : {}),
        })
        .where(eq(userCredits.userId, userId));
      if (wasPaid) {
        await tx.insert(creditLedger).values({
          id: crypto.randomUUID(),
          userId,
          delta: 0,
          reason: "plan_downgraded",
          balanceAfter: account.balance,
        });
      }
    });
    if (wasPaid) {
      await recordAuditEvent({ userId, event: "plan_downgraded", metadata: { from: account.planId } });
    }
    return;
  }

  const planId = POLAR_PRODUCT_TO_PLAN[activeSubscription.productId];
  if (!planId) {
    // Subscribed to a product id we don't recognize (stale/test product) --
    // don't guess a plan, leave the account untouched.
    return;
  }
  const plan = PLANS[planId];
  const subscriptionStatus = activeSubscription.cancelAtPeriodEnd ? "canceled" : activeSubscription.status;

  // A real payment (first purchase or renewal) opens a period end further
  // out than what we currently have stored -- grant the plan's credits.
  // Otherwise this is just a status refresh within the same period (e.g. a
  // cancellation flips cancelAtPeriodEnd without a new grant).
  const isNewGrant = activeSubscription.currentPeriodEnd.getTime() > new Date(account.renewsAt).getTime();

  if (isNewGrant) {
    const newBalance = plan.unlimited ? account.balance : plan.monthlyCredits;
    await db.transaction(async (tx) => {
      await tx
        .update(userCredits)
        .set({
          planId,
          balance: newBalance,
          renewsAt: activeSubscription.currentPeriodEnd,
          polarCustomerId: state.id,
          polarSubscriptionId: activeSubscription.id,
          subscriptionStatus,
          updatedAt: new Date(),
        })
        .where(eq(userCredits.userId, userId));
      await tx.insert(creditLedger).values({
        id: crypto.randomUUID(),
        userId,
        delta: plan.unlimited ? 0 : plan.monthlyCredits - account.balance,
        reason: "subscription_granted",
        balanceAfter: newBalance,
      });
    });
    await recordAuditEvent({ userId, event: "plan_granted", metadata: { planId } });
    return;
  }

  await db
    .update(userCredits)
    .set({
      polarCustomerId: state.id,
      polarSubscriptionId: activeSubscription.id,
      subscriptionStatus,
      updatedAt: new Date(),
    })
    .where(eq(userCredits.userId, userId));
}

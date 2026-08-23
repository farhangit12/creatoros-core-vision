import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Check, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionLabel } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCreditBalance, syncPolarStateAction } from "@/lib/server/credits";
import { authClient } from "@/lib/auth-client";
import { PLANS, formatCredits, isUnlimitedPlan, type PlanId } from "@/lib/credits";

export const Route = createFileRoute("/_app/billing")({
  validateSearch: (search: Record<string, unknown>): { checkout?: string } => ({
    ...(typeof search["checkout"] === "string" ? { checkout: search["checkout"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Billing — CreatorOS AI" },
      {
        name: "description",
        content: "Plan, payment method and invoice history for CreatorOS AI.",
      },
      { property: "og:title", content: "Billing — CreatorOS AI" },
      {
        property: "og:description",
        content: "Manage your CreatorOS AI subscription and invoices.",
      },
    ],
  }),
  component: BillingPage,
});

// Credit numbers come from PLANS (src/lib/credits.ts) -- the same source
// the server uses to actually grant/reset balances, so this page can never
// drift from what a user really gets. Scale was recalibrated from an
// earlier 8,000cr/mo draft after checking real backend capacity: the image
// pipeline runs on Cloudflare Workers AI's free tier, a shared ceiling for
// the whole app (not per user) -- see PLANS's comment for the full math.
const plans = [
  {
    ...PLANS.free,
    recommended: false,
    tagline: "Low-risk product discovery.",
    cta: "Start Free",
    features: [
      `${PLANS.free.monthlyCredits.toLocaleString()} CreatorOS credits / month`,
      "AI Chat",
      "Script Studio",
      "Basic Image generation",
      "Basic Thumbnail generation",
      "Limited Projects",
      "Content Planner",
      "Basic usage visibility",
      "Standard generation priority",
    ],
  },
  {
    ...PLANS.pro,
    recommended: true,
    tagline: "Primary individual creator plan.",
    cta: "Upgrade to Pro",
    features: [
      `${PLANS.pro.monthlyCredits.toLocaleString()} CreatorOS credits / month`,
      "AI Chat",
      "Full Script Studio",
      "Image Studio",
      "Thumbnail Studio",
      "Unlimited Projects",
      "Content Planner",
      "Higher generation limits",
      "Faster generation priority",
      "Advanced AI controls where supported",
    ],
  },
  {
    ...PLANS.scale,
    recommended: false,
    tagline: "High-volume creators / creator businesses.",
    cta: "Upgrade to Scale",
    features: [
      "Unlimited CreatorOS credits / month",
      "Everything in Pro",
      "No monthly generation cap",
      "Higher project/storage allowance",
      "Advanced usage visibility",
      "Early access to new capabilities",
      "Image/thumbnail generation may briefly queue during high shared demand across all users",
    ],
  },
];

const comparisonRows = [
  {
    feature: "Monthly Credits",
    free: formatCredits(PLANS.free),
    pro: formatCredits(PLANS.pro),
    scale: formatCredits(PLANS.scale),
  },
  { feature: "AI Creation", free: "Chat, Script, Basic Visuals", pro: "Full Script, Image & Thumbnail Studios", scale: "Full Studios + Higher Allowance" },
  { feature: "Projects", free: "Limited (3 active)", pro: "Unlimited", scale: "Unlimited" },
  { feature: "Content Planner", free: "Standard Calendar", pro: "Standard Calendar", scale: "Standard + Extended Queue" },
  { feature: "Usage Limits", free: "Discovery cap", pro: "Higher creator limits", scale: "Unlimited (fair-use limits apply during high shared demand)" },
];

function notifyUnavailable() {
  toast("Checkout isn't connected yet", {
    description: "Plan upgrades will be available once billing is live.",
  });
}

async function startCheckout(slug: "pro" | "scale") {
  try {
    await authClient.checkout({ slug });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Couldn't start checkout. Try again.");
  }
}

async function openBillingPortal() {
  try {
    await authClient.customer.portal();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Couldn't open billing portal. Try again.");
  }
}

function BillingPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const getCreditBalanceFn = useServerFn(getCreditBalance);
  const syncPolarStateFn = useServerFn(syncPolarStateAction);
  const { data: account } = useQuery({
    queryKey: ["credit-balance"],
    queryFn: () => getCreditBalanceFn(),
  });
  const currentPlan = account ? (PLANS[account.planId as keyof typeof PLANS] ?? PLANS.free) : undefined;
  const currentPlanUnlimited = account ? isUnlimitedPlan(account.planId as PlanId) : false;
  const cancelsAtPeriodEnd = account?.subscriptionStatus === "canceled";
  const paymentPastDue = account?.subscriptionStatus === "past_due";

  useEffect(() => {
    if (search.checkout !== "success") return;
    syncPolarStateFn()
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
        toast.success("Plan updated!");
      })
      .catch(() => {
        toast.error("Payment received, but we couldn't refresh your plan yet — reload in a moment.");
      });
    void navigate({ to: "/billing", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.checkout]);

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Account"
        title="Billing & Plans"
        description="Manage your plan, credit allowance and invoice history."
      />

      <section>
        <SectionLabel>Current plan</SectionLabel>
        {paymentPastDue ? (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-warning/30 bg-warning/10 px-5 py-4"
          >
            <div className="flex gap-2.5">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
              <p className="text-[13px] leading-relaxed text-foreground">
                Your last payment didn't go through. We'll keep retrying automatically, but your plan may be
                downgraded if it keeps failing — update your payment method to avoid losing access.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={openBillingPortal} className="shrink-0">
              Update payment method
            </Button>
          </div>
        ) : null}
        <div className="rounded-2xl border border-border p-7">
          {account && currentPlan ? (
            <>
              <p className="text-[15px] font-medium text-foreground">{currentPlan.name} plan</p>
              <p className="mt-2 font-mono text-[13px] text-accent-brand">
                {currentPlanUnlimited
                  ? "Unlimited credits"
                  : `${account.balance.toLocaleString()} of ${currentPlan.monthlyCredits.toLocaleString()} credits remaining`}
              </p>
              <p className="mt-2 text-[13px] text-text-subtle">
                {cancelsAtPeriodEnd
                  ? `Cancels ${new Date(account.renewsAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })} — reverts to Free`
                  : `Renews ${new Date(account.renewsAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`}
              </p>
            </>
          ) : (
            <p className="text-[14px] text-text-subtle">Loading your plan…</p>
          )}
        </div>
      </section>

      <section>
        <SectionLabel>Plans</SectionLabel>
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-surface p-6 transition-colors duration-200",
                p.recommended
                  ? "border-accent-brand/60 bg-surface shadow-floating ring-1 ring-accent-brand/30"
                  : "border-border",
              )}
            >
              {p.recommended ? (
                <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-accent-brand px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-primary-foreground shadow-sm">
                  Recommended
                </span>
              ) : null}

              <p className="text-[17px] font-medium text-foreground">{p.name}</p>
              <p className="mt-1 text-[13px] text-text-muted">{p.tagline}</p>

              <div className="mt-5 border-y border-border-subtle py-4">
                <p className="font-mono text-[30px] leading-none tracking-[-0.03em] text-foreground">
                  ${p.monthlyPriceUsd}
                  <span className="text-[13px] font-normal text-text-subtle">/month</span>
                </p>
                <p className="mt-2 font-mono text-[11px] text-accent-brand">
                  {p.unlimited ? "Unlimited CreatorOS credits" : `${p.monthlyCredits.toLocaleString()} CreatorOS credits`}
                </p>
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-[13px] text-text-muted"
                  >
                    <Check className="mt-0.5 size-3.5 shrink-0 text-accent-brand" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6 pt-2">
                <Button
                  size="sm"
                  variant={p.recommended ? "default" : "outline"}
                  className={cn("w-full", p.recommended && "bg-accent-brand hover:bg-accent-hover")}
                  disabled={account?.planId === p.id}
                  onClick={
                    p.id === "pro"
                      ? () => void startCheckout("pro")
                      : p.id === "scale"
                        ? () => void startCheckout("scale")
                        : notifyUnavailable
                  }
                >
                  {account?.planId === p.id ? "Current plan" : p.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Plan comparison</SectionLabel>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border-subtle text-text-subtle">
                  <th className="px-5 py-3.5 font-normal">Feature</th>
                  <th className="px-5 py-3.5 font-normal">Free</th>
                  <th className="bg-accent-tint/30 px-5 py-3.5 font-medium text-foreground">Pro</th>
                  <th className="px-5 py-3.5 font-normal">Scale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {comparisonRows.map((row) => (
                  <tr key={row.feature}>
                    <td className="px-5 py-3.5 font-medium text-foreground">{row.feature}</td>
                    <td className="px-5 py-3.5 text-text-muted">{row.free}</td>
                    <td className="bg-accent-tint/30 px-5 py-3.5 text-foreground">{row.pro}</td>
                    <td className="px-5 py-3.5 text-text-muted">{row.scale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Billing & payment</SectionLabel>
        {account && account.planId !== "free" ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <CreditCard className="size-5 text-text-subtle" />
              <div>
                <p className="text-[14px] text-foreground">Payment method, invoices & cancellation</p>
                <p className="text-[13px] text-text-subtle">Manage everything through Polar's billing portal.</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={openBillingPortal}>
              Manage billing
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-10 text-center">
            <p className="text-[14px] text-foreground">No payment method on file</p>
            <p className="mt-1 text-[13px] text-text-subtle">
              Payment method, invoices and cancellation are managed here once you're on a paid plan.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

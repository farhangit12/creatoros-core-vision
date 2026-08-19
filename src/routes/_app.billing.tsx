import { createFileRoute } from "@tanstack/react-router";
import { Check, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionLabel } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/billing")({
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

const plans = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    credits: 150,
    tagline: "Low-risk product discovery.",
    cta: "Start Free",
    features: [
      "150 CreatorOS credits / month",
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
    id: "pro",
    name: "Pro",
    monthly: 29,
    credits: 2000,
    recommended: true,
    tagline: "Primary individual creator plan.",
    cta: "Upgrade to Pro",
    features: [
      "2,000 CreatorOS credits / month",
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
    id: "scale",
    name: "Scale",
    monthly: 79,
    credits: 8000,
    tagline: "High-volume creators / creator businesses.",
    cta: "Upgrade to Scale",
    features: [
      "8,000 CreatorOS credits / month",
      "Everything in Pro",
      "Higher generation limits",
      "Priority generation queue",
      "Higher image-generation allowance",
      "Higher project/storage allowance",
      "Advanced usage visibility",
      "Early access to new capabilities",
    ],
  },
];

const comparisonRows = [
  { feature: "Monthly Credits", free: "150 credits", pro: "2,000 credits", scale: "8,000 credits" },
  { feature: "AI Creation", free: "Chat, Script, Basic Visuals", pro: "Full Script, Image & Thumbnail Studios", scale: "Full Studios + Priority Output" },
  { feature: "Projects", free: "Limited (3 active)", pro: "Unlimited", scale: "Unlimited" },
  { feature: "Content Planner", free: "Standard Calendar", pro: "Standard Calendar", scale: "Standard + Extended Queue" },
  { feature: "Generation Priority", free: "Standard", pro: "Faster priority", scale: "Priority queue" },
  { feature: "Usage Limits", free: "Discovery cap", pro: "Higher creator limits", scale: "Maximum throughput" },
];

function notifyUnavailable() {
  toast("Checkout isn't connected yet", {
    description: "Plan upgrades will be available once billing is live.",
  });
}

function BillingPage() {
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Account"
        title="Billing & Plans"
        description="Manage your plan, credit allowance and invoice history."
      />

      <section>
        <SectionLabel>Current plan</SectionLabel>
        <div className="rounded-2xl border border-dashed border-border p-7">
          <p className="text-[14px] text-foreground">Not available yet</p>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-text-subtle">
            Your active plan and credit allowance will show here once billing
            is connected.
          </p>
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
                  ${p.monthly}
                  <span className="text-[13px] font-normal text-text-subtle">/month</span>
                </p>
                <p className="mt-2 font-mono text-[11px] text-accent-brand">
                  {p.credits.toLocaleString()} CreatorOS credits
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
                  onClick={notifyUnavailable}
                >
                  {p.cta}
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
        <SectionLabel>Payment method</SectionLabel>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <CreditCard className="size-5 text-text-subtle" />
            <p className="text-[14px] text-foreground">No payment method on file</p>
          </div>
          <Button size="sm" variant="outline" onClick={notifyUnavailable}>
            Add payment method
          </Button>
        </div>
      </section>

      <section>
        <SectionLabel>Invoice history</SectionLabel>
        <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-10 text-center">
          <p className="text-[14px] text-foreground">No invoices yet</p>
          <p className="mt-1 text-[13px] text-text-subtle">
            Invoices will appear here once you're on a paid plan.
          </p>
        </div>
      </section>
    </div>
  );
}

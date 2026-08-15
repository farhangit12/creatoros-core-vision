import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  Loader2,
  XCircle,
} from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/app/primitives";
import { StatusPill } from "@/components/app/studio-kit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { creditSummary } from "@/lib/creator-data";
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

type CheckoutState = "idle" | "loading" | "success" | "failed" | "cancelled";

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

const invoices = [
  { id: "INV-2091", date: "12 Aug 2026", amount: "$29.00", status: "Paid" as const },
  { id: "INV-2054", date: "12 Jul 2026", amount: "$29.00", status: "Paid" as const },
  { id: "INV-2011", date: "12 Jun 2026", amount: "$29.00", status: "Paid" as const },
  { id: "INV-1978", date: "12 May 2026", amount: "$29.00", status: "Failed" as const },
  { id: "INV-1932", date: "12 Apr 2026", amount: "$29.00", status: "Paid" as const },
];

const statusTone = {
  Paid: "success",
  Failed: "danger",
} as const;

function BillingPage() {
  const [checkout, setCheckout] = useState<CheckoutState>("idle");
  const [targetPlan, setTargetPlan] = useState<string | null>(null);
  const [updatePaymentOpen, setUpdatePaymentOpen] = useState(false);

  const pct = Math.round((creditSummary.used / creditSummary.allowance) * 100);

  const startUpgrade = (planId: string) => {
    setTargetPlan(planId);
    setCheckout("loading");
    window.setTimeout(() => {
      setCheckout(planId === "scale" ? "failed" : "success");
    }, 1400);
  };

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Account"
        title="Billing & Plans"
        description="Manage your plan, CreatorOS credits allowance and invoice history. All figures are illustrative prototype data."
      />

      <section>
        <SectionLabel>Current plan</SectionLabel>
        <div className="rounded-2xl border border-border bg-surface p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[20px] font-medium tracking-[-0.02em] text-foreground">
                {creditSummary.plan} plan
              </p>
              <p className="mt-1 text-[13px] text-text-muted">
                {creditSummary.allowance.toLocaleString()} CreatorOS credits / month · renews{" "}
                {creditSummary.renewsOn}
              </p>
            </div>
            <StatusPill tone="accent">Active</StatusPill>
          </div>
          <div
            className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-accent-brand transition-[width] duration-300 ease-os"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-3 font-mono text-[11px] text-text-subtle">
            {creditSummary.used.toLocaleString()} used of{" "}
            {creditSummary.allowance.toLocaleString()} · {creditSummary.remaining.toLocaleString()}{" "}
            credits remaining
          </p>
        </div>
      </section>

      <section>
        <SectionLabel>Plans</SectionLabel>
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((p) => {
            const isCurrent = p.id === "pro";
            return (
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

                <div className="flex items-center justify-between gap-2">
                  <p className="text-[17px] font-medium text-foreground">{p.name}</p>
                  {isCurrent ? <StatusPill tone="accent">Current plan</StatusPill> : null}
                </div>

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
                  {isCurrent ? (
                    <Button size="sm" variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : p.id === "free" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => startUpgrade(p.id)}
                    >
                      {p.cta}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className={cn("w-full", p.recommended && "bg-accent-brand hover:bg-accent-hover")}
                      onClick={() => startUpgrade(p.id)}
                    >
                      {p.cta}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionLabel>Plan comparison</SectionLabel>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
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
      </section>

      <section>
        <SectionLabel>Payment method</SectionLabel>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <CreditCard className="size-5 text-text-subtle" />
            <div>
              <p className="text-[14px] text-foreground">Visa ending 4242</p>
              <p className="text-[13px] text-text-subtle">Expires 08/2027</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => setUpdatePaymentOpen(true)}>
            Update payment method
          </Button>
        </div>
      </section>

      <section>
        <SectionLabel>Invoice history</SectionLabel>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border-subtle text-text-subtle">
                <th className="px-5 py-3 font-normal">Invoice</th>
                <th className="px-5 py-3 font-normal">Date</th>
                <th className="px-5 py-3 font-normal">Amount</th>
                <th className="px-5 py-3 font-normal">Status</th>
                <th className="px-5 py-3 font-normal text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-5 py-3 text-foreground">{inv.id}</td>
                  <td className="px-5 py-3 text-text-muted">{inv.date}</td>
                  <td className="px-5 py-3 font-mono text-foreground">{inv.amount}</td>
                  <td className="px-5 py-3">
                    <StatusPill tone={statusTone[inv.status]}>{inv.status}</StatusPill>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button size="icon" variant="ghost" className="size-8" aria-label="Download invoice">
                      <Download className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionLabel>Cancel subscription</SectionLabel>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-danger/25 bg-danger/5 p-5">
          <div>
            <p className="text-[14px] text-foreground">Cancel your subscription</p>
            <p className="mt-1 text-[13px] text-text-subtle">
              You'll keep access until the end of the current cycle, then drop to Free.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="border-danger/30 text-danger hover:bg-danger/10 hover:text-danger"
              >
                Cancel subscription
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                <AlertDialogDescription>
                  This ends your Pro plan at the end of the billing cycle on{" "}
                  {creditSummary.renewsOn}. You can resubscribe at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep plan</AlertDialogCancel>
                <AlertDialogAction onClick={() => setCheckout("cancelled")}>
                  Confirm cancellation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>

      <section>
        <SectionLabel>State preview (dev only)</SectionLabel>
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-dashed border-border bg-surface p-3">
          {(["idle", "loading", "success", "failed", "cancelled"] as CheckoutState[]).map(
            (s) => (
              <button
                key={s}
                type="button"
                onClick={() => setCheckout(s)}
                className={cn(
                  "h-7 rounded-md border px-2.5 text-[11px] capitalize transition-colors",
                  checkout === s
                    ? "border-accent-brand/40 bg-accent-tint text-foreground"
                    : "border-border bg-surface-2 text-text-subtle hover:text-foreground",
                )}
              >
                {s}
              </button>
            ),
          )}
        </div>
      </section>

      <Dialog open={checkout === "loading"}>
        <DialogContent className="sm:max-w-sm">
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <Loader2 className="size-8 animate-spin text-accent-brand" />
            <p className="text-[14px] text-foreground">Processing checkout…</p>
            <p className="text-[13px] text-text-subtle">
              Confirming your {targetPlan} plan change. This is a mock delay.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={checkout === "success"} onOpenChange={(o) => !o && setCheckout("idle")}>
        <DialogContent className="sm:max-w-sm">
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <CheckCircle2 className="size-10 text-success" />
            <DialogHeader className="items-center text-center">
              <DialogTitle>Subscription confirmed</DialogTitle>
              <DialogDescription>
                Your plan has been updated. Changes apply immediately in this prototype.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={() => setCheckout("idle")}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={checkout === "failed"} onOpenChange={(o) => !o && setCheckout("idle")}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Payment failed</DialogTitle>
            <DialogDescription>
              We couldn't process your card for this plan change.
            </DialogDescription>
          </DialogHeader>
          <Alert className="border-danger/30 bg-danger/10 text-foreground">
            <XCircle className="size-4 text-danger" />
            <AlertTitle>Card declined</AlertTitle>
            <AlertDescription>
              Update your payment method and try again.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckout("idle")}>
              Dismiss
            </Button>
            <Button onClick={() => targetPlan && startUpgrade(targetPlan)}>Retry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={checkout === "cancelled"} onOpenChange={(o) => !o && setCheckout("idle")}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Checkout cancelled</DialogTitle>
            <DialogDescription>No changes were made to your subscription.</DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="size-4 text-text-subtle" />
            <AlertTitle>Nothing changed</AlertTitle>
            <AlertDescription>Your current plan remains active.</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button className="w-full" onClick={() => setCheckout("idle")}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={updatePaymentOpen} onOpenChange={setUpdatePaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update payment method</DialogTitle>
            <DialogDescription>
              Card details connect to a real processor in a later phase.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="cc-number">Card number</Label>
              <Input id="cc-number" disabled placeholder="4242 4242 4242 4242" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cc-exp">Expiry</Label>
                <Input id="cc-exp" disabled placeholder="08/27" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cc-cvc">CVC</Label>
                <Input id="cc-cvc" disabled placeholder="•••" />
              </div>
            </div>
            <p className="text-[12px] text-text-subtle">
              Payment processing connects later — this form is a visual placeholder only.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdatePaymentOpen(false)}>
              Close
            </Button>
            <Button disabled>Save card</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Gauge, TrendingUp, Zap } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/ai-usage")({
  head: () => ({
    meta: [
      { title: "AI Usage & Credits — CreatorOS AI" },
      {
        name: "description",
        content:
          "Track credit balance, consumption by category and plan details in CreatorOS AI.",
      },
      { property: "og:title", content: "AI Usage & Credits — CreatorOS AI" },
      {
        property: "og:description",
        content: "Credit balance, usage history and plan details.",
      },
    ],
  }),
  component: AiUsagePage,
});

const categories = [
  { label: "Script generation", value: 1120, tone: "accent" },
  { label: "Image & thumbnail", value: 780, tone: "muted" },
  { label: "Chat & ideation", value: 430, tone: "muted" },
  { label: "Transcription", value: 190, tone: "muted" },
];

const history = [
  { day: "Mon", value: 42 },
  { day: "Tue", value: 68 },
  { day: "Wed", value: 31 },
  { day: "Thu", value: 88 },
  { day: "Fri", value: 74 },
  { day: "Sat", value: 22 },
  { day: "Sun", value: 55 },
];

function AiUsagePage() {
  const used = 2520;
  const total = 5000;
  const pct = Math.round((used / total) * 100);

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Workspace"
        title="AI Usage & Credits"
        description="Understand how your workspace spends credits, and when they renew. Figures below are illustrative prototype data."
        actions={
          <Button size="sm" variant="outline">
            Manage plan
          </Button>
        }
      />

      <section className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="bg-surface p-7">
          <div className="flex items-center gap-2 text-text-subtle">
            <Zap className="size-4 text-accent-brand" />
            <span className="label-eyebrow">Credit balance</span>
          </div>
          <p className="mt-5 font-mono text-[36px] leading-none tracking-[-0.03em] text-foreground">
            {(total - used).toLocaleString()}
          </p>
          <p className="mt-2 text-[13px] text-text-muted">
            of {total.toLocaleString()} credits remaining
          </p>
          <div
            className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Credits used"
          >
            <div
              className="h-full rounded-full bg-accent-brand transition-[width] duration-300 ease-os"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-3 font-mono text-[11px] text-text-subtle">
            {pct}% used · renews 1 Sep
          </p>
        </div>

        <div className="bg-surface p-7">
          <span className="label-eyebrow">This cycle</span>
          <p className="mt-5 font-mono text-[28px] leading-none tracking-[-0.02em] text-foreground">
            {used.toLocaleString()}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[13px] text-success">
            <TrendingUp className="size-3.5" /> 12% vs last cycle
          </p>
          <p className="mt-6 text-[13px] leading-relaxed text-text-subtle">
            Average of 84 credits per active day.
          </p>
        </div>

        <div className="bg-surface p-7">
          <span className="label-eyebrow">Plan</span>
          <p className="mt-5 text-[20px] font-medium tracking-[-0.02em] text-foreground">
            Studio
          </p>
          <p className="mt-2 text-[13px] text-text-muted">
            5,000 credits / month
          </p>
          <Button size="sm" className="mt-6 w-full">
            Upgrade to Scale
          </Button>
        </div>
      </section>

      <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionLabel
            aside={
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                last 7 days
              </span>
            }
          >
            Usage history
          </SectionLabel>
          <div className="rounded-xl border border-border bg-surface p-7">
            <div className="flex h-40 items-end gap-3">
              {history.map((h) => (
                <div key={h.day} className="flex flex-1 flex-col items-center gap-3">
                  <div className="flex h-full w-full items-end">
                    <div
                      className="w-full rounded-sm bg-accent-brand/70 transition-colors duration-200 hover:bg-accent-brand"
                      style={{ height: `${h.value}%` }}
                      title={`${h.day}: ${h.value * 4} credits`}
                    />
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-text-subtle">
                    {h.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <SectionLabel>By category</SectionLabel>
          <ul className="divide-y divide-border-subtle rounded-xl border border-border bg-surface">
            {categories.map((c) => (
              <li
                key={c.label}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      c.tone === "accent" ? "bg-accent-brand" : "bg-surface-3",
                    )}
                  />
                  <span className="truncate text-[13px] text-text-muted">
                    {c.label}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[12px] text-foreground">
                  {c.value.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section>
        <SectionLabel>Balance states</SectionLabel>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              label: "Healthy",
              tone: "success",
              copy: "Plenty of credits for the rest of the cycle.",
            },
            {
              label: "Low balance",
              tone: "warning",
              copy: "Under 15% remaining — consider topping up.",
            },
            {
              label: "Exhausted",
              tone: "danger",
              copy: "Generation is paused until renewal or upgrade.",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <span
                className={cn(
                  "inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]",
                  s.tone === "success" && "text-success",
                  s.tone === "warning" && "text-warning",
                  s.tone === "danger" && "text-danger",
                )}
              >
                <Gauge className="size-3.5" />
                {s.label}
              </span>
              <p className="mt-3 text-[13px] leading-relaxed text-text-muted">
                {s.copy}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
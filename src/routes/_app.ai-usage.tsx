import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Zap } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { creditSummary, models } from "@/lib/creator-data";

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

const historyByRange = {
  Today: [
    { day: "6a", value: 10 },
    { day: "9a", value: 35 },
    { day: "12p", value: 60 },
    { day: "3p", value: 80 },
    { day: "6p", value: 45 },
    { day: "9p", value: 25 },
  ],
  Week: [
    { day: "Mon", value: 42 },
    { day: "Tue", value: 68 },
    { day: "Wed", value: 31 },
    { day: "Thu", value: 88 },
    { day: "Fri", value: 74 },
    { day: "Sat", value: 22 },
    { day: "Sun", value: 55 },
  ],
  Month: [
    { day: "W1", value: 58 },
    { day: "W2", value: 72 },
    { day: "W3", value: 64 },
    { day: "W4", value: 90 },
  ],
};

const generations = [
  { feature: "Script generation", model: "CreatorOS Precise", credits: 9, at: "Today · 17:40" },
  { feature: "Thumbnail concept", model: "CreatorOS Balanced", credits: 4, at: "Today · 14:12" },
  { feature: "Chat ideation", model: "CreatorOS Fast", credits: 1, at: "Yesterday · 20:03" },
  { feature: "Caption pass", model: "CreatorOS Fast", credits: 1, at: "Yesterday · 11:47" },
  { feature: "Transcription cleanup", model: "CreatorOS Balanced", credits: 4, at: "2 days ago · 09:15" },
];

const ranges = ["Today", "Week", "Month"] as const;

function AiUsagePage() {
  const [range, setRange] = useState<(typeof ranges)[number]>("Week");
  const [showLowWarning, setShowLowWarning] = useState(
    creditSummary.remaining < creditSummary.lowThreshold,
  );
  const used = creditSummary.used;
  const total = creditSummary.allowance;
  const pct = Math.round((used / total) * 100);
  const history = historyByRange[range];

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Workspace"
        title="AI Usage & Credits"
        description="Understand how your workspace spends credits, and when they renew. Figures below are illustrative prototype data."
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link to="/billing">Billing</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/billing">Upgrade plan</Link>
            </Button>
          </>
        }
      />

      {showLowWarning ? (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-warning/30 bg-warning/10 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>
              <p className="text-[14px] text-foreground">Low credit balance</p>
              <p className="mt-1 text-[13px] text-text-muted">
                {creditSummary.remaining.toLocaleString()} credits remain, under the{" "}
                {creditSummary.lowThreshold.toLocaleString()}-credit threshold. Consider
                topping up before {creditSummary.renewsOn}.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/billing">Top up</Link>
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowLowWarning(true)}
          className="text-[11px] text-text-subtle underline underline-offset-2 hover:text-foreground"
        >
          Preview low-credit warning
        </button>
      )}

      <section className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-[1.5fr_1fr]">
        <div className="bg-surface p-7">
          <div className="flex items-center gap-2 text-text-subtle">
            <Zap className="size-4 text-accent-brand" />
            <span className="label-eyebrow">Credit balance</span>
          </div>
          <p className="mt-5 font-mono text-[36px] leading-none tracking-[-0.03em] text-foreground">
            {creditSummary.remaining.toLocaleString()}
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
            {pct}% used · renews {creditSummary.renewsOn}
          </p>
        </div>

        <div className="flex flex-col justify-between bg-surface p-7">
          <div>
            <span className="label-eyebrow">Plan</span>
            <p className="mt-5 text-[20px] font-medium tracking-[-0.02em] text-foreground">
              {creditSummary.plan} plan
            </p>
            <p className="mt-2 text-[13px] text-text-muted">
              {total.toLocaleString()} credits / month
            </p>
          </div>
          <Button asChild size="sm" className="mt-6 w-full">
            <Link to="/billing">Upgrade to Scale</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionLabel
            aside={
              <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
                {ranges.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRange(r)}
                    className={cn(
                      "h-6 rounded-md px-2.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                      range === r
                        ? "bg-accent-tint text-foreground"
                        : "text-text-subtle hover:text-foreground",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
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
          <SectionLabel>By feature</SectionLabel>
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
        <SectionLabel
          aside={
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
              per-generation log
            </span>
          }
        >
          Generation history
        </SectionLabel>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border-subtle text-text-subtle">
                <th className="px-5 py-3 font-normal">Feature</th>
                <th className="px-5 py-3 font-normal">Model</th>
                <th className="px-5 py-3 font-normal">Credits</th>
                <th className="px-5 py-3 font-normal">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {generations.map((g, i) => (
                <tr key={i}>
                  <td className="px-5 py-3 text-foreground">{g.feature}</td>
                  <td className="px-5 py-3 text-text-muted">{g.model}</td>
                  <td className="px-5 py-3 font-mono text-foreground">{g.credits}</td>
                  <td className="px-5 py-3 font-mono text-[11px] text-text-subtle">
                    {g.at}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <SectionLabel>Estimated cost per generation</SectionLabel>
        <ul className="grid gap-4 md:grid-cols-3">
          {models.map((m) => (
            <li key={m.id} className="rounded-xl border border-border bg-surface p-5">
              <p className="text-[14px] text-foreground">{m.label}</p>
              <p className="mt-2 font-mono text-[12px] text-text-subtle">{m.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

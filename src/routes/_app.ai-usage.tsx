import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Gauge,
  MessagesSquare,
  FileText,
  Image as ImageIcon,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/app/primitives";
import { StatusPill, type StateTone } from "@/components/app/studio-kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUsageSummary, listGenerations } from "@/lib/server/ai/ai-usage";

export const Route = createFileRoute("/_app/ai-usage")({
  head: () => ({
    meta: [
      { title: "AI Usage & Credits — CreatorOS AI" },
      {
        name: "description",
        content: "Track AI generation activity in CreatorOS AI.",
      },
      { property: "og:title", content: "AI Usage & Credits — CreatorOS AI" },
      {
        property: "og:description",
        content: "Generation history and usage by feature.",
      },
    ],
  }),
  component: AiUsagePage,
});

const FEATURE_ORDER = ["chat", "script-studio", "image-studio", "thumbnail-studio"] as const;

const FEATURE_META: Record<(typeof FEATURE_ORDER)[number], { label: string; icon: LucideIcon }> = {
  chat: { label: "Chat & ideation", icon: MessagesSquare },
  "script-studio": { label: "Script generation", icon: FileText },
  "image-studio": { label: "Image generation", icon: Sparkles },
  "thumbnail-studio": { label: "Thumbnail generation", icon: ImageIcon },
};

const featureLabels: Record<string, string> = Object.fromEntries(
  FEATURE_ORDER.map((f) => [f, FEATURE_META[f].label]),
);

function countForFeature(byFeature: { feature: string; count: number }[], feature: string): number {
  return byFeature.find((b) => b.feature === feature)?.count ?? 0;
}

const STATUS_META: Record<string, { label: string; tone: StateTone }> = {
  completed: { label: "Completed", tone: "success" },
  pending: { label: "Pending", tone: "warning" },
  failed: { label: "Failed", tone: "danger" },
};

function formatGenerationTimestamp(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${time}`;
}

function AiUsagePage() {
  const listGenerationsFn = useServerFn(listGenerations);
  const getUsageSummaryFn = useServerFn(getUsageSummary);

  const { data: generations = [] } = useQuery({
    queryKey: ["ai-usage-generations"],
    queryFn: () => listGenerationsFn({ data: {} }),
  });

  const { data: summary } = useQuery({
    queryKey: ["ai-usage-summary"],
    queryFn: () => getUsageSummaryFn(),
  });

  const [activeFeature, setActiveFeature] = useState<(typeof FEATURE_ORDER)[number] | null>(null);

  const categories = useMemo(() => {
    const byFeature = summary?.byFeature ?? [];
    return FEATURE_ORDER.map((feature) => ({
      feature,
      label: FEATURE_META[feature].label,
      icon: FEATURE_META[feature].icon,
      value: countForFeature(byFeature, feature),
    }));
  }, [summary]);

  const filteredGenerations = useMemo(
    () => (activeFeature ? generations.filter((g) => g.feature === activeFeature) : generations),
    [generations, activeFeature],
  );

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Workspace"
        title="AI Usage & Credits"
        description="Track how your workspace uses AI across Chat, Script Studio, Image Studio and Thumbnail Studio."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/billing">Billing</Link>
          </Button>
        }
      />

      <section className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-[1.5fr_1fr]">
        <div className="bg-surface p-7">
          <div className="flex items-center gap-2 text-text-subtle">
            <Gauge className="size-4 text-accent-brand" />
            <span className="label-eyebrow">Total generations</span>
          </div>
          <p className="mt-5 font-mono text-[36px] leading-none tracking-[-0.03em] text-foreground">
            {generations.length.toLocaleString()}
          </p>
          <p className="mt-2 text-[13px] text-text-muted">
            across Chat, Script Studio, Image Studio and Thumbnail Studio
          </p>
        </div>

        <div className="flex flex-col justify-between bg-surface p-7">
          <div>
            <span className="label-eyebrow">Credits & plan</span>
            <p className="mt-5 text-[15px] font-medium tracking-[-0.02em] text-foreground">
              Not available yet
            </p>
            <p className="mt-2 text-[13px] text-text-muted">
              Credit balance and plan details will show here once billing is
              connected.
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="mt-6 w-full">
            <Link to="/billing">View plans</Link>
          </Button>
        </div>
      </section>

      <section>
        <SectionLabel
          aside={
            activeFeature ? (
              <button
                type="button"
                onClick={() => setActiveFeature(null)}
                className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-accent-brand hover:underline"
              >
                <X className="size-3" />
                Clear filter
              </button>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                click a feature to filter the log below
              </span>
            )
          }
        >
          By feature
        </SectionLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {categories.map((c) => {
            const Icon = c.icon;
            const isActive = activeFeature === c.feature;
            return (
              <button
                key={c.feature}
                type="button"
                onClick={() => setActiveFeature((cur) => (cur === c.feature ? null : c.feature))}
                aria-pressed={isActive}
                className={cn(
                  "flex flex-col items-start gap-4 rounded-xl border bg-surface p-5 text-left transition-colors",
                  isActive ? "border-accent-brand bg-accent-tint" : "border-border hover:bg-surface-2",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg border",
                    isActive
                      ? "border-accent-brand/30 bg-surface text-accent-brand"
                      : "border-border bg-surface-2 text-text-muted",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="font-mono text-[22px] leading-none tracking-[-0.02em] text-foreground">
                    {c.value.toLocaleString()}
                  </p>
                  <p className="mt-2 text-[13px] text-text-muted">{c.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionLabel
          aside={
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
              {activeFeature ? `filtered · ${FEATURE_META[activeFeature].label}` : "per-generation log"}
            </span>
          }
        >
          Generation history
        </SectionLabel>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border-subtle text-text-subtle">
                  <th className="px-5 py-3 font-normal">Feature</th>
                  <th className="px-5 py-3 font-normal">Status</th>
                  <th className="px-5 py-3 font-normal">Model</th>
                  <th className="px-5 py-3 font-normal">Tokens</th>
                  <th className="px-5 py-3 font-normal">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredGenerations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-6 text-center text-[12px] text-text-subtle">
                      {generations.length === 0
                        ? "No generations yet — try Chat, Script Studio, Image Studio or Thumbnail Studio."
                        : `No generations for ${activeFeature ? FEATURE_META[activeFeature].label : "this feature"} yet.`}
                    </td>
                  </tr>
                ) : (
                  filteredGenerations.map((g) => {
                    const statusMeta = STATUS_META[g.status] ?? { label: g.status, tone: "neutral" as StateTone };
                    return (
                      <tr key={g.id}>
                        <td className="px-5 py-3 text-foreground">{featureLabels[g.feature] ?? g.feature}</td>
                        <td className="px-5 py-3">
                          <StatusPill tone={statusMeta.tone}>{statusMeta.label}</StatusPill>
                        </td>
                        <td className="px-5 py-3 text-text-muted">{g.model}</td>
                        <td className="px-5 py-3 font-mono text-foreground">{g.totalTokens ?? 0}</td>
                        <td className="px-5 py-3 font-mono text-[11px] text-text-subtle">
                          {formatGenerationTimestamp(g.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

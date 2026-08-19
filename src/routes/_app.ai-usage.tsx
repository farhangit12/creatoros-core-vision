import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gauge } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/app/primitives";
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

const featureLabels: Record<string, string> = {
  chat: "Chat & ideation",
  "script-studio": "Script generation",
  "image-studio": "Image generation",
  "thumbnail-studio": "Thumbnail generation",
};

function countForFeatures(byFeature: { feature: string; count: number }[], features: string[]): number {
  return features.reduce((sum, f) => sum + (byFeature.find((b) => b.feature === f)?.count ?? 0), 0);
}

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

  const categories = useMemo(() => {
    const byFeature = summary?.byFeature ?? [];
    return [
      { label: "Script generation", value: countForFeatures(byFeature, ["script-studio"]), tone: "accent" },
      { label: "Image & thumbnail", value: countForFeatures(byFeature, ["image-studio", "thumbnail-studio"]), tone: "muted" },
      { label: "Chat & ideation", value: countForFeatures(byFeature, ["chat"]), tone: "muted" },
    ];
  }, [summary]);

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

      <section className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
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
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-border-subtle text-text-subtle">
                    <th className="px-5 py-3 font-normal">Feature</th>
                    <th className="px-5 py-3 font-normal">Model</th>
                    <th className="px-5 py-3 font-normal">Tokens</th>
                    <th className="px-5 py-3 font-normal">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {generations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-[12px] text-text-subtle">
                        No generations yet — try Chat, Script Studio, Image Studio or Thumbnail Studio.
                      </td>
                    </tr>
                  ) : (
                    generations.map((g) => (
                      <tr key={g.id}>
                        <td className="px-5 py-3 text-foreground">{featureLabels[g.feature] ?? g.feature}</td>
                        <td className="px-5 py-3 text-text-muted">{g.model}</td>
                        <td className="px-5 py-3 font-mono text-foreground">{g.totalTokens ?? 0}</td>
                        <td className="px-5 py-3 font-mono text-[11px] text-text-subtle">
                          {formatGenerationTimestamp(g.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
    </div>
  );
}

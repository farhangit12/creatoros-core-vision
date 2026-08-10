import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  Eye,
  Heart,
  Clock,
  MousePointerClick,
  Users,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Link2,
} from "lucide-react";
import { EmptyState, PhaseBadge, SectionLabel } from "@/components/app/primitives";
import { ChipGroup, StatusPill } from "@/components/app/studio-kit";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { platforms } from "@/lib/creator-data";

export const Route = createFileRoute("/_app/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — CreatorOS AI" },
      { name: "description", content: "Performance, trends and reporting across every channel you publish to." },
      { property: "og:title", content: "Analytics — CreatorOS AI" },
      { property: "og:description", content: "Performance, trends and reporting across every channel you publish to." },
    ],
  }),
  component: AnalyticsPage,
});

const ranges = ["7d", "30d", "90d"];
const contentTypes = ["All types", "Long-form", "Short", "Post", "Carousel"];

const kpis = [
  { label: "Views", value: "184.2K", delta: 12.4, icon: Eye },
  { label: "Engagement", value: "8.9%", delta: 1.8, icon: Heart },
  { label: "Watch time", value: "3.1K hrs", delta: 6.2, icon: Clock },
  { label: "CTR", value: "5.4%", delta: -0.6, icon: MousePointerClick },
  { label: "Subscribers", value: "+1,204", delta: 9.1, icon: Users },
  { label: "Content published", value: "18", delta: 20.0, icon: FileText },
];

const growthData = [
  { day: "Mon", views: 4200, engagement: 320 },
  { day: "Tue", views: 5100, engagement: 410 },
  { day: "Wed", views: 4800, engagement: 380 },
  { day: "Thu", views: 6200, engagement: 520 },
  { day: "Fri", views: 7100, engagement: 610 },
  { day: "Sat", views: 8300, engagement: 705 },
  { day: "Sun", views: 7600, engagement: 640 },
];

const growthConfig = {
  views: { label: "Views", color: "var(--chart-1)" },
  engagement: { label: "Engagement", color: "var(--chart-2)" },
} satisfies ChartConfig;

const topContent = [
  { title: "Why your hook is failing (Short)", views: "42.1K", engagement: "11.2%" },
  { title: "Studio tour — behind the scenes", views: "31.8K", engagement: "9.4%" },
  { title: "3 editing mistakes to avoid", views: "27.5K", engagement: "8.1%" },
  { title: "Q&A: growing from zero", views: "19.9K", engagement: "7.6%" },
];

const platformCompareData = platforms.map((p, i) => ({
  platform: p.label,
  views: [62, 48, 39, 21, 17][i] ?? 20,
}));

const platformCompareConfig = {
  views: { label: "Views (K)", color: "var(--chart-3)" },
} satisfies ChartConfig;

const insights = [
  {
    text: "Shorts published before 6pm get 34% more first-hour views. Schedule your next batch earlier.",
    action: "Open Planner",
    to: "/content-planner" as LinkProps["to"] & string,
  },
  {
    text: "Your last 3 thumbnails with a face close-up outperform text-only variants by 2.1x.",
    action: "Open Thumbnail Studio",
    to: "/thumbnail-studio" as LinkProps["to"] & string,
  },
  {
    text: "Scripts using a question hook hold viewers 18% longer than statement hooks this month.",
    action: "Open Script Studio",
    to: "/script-studio" as LinkProps["to"] & string,
  },
];

const recentContent = [
  { title: "Why your hook is failing", platform: "YouTube", published: "2 days ago", views: "42.1K", engagement: "11.2%", status: "Published" },
  { title: "Studio tour", platform: "Instagram", published: "3 days ago", views: "31.8K", engagement: "9.4%", status: "Published" },
  { title: "3 editing mistakes", platform: "TikTok", published: "5 days ago", views: "27.5K", engagement: "8.1%", status: "Published" },
  { title: "Growth Q&A recap", platform: "LinkedIn", published: "1 week ago", views: "9.2K", engagement: "6.3%", status: "Published" },
  { title: "Weekend behind the scenes", platform: "X", published: "1 week ago", views: "4.6K", engagement: "4.9%", status: "Published" },
];

function AnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [platform, setPlatform] = useState("All platforms");
  const [type, setType] = useState("All types");
  const [connected] = useState(true);

  return (
    <div className="space-y-12">
      <header>
        <p className="label-eyebrow">Grow</p>
        <h1 className="mt-2 text-[30px] font-medium leading-tight tracking-[-0.03em] text-foreground">
          Analytics
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
          Performance, trends and reporting across every channel you publish to.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 p-1">
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={
                range === r
                  ? "rounded-md bg-accent-tint px-3 py-1.5 font-mono text-[11px] text-accent-brand"
                  : "rounded-md px-3 py-1.5 font-mono text-[11px] text-text-muted transition-colors hover:text-foreground"
              }
            >
              {r}
            </button>
          ))}
        </div>
        <ChipGroup
          options={["All platforms", ...platforms.map((p) => p.label)]}
          value={platform}
          onChange={setPlatform}
        />
        <ChipGroup options={contentTypes} value={type} onChange={setType} />
      </section>

      {!connected ? (
        <EmptyState
          icon={Link2}
          title="Connect a channel to see analytics"
          description="Link a YouTube, Instagram or TikTok account to pull in real performance data."
          action={
            <div className="flex flex-col items-center gap-3">
              <Button size="sm" disabled>
                Connect a channel
              </Button>
              <PhaseBadge />
            </div>
          }
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <span className="grid size-7 place-items-center rounded-md border border-border bg-surface-2 text-text-muted">
                    <k.icon className="size-3.5" />
                  </span>
                  <span
                    className={
                      "flex items-center gap-0.5 font-mono text-[10px] " +
                      (k.delta >= 0 ? "text-success" : "text-danger")
                    }
                  >
                    {k.delta >= 0 ? (
                      <ArrowUpRight className="size-3" />
                    ) : (
                      <ArrowDownRight className="size-3" />
                    )}
                    {Math.abs(k.delta)}%
                  </span>
                </div>
                <p className="mt-3 font-mono text-[20px] text-foreground">{k.value}</p>
                <p className="mt-1 text-[11px] text-text-subtle">{k.label}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl border border-border bg-surface p-5">
              <SectionLabel>Growth over time</SectionLabel>
              <ChartContainer config={growthConfig} className="aspect-auto h-[260px] w-full">
                <AreaChart data={growthData}>
                  <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="var(--color-views)"
                    fill="var(--color-views)"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="engagement"
                    stroke="var(--color-engagement)"
                    fill="var(--color-engagement)"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ChartContainer>
            </div>

            <div className="rounded-xl border border-border bg-surface p-5">
              <SectionLabel>Top content</SectionLabel>
              <div className="space-y-3">
                {topContent.map((c, i) => (
                  <div key={c.title} className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-text-subtle">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-foreground">{c.title}</p>
                      <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                        <div
                          className="h-1.5 rounded-full bg-accent-brand"
                          style={{ width: `${100 - i * 20}%` }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-text-subtle">
                      {c.views}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-5">
            <SectionLabel>Platform comparison</SectionLabel>
            <ChartContainer config={platformCompareConfig} className="aspect-auto h-[220px] w-full">
              <BarChart data={platformCompareData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid horizontal={false} stroke="var(--border-subtle)" />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis
                  dataKey="platform"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={80}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="views" fill="var(--color-views)" radius={4} />
              </BarChart>
            </ChartContainer>
          </section>

          <section>
            <SectionLabel>CreatorOS Insight</SectionLabel>
            <div className="grid gap-4 md:grid-cols-3">
              {insights.map((ins) => (
                <div key={ins.text} className="flex flex-col rounded-xl border border-accent-brand/25 bg-accent-tint p-5">
                  <Sparkles className="size-4 text-accent-brand" />
                  <p className="mt-3 flex-1 text-[13px] leading-relaxed text-foreground">
                    {ins.text}
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-4 self-start">
                    <Link to={ins.to}>{ins.action}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionLabel>Recent content performance</SectionLabel>
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentContent.map((c) => (
                    <TableRow key={c.title}>
                      <TableCell className="text-foreground">{c.title}</TableCell>
                      <TableCell className="text-text-muted">{c.platform}</TableCell>
                      <TableCell className="text-text-subtle">{c.published}</TableCell>
                      <TableCell className="font-mono text-text-muted">{c.views}</TableCell>
                      <TableCell className="font-mono text-text-muted">{c.engagement}</TableCell>
                      <TableCell>
                        <StatusPill tone="success">{c.status}</StatusPill>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

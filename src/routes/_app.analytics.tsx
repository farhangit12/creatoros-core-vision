import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { ModulePlaceholder, WireBlock } from "@/components/app/primitives";

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

function AnalyticsPage() {
  return (
    <ModulePlaceholder
      icon={BarChart3}
      eyebrow="Grow"
      title="Analytics"
      description="Performance, trends and reporting across every channel you publish to."
      capabilities={[
        { title: "KPIs", body: "Restrained metric rows, not vanity tiles." },
        { title: "Trends", body: "Time ranges with comparison periods." },
        { title: "Reports", body: "Saved views and scheduled exports." },
      ]}
      preview={
        <div className="space-y-3 rounded-xl border border-border bg-surface-2/60 p-5">
          <WireBlock className="h-2.5 w-24" />
          <WireBlock className="h-20 w-full" />
          <div className="flex gap-3">
            <WireBlock className="h-12 flex-1" />
            <WireBlock className="h-12 flex-1" />
          </div>
          <WireBlock className="h-2.5 w-32" />
        </div>
      }
    />
  );
}

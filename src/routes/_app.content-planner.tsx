import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange } from "lucide-react";
import { ModulePlaceholder, WireBlock } from "@/components/app/primitives";

export const Route = createFileRoute("/_app/content-planner")({
  head: () => ({
    meta: [
      { title: "Content Planner — CreatorOS AI" },
      { name: "description", content: "Plan publishing across channels on a calendar and timeline that understands production time." },
      { property: "og:title", content: "Content Planner — CreatorOS AI" },
      { property: "og:description", content: "Plan publishing across channels on a calendar and timeline that understands production time." },
    ],
  }),
  component: ContentPlannerPage,
});

function ContentPlannerPage() {
  return (
    <ModulePlaceholder
      icon={CalendarRange}
      eyebrow="Organize"
      title="Content Planner"
      description="Plan publishing across channels on a calendar and timeline that understands production time."
      capabilities={[
        { title: "Calendar", body: "Month and week views with drag scheduling." },
        { title: "Timeline", body: "Production lanes per channel." },
        { title: "Status", body: "Idea, drafting, review, scheduled, live." },
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

import { createFileRoute } from "@tanstack/react-router";
import { Workflow } from "lucide-react";
import { ModulePlaceholder, WireBlock } from "@/components/app/primitives";

export const Route = createFileRoute("/_app/automation")({
  head: () => ({
    meta: [
      { title: "Automation — CreatorOS AI" },
      { name: "description", content: "Chain triggers, conditions and actions into workflows that run your busywork." },
      { property: "og:title", content: "Automation — CreatorOS AI" },
      { property: "og:description", content: "Chain triggers, conditions and actions into workflows that run your busywork." },
    ],
  }),
  component: AutomationPage,
});

function AutomationPage() {
  return (
    <ModulePlaceholder
      icon={Workflow}
      eyebrow="Grow"
      title="Automation"
      description="Chain triggers, conditions and actions into workflows that run your busywork."
      capabilities={[
        { title: "Triggers", body: "Schedule, publish or status changes." },
        { title: "Logic", body: "Conditions and branching between steps." },
        { title: "Canvas", body: "A visual builder with run history." },
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

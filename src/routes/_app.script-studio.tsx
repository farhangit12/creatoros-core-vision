import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { ModulePlaceholder, WireBlock } from "@/components/app/primitives";

export const Route = createFileRoute("/_app/script-studio")({
  head: () => ({
    meta: [
      { title: "Script Studio — CreatorOS AI" },
      { name: "description", content: "Draft, structure and refine long-form scripts with an editor built for spoken words." },
      { property: "og:title", content: "Script Studio — CreatorOS AI" },
      { property: "og:description", content: "Draft, structure and refine long-form scripts with an editor built for spoken words." },
    ],
  }),
  component: ScriptStudioPage,
});

function ScriptStudioPage() {
  return (
    <ModulePlaceholder
      icon={FileText}
      eyebrow="Create"
      title="Script Studio"
      description="Draft, structure and refine long-form scripts with an editor built for spoken words."
      capabilities={[
        { title: "Outline", body: "Beat-by-beat structure with retention markers." },
        { title: "Editor", body: "Distraction-free writing with inline rewrites." },
        { title: "Versions", body: "Compare drafts and restore any revision." },
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

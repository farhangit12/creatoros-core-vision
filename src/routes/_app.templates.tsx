import { createFileRoute } from "@tanstack/react-router";
import { LayoutTemplate } from "lucide-react";
import { ModulePlaceholder, WireBlock } from "@/components/app/primitives";

export const Route = createFileRoute("/_app/templates")({
  head: () => ({
    meta: [
      { title: "Templates — CreatorOS AI" },
      { name: "description", content: "Reusable starting points for scripts, posts, thumbnails and project structures." },
      { property: "og:title", content: "Templates — CreatorOS AI" },
      { property: "og:description", content: "Reusable starting points for scripts, posts, thumbnails and project structures." },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  return (
    <ModulePlaceholder
      icon={LayoutTemplate}
      eyebrow="Organize"
      title="Templates"
      description="Reusable starting points for scripts, posts, thumbnails and project structures."
      capabilities={[
        { title: "Discovery", body: "Featured sets and category browsing." },
        { title: "Preview", body: "Inspect structure before applying." },
        { title: "Use", body: "Spin up a project or draft in one action." },
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

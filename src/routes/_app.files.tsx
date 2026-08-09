import { createFileRoute } from "@tanstack/react-router";
import { Files } from "lucide-react";
import { ModulePlaceholder, WireBlock } from "@/components/app/primitives";

export const Route = createFileRoute("/_app/files")({
  head: () => ({
    meta: [
      { title: "Files — CreatorOS AI" },
      { name: "description", content: "A workspace drive for footage, drafts, exports and reference assets." },
      { property: "og:title", content: "Files — CreatorOS AI" },
      { property: "og:description", content: "A workspace drive for footage, drafts, exports and reference assets." },
    ],
  }),
  component: FilesPage,
});

function FilesPage() {
  return (
    <ModulePlaceholder
      icon={Files}
      eyebrow="Organize"
      title="Files"
      description="A workspace drive for footage, drafts, exports and reference assets."
      capabilities={[
        { title: "Folders", body: "Nested structure with breadcrumbs." },
        { title: "Views", body: "Grid and list with type icons and metadata." },
        { title: "Actions", body: "Upload, select, rename and context menus." },
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

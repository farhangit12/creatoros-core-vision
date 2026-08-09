import { createFileRoute } from "@tanstack/react-router";
import { FolderKanban } from "lucide-react";
import { ModulePlaceholder, WireBlock } from "@/components/app/primitives";

export const Route = createFileRoute("/_app/projects")({
  head: () => ({
    meta: [
      { title: "Projects — CreatorOS AI" },
      { name: "description", content: "Every deliverable, client and campaign in one operating surface — with search, filters and status." },
      { property: "og:title", content: "Projects — CreatorOS AI" },
      { property: "og:description", content: "Every deliverable, client and campaign in one operating surface — with search, filters and status." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  return (
    <ModulePlaceholder
      icon={FolderKanban}
      eyebrow="Organize"
      title="Projects"
      description="Every deliverable, client and campaign in one operating surface — with search, filters and status."
      capabilities={[
        { title: "Grid & list", body: "Switch views, sort by activity or deadline." },
        { title: "Metadata", body: "Status, channel, owner and due date." },
        { title: "Filters", body: "Narrow by status, channel or template." },
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

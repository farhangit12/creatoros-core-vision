import { createFileRoute } from "@tanstack/react-router";
import { ImageIcon } from "lucide-react";
import { ModulePlaceholder, WireBlock } from "@/components/app/primitives";

export const Route = createFileRoute("/_app/thumbnail-studio")({
  head: () => ({
    meta: [
      { title: "Thumbnail Studio — CreatorOS AI" },
      { name: "description", content: "Compose click-worthy frames from layout presets, typography and generated imagery." },
      { property: "og:title", content: "Thumbnail Studio — CreatorOS AI" },
      { property: "og:description", content: "Compose click-worthy frames from layout presets, typography and generated imagery." },
    ],
  }),
  component: ThumbnailStudioPage,
});

function ThumbnailStudioPage() {
  return (
    <ModulePlaceholder
      icon={ImageIcon}
      eyebrow="Create"
      title="Thumbnail Studio"
      description="Compose click-worthy frames from layout presets, typography and generated imagery."
      capabilities={[
        { title: "Presets", body: "Composition templates tuned for legibility." },
        { title: "Canvas", body: "Layers, safe areas and text treatments." },
        { title: "Variants", body: "A/B sets exported at platform sizes." },
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

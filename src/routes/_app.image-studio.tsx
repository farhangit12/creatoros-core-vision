import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { ModulePlaceholder, WireBlock } from "@/components/app/primitives";

export const Route = createFileRoute("/_app/image-studio")({
  head: () => ({
    meta: [
      { title: "Image Studio — CreatorOS AI" },
      { name: "description", content: "Generate and iterate on brand-consistent imagery, covers and social assets." },
      { property: "og:title", content: "Image Studio — CreatorOS AI" },
      { property: "og:description", content: "Generate and iterate on brand-consistent imagery, covers and social assets." },
    ],
  }),
  component: ImageStudioPage,
});

function ImageStudioPage() {
  return (
    <ModulePlaceholder
      icon={Sparkles}
      eyebrow="Create"
      title="Image Studio"
      description="Generate and iterate on brand-consistent imagery, covers and social assets."
      capabilities={[
        { title: "Prompting", body: "Reusable style anchors per project." },
        { title: "Iteration", body: "Variations, upscales and inpainting." },
        { title: "Library", body: "Everything generated, tagged and reusable." },
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

import { createFileRoute } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";
import { ModulePlaceholder, WireBlock } from "@/components/app/primitives";

export const Route = createFileRoute("/_app/video-studio")({
  head: () => ({
    meta: [
      { title: "Video Studio — CreatorOS AI" },
      { name: "description", content: "Assemble short-form cuts, captions and renders on a single timeline." },
      { property: "og:title", content: "Video Studio — CreatorOS AI" },
      { property: "og:description", content: "Assemble short-form cuts, captions and renders on a single timeline." },
    ],
  }),
  component: VideoStudioPage,
});

function VideoStudioPage() {
  return (
    <ModulePlaceholder
      icon={Clapperboard}
      eyebrow="Create"
      title="Video Studio"
      description="Assemble short-form cuts, captions and renders on a single timeline."
      capabilities={[
        { title: "Timeline", body: "Trim, reorder and beat-match clips." },
        { title: "Captions", body: "Auto-styled subtitles with brand presets." },
        { title: "Render", body: "Queue exports per platform aspect ratio." },
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

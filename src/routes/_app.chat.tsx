import { createFileRoute } from "@tanstack/react-router";
import { MessagesSquare } from "lucide-react";
import { ModulePlaceholder, WireBlock } from "@/components/app/primitives";

export const Route = createFileRoute("/_app/chat")({
  head: () => ({
    meta: [
      { title: "AI Chat — CreatorOS AI" },
      { name: "description", content: "A conversational workspace for ideation, rewriting and research — with your brand voice in context." },
      { property: "og:title", content: "AI Chat — CreatorOS AI" },
      { property: "og:description", content: "A conversational workspace for ideation, rewriting and research — with your brand voice in context." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  return (
    <ModulePlaceholder
      icon={MessagesSquare}
      eyebrow="Create"
      title="AI Chat"
      description="A conversational workspace for ideation, rewriting and research — with your brand voice in context."
      capabilities={[
        { title: "Conversations", body: "A persistent list of threads, pinned and searchable." },
        { title: "Composer", body: "Attachments, model selector and streaming responses." },
        { title: "Context", body: "Bring projects, files and scripts into the thread." },
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

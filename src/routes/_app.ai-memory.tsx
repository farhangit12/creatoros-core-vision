import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/primitives";

export const Route = createFileRoute("/_app/ai-memory")({
  head: () => ({
    meta: [
      { title: "AI Memory — CreatorOS AI" },
      { name: "description", content: "AI Memory in CreatorOS AI." },
      { property: "og:title", content: "AI Memory — CreatorOS AI" },
      { property: "og:description", content: "AI Memory in CreatorOS AI." },
    ],
  }),
  component: AiMemoryPage,
});

function AiMemoryPage() {
  return <PageHeader title="AI Memory" />;
}

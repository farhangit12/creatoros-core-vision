import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/primitives";

export const Route = createFileRoute("/_app/knowledge-base")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — CreatorOS AI" },
      { name: "description", content: "Knowledge Base in CreatorOS AI." },
      { property: "og:title", content: "Knowledge Base — CreatorOS AI" },
      { property: "og:description", content: "Knowledge Base in CreatorOS AI." },
    ],
  }),
  component: KnowledgeBasePage,
});

function KnowledgeBasePage() {
  return <PageHeader title="Knowledge Base" />;
}

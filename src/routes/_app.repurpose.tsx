import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/primitives";

export const Route = createFileRoute("/_app/repurpose")({
  head: () => ({
    meta: [
      { title: "Repurpose — CreatorOS AI" },
      { name: "description", content: "Repurpose in CreatorOS AI." },
      { property: "og:title", content: "Repurpose — CreatorOS AI" },
      { property: "og:description", content: "Repurpose in CreatorOS AI." },
    ],
  }),
  component: RepurposePage,
});

function RepurposePage() {
  return <PageHeader title="Repurpose" />;
}

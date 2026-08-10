import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/primitives";

export const Route = createFileRoute("/_app/brand-kit")({
  head: () => ({
    meta: [
      { title: "Brand Kit — CreatorOS AI" },
      { name: "description", content: "Brand Kit in CreatorOS AI." },
      { property: "og:title", content: "Brand Kit — CreatorOS AI" },
      { property: "og:description", content: "Brand Kit in CreatorOS AI." },
    ],
  }),
  component: BrandKitPage,
});

function BrandKitPage() {
  return <PageHeader title="Brand Kit" />;
}

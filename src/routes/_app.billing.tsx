import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/primitives";

export const Route = createFileRoute("/_app/billing")({
  head: () => ({
    meta: [
      { title: "Billing — CreatorOS AI" },
      { name: "description", content: "Billing in CreatorOS AI." },
      { property: "og:title", content: "Billing — CreatorOS AI" },
      { property: "og:description", content: "Billing in CreatorOS AI." },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  return <PageHeader title="Billing" />;
}

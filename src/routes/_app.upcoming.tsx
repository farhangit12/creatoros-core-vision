import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, CalendarX2 } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  PhaseBadge,
  SectionLabel,
} from "@/components/app/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/upcoming")({
  head: () => ({
    meta: [
      { title: "Upcoming — CreatorOS AI" },
      {
        name: "description",
        content:
          "Scheduled and planned items across your CreatorOS AI workspace.",
      },
      { property: "og:title", content: "Upcoming — CreatorOS AI" },
      {
        property: "og:description",
        content: "Everything scheduled across your workspace.",
      },
    ],
  }),
  component: UpcomingPage,
});

const reference = [
  {
    date: "Thu 28",
    items: [
      { time: "09:00", title: "Episode 42 — final cut review", status: "Scheduled" },
      { time: "14:30", title: "Newsletter draft due", status: "Draft" },
    ],
  },
  {
    date: "Sat 30",
    items: [{ time: "11:00", title: "Short-form batch publish", status: "Queued" }],
  },
];

const statusTone: Record<string, string> = {
  Scheduled: "text-accent-brand border-accent-brand/30",
  Draft: "text-text-muted border-border",
  Queued: "text-warning border-warning/30",
};

function UpcomingPage() {
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Workspace"
        title="Upcoming"
        description="Deadlines, publishing slots and reminders will collect here once scheduling is connected."
        actions={<PhaseBadge />}
      />

      <section>
        <SectionLabel>Your schedule</SectionLabel>
        <EmptyState
          icon={CalendarX2}
          title="Nothing scheduled"
          description="You have no scheduled items. When the Content Planner ships, everything you queue will appear here in date order."
        />
      </section>

      <section>
        <SectionLabel
          aside={
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
              interface reference only
            </span>
          }
        >
          Populated state
        </SectionLabel>
        <div className="space-y-8 rounded-2xl border border-dashed border-border p-7 opacity-70">
          {reference.map((day) => (
            <div key={day.date} className="grid gap-4 sm:grid-cols-[92px_1fr]">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-subtle">
                {day.date}
              </p>
              <ul className="space-y-3">
                {day.items.map((i) => (
                  <li
                    key={i.title}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border-subtle pb-3 last:border-0 last:pb-0"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <CalendarClock className="size-4 shrink-0 text-text-subtle" />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] text-foreground">
                          {i.title}
                        </span>
                        <span className="font-mono text-[11px] text-text-subtle">
                          {i.time}
                        </span>
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
                        statusTone[i.status],
                      )}
                    >
                      {i.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
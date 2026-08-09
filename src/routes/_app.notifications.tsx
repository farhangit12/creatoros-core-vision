import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  BellOff,
  CheckCircle2,
  Info,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/primitives";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — CreatorOS AI" },
      {
        name: "description",
        content:
          "Workspace notifications, grouped by day with read and unread states.",
      },
      { property: "og:title", content: "Notifications — CreatorOS AI" },
      {
        property: "og:description",
        content: "Everything that happened while you were creating.",
      },
    ],
  }),
  component: NotificationsPage,
});

type Kind = "success" | "warning" | "info" | "system";

const icons: Record<Kind, typeof Info> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  system: Sparkles,
};

const tones: Record<Kind, string> = {
  success: "text-success",
  warning: "text-warning",
  info: "text-accent-brand",
  system: "text-text-muted",
};

const groups = [
  {
    day: "Today",
    items: [
      {
        id: 1,
        kind: "system" as Kind,
        title: "Welcome to the CreatorOS prototype",
        body: "Modules marked “later phase” are visual destinations only.",
        time: "21:02",
        unread: true,
      },
      {
        id: 2,
        kind: "info" as Kind,
        title: "Credit cycle renews in 9 days",
        body: "2,480 credits remain on the Studio plan.",
        time: "17:40",
        unread: true,
      },
      {
        id: 3,
        kind: "warning" as Kind,
        title: "Two drafts have no assigned project",
        body: "Assign them once Projects ships to keep the workspace tidy.",
        time: "11:15",
        unread: true,
      },
    ],
  },
  {
    day: "Yesterday",
    items: [
      {
        id: 4,
        kind: "success" as Kind,
        title: "Workspace preferences saved",
        body: "Appearance and notification defaults were updated.",
        time: "19:22",
        unread: false,
      },
    ],
  },
];

const filters = ["All", "Unread", "System", "Alerts"] as const;

function NotificationsPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [readAll, setReadAll] = useState(false);
  const unread = readAll
    ? 0
    : groups.flatMap((g) => g.items).filter((i) => i.unread).length;

  const visible = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        if (filter === "Unread") return i.unread && !readAll;
        if (filter === "System") return i.kind === "system";
        if (filter === "Alerts") return i.kind === "warning";
        return true;
      }),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Workspace"
        title="Notifications"
        description={`${unread} unread · prototype notifications shown for interface reference.`}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setReadAll(true)}
            disabled={unread === 0}
          >
            Mark all read
          </Button>
        }
      />

      <div
        role="tablist"
        aria-label="Notification filters"
        className="flex flex-wrap gap-1 border-b border-border-subtle pb-px"
      >
        {filters.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "relative h-9 rounded-t-md px-3 text-[13px] transition-colors duration-150",
              filter === f
                ? "text-foreground"
                : "text-text-subtle hover:text-foreground",
            )}
          >
            {f}
            {filter === f ? (
              <span className="absolute inset-x-2 -bottom-px h-px bg-accent-brand" />
            ) : null}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="You're all caught up"
          description="New activity across your workspace will land here, grouped by day."
        />
      ) : (
        <div className="space-y-10">
          {visible.map((g) => (
            <section key={g.day}>
              <h2 className="label-eyebrow mb-4">{g.day}</h2>
              <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border bg-surface">
                {g.items.map((n) => {
                  const Icon = icons[n.kind];
                  const isUnread = n.unread && !readAll;
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "group flex items-start gap-4 px-5 py-4 transition-colors duration-150 hover:bg-surface-2",
                        isUnread && "bg-accent-tint/40",
                      )}
                    >
                      <Icon
                        className={cn("mt-0.5 size-4 shrink-0", tones[n.kind])}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[14px] text-foreground">
                            {n.title}
                          </p>
                          {isUnread ? (
                            <span className="size-1.5 shrink-0 rounded-full bg-accent-brand" />
                          ) : null}
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
                          {n.body}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-text-subtle">
                        {n.time}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label="Notification actions"
                          className="grid size-7 shrink-0 place-items-center rounded-md text-text-subtle opacity-0 transition-opacity hover:bg-surface-3 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem>Mark as read</DropdownMenuItem>
                          <DropdownMenuItem>Mute this type</DropdownMenuItem>
                          <DropdownMenuItem>Dismiss</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
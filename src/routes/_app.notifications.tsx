import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  BellOff,
  CheckCircle2,
  Info,
  MoreHorizontal,
  Sparkles,
  Trash2,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
type Category =
  | "System"
  | "AI generation"
  | "Credits"
  | "Publishing"
  | "Project updates";

type Item = {
  id: number;
  kind: Kind;
  category: Category;
  title: string;
  body: string;
  time: string;
  day: "Today" | "Yesterday" | "Earlier";
  unread: boolean;
  action?: { label: string; to: string };
};

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

const initialItems: Item[] = [
  {
    id: 1,
    kind: "system",
    category: "System",
    title: "Welcome to the CreatorOS prototype",
    body: "Modules marked “later phase” are visual destinations only.",
    time: "21:02",
    day: "Today",
    unread: true,
  },
  {
    id: 2,
    kind: "info",
    category: "Credits",
    title: "Credit cycle renews in 9 days",
    body: "2,480 credits remain on the Studio plan.",
    time: "17:40",
    day: "Today",
    unread: true,
    action: { label: "Top up credits", to: "/billing" },
  },
  {
    id: 3,
    kind: "warning",
    category: "Project updates",
    title: "Two drafts have no assigned project",
    body: "Assign them once Projects ships to keep the workspace tidy.",
    time: "11:15",
    day: "Today",
    unread: true,
    action: { label: "Open script", to: "/scripts" },
  },
  {
    id: 4,
    kind: "success",
    category: "AI generation",
    title: "Script generation finished",
    body: "Your long-form outline for “Studio setup” is ready to review.",
    time: "10:02",
    day: "Today",
    unread: false,
    action: { label: "Open script", to: "/scripts" },
  },
  {
    id: 5,
    kind: "success",
    category: "System",
    title: "Workspace preferences saved",
    body: "Appearance and notification defaults were updated.",
    time: "19:22",
    day: "Yesterday",
    unread: false,
  },
  {
    id: 6,
    kind: "info",
    category: "Publishing",
    title: "Post scheduled for YouTube",
    body: "“Weekly recap #12” is queued for tomorrow at 09:00.",
    time: "14:08",
    day: "Yesterday",
    unread: false,
  },
  {
    id: 7,
    kind: "info",
    category: "Credits",
    title: "Credit top-up applied",
    body: "500 bonus credits were added to your balance.",
    time: "09:44",
    day: "Earlier",
    unread: false,
  },
];

const filters = [
  "All",
  "Unread",
  "System",
  "AI generation",
  "Credits",
  "Publishing",
  "Project updates",
] as const;

const dayOrder = ["Today", "Yesterday", "Earlier"] as const;

function NotificationsPage() {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");

  const unreadCount = items.filter((i) => i.unread).length;

  const markAllRead = () =>
    setItems((prev) => prev.map((i) => ({ ...i, unread: false })));

  const clearAll = () => setItems([]);

  const toggleRead = (id: number) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, unread: !i.unread } : i)),
    );

  const remove = (id: number) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const filtered = items.filter((i) => {
    if (filter === "All") return true;
    if (filter === "Unread") return i.unread;
    return i.category === filter;
  });

  const groups = dayOrder
    .map((day) => ({ day, items: filtered.filter((i) => i.day === day) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Workspace"
        title="Notifications"
        description={`${unreadCount} unread · prototype notifications shown for interface reference.`}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={markAllRead}
              disabled={unreadCount === 0}
            >
              Mark all read
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={items.length === 0}>
                  Clear all
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all notifications?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes every notification from this list. It can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAll}>Clear all</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
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
              "relative h-9 whitespace-nowrap rounded-t-md px-3 text-[13px] transition-colors duration-150",
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

      {groups.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={
            filter === "All"
              ? "You're all caught up"
              : `No notifications in “${filter}”`
          }
          description="New activity across your workspace will land here, grouped by day."
        />
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <section key={g.day}>
              <h2 className="label-eyebrow mb-4">{g.day}</h2>
              <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border bg-surface">
                {g.items.map((n) => {
                  const Icon = icons[n.kind];
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "group flex items-start gap-4 px-5 py-4 transition-colors duration-150 hover:bg-surface-2",
                        n.unread && "bg-accent-tint/40",
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
                          {n.unread ? (
                            <span className="size-1.5 shrink-0 rounded-full bg-accent-brand" />
                          ) : null}
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
                          {n.body}
                        </p>
                        {n.action ? (
                          <Button asChild size="sm" variant="outline" className="mt-3">
                            <Link to={n.action.to}>{n.action.label}</Link>
                          </Button>
                        ) : null}
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
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onSelect={() => toggleRead(n.id)}>
                            {n.unread ? "Mark as read" : "Mark as unread"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => remove(n.id)}
                            className="text-danger focus:text-danger"
                          >
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
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

import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Menu, Search, Zap } from "lucide-react";
import { findNavItem } from "@/lib/navigation";
import { creditSummary } from "@/lib/creator-data";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const mockNotifications = [
  {
    id: "n1",
    title: "Script generation ready",
    body: "Your script 'AI Tools for 2026' was created in Script Studio.",
    time: "10m ago",
    unread: true,
  },
  {
    id: "n2",
    title: "Credits refilled",
    body: "Monthly allowance of 2,000 CreatorOS credits active.",
    time: "2h ago",
    unread: true,
  },
  {
    id: "n3",
    title: "Content Planner reminder",
    body: "You have 1 draft item scheduled for review this week.",
    time: "1d ago",
    unread: true,
  },
];

export function Topbar({
  onOpenSearch,
  onOpenMobileNav,
}: {
  onOpenSearch: () => void;
  onOpenMobileNav: () => void;
}) {
  const [unreadCount, setUnreadCount] = useState(3);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = findNavItem(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="grid size-9 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-foreground lg:hidden"
      >
        <Menu className="size-[18px]" />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-2 text-[13px]">
          <li className="hidden text-text-subtle sm:block">Workspace</li>
          <li aria-hidden className="hidden text-text-subtle sm:block">
            /
          </li>
          <li className="min-w-0 truncate font-medium text-foreground">
            {current?.label ?? "CreatorOS"}
          </li>
          {current?.status === "later" ? (
            <li className="hidden shrink-0 rounded-md border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle md:block">
              later phase
            </li>
          ) : null}
        </ol>
      </nav>

      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden h-9 w-[280px] items-center gap-2 rounded-lg border border-border bg-surface px-3 text-[13px] text-text-subtle transition-colors duration-150 hover:border-border hover:bg-surface-2 md:flex xl:w-[360px]"
      >
        <Search className="size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">
          Search everything
        </span>
        <kbd className="shrink-0 rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        onClick={onOpenSearch}
        aria-label="Search"
        className="grid size-9 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-foreground md:hidden"
      >
        <Search className="size-[18px]" />
      </button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/ai-usage"
            className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 font-mono text-[11px] text-text-muted transition-colors hover:bg-surface-2 hover:text-foreground sm:flex"
          >
            <Zap className="size-3.5 text-accent-brand" />
            {creditSummary.remaining.toLocaleString()}
            <span className="text-text-subtle">
              / {creditSummary.allowance.toLocaleString()}
            </span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>AI credits remaining this cycle</TooltipContent>
      </Tooltip>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Notifications"
          className="relative grid size-9 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent-brand ring-2 ring-background" />
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0 shadow-popover">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-foreground">
                Notifications
              </span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-accent-tint px-2 py-0.5 font-mono text-[10px] text-accent-brand">
                  {unreadCount} new
                </span>
              ) : null}
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => setUnreadCount(0)}
                className="text-[11px] text-text-subtle transition-colors hover:text-foreground"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-72 divide-y divide-border-subtle overflow-y-auto">
            {mockNotifications.map((n) => (
              <div
                key={n.id}
                className="flex items-start gap-3 p-3.5 text-left transition-colors hover:bg-surface-2"
              >
                <span
                  className={cn(
                    "mt-1 size-2 shrink-0 rounded-full",
                    unreadCount > 0 && n.unread
                      ? "bg-accent-brand"
                      : "bg-surface-3",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground">
                    {n.title}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-text-muted">
                    {n.body}
                  </p>
                  <span className="mt-1.5 block font-mono text-[10px] text-text-subtle">
                    {n.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border-subtle px-4 py-2.5 text-center">
            <Link
              to="/settings"
              className="text-[12px] text-text-subtle transition-colors hover:text-foreground"
            >
              Notification preferences →
            </Link>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-3 font-mono text-[11px] text-foreground transition-colors hover:bg-surface-2"
        >
          AR
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 shadow-popover">
          <DropdownMenuLabel className="font-normal">
            <p className="text-[13px] text-foreground">Alex Rivera</p>
            <p className="text-xs text-text-subtle">alex@creatoros.ai</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/profile">Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/login" className="text-danger focus:text-danger">
              Sign out
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
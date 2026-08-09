import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Menu, Search, Zap } from "lucide-react";
import { findNavItem } from "@/lib/navigation";
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

export function Topbar({
  onOpenSearch,
  onOpenMobileNav,
}: {
  onOpenSearch: () => void;
  onOpenMobileNav: () => void;
}) {
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
            2,480
            <span className="text-text-subtle">/ 5,000</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>AI credits remaining this cycle</TooltipContent>
      </Tooltip>

      <Link
        to="/notifications"
        aria-label="Notifications, 3 unread"
        className="relative grid size-9 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <Bell className="size-[18px]" />
        <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent-brand ring-2 ring-background" />
      </Link>

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
          <DropdownMenuItem asChild>
            <Link to="/ai-usage">AI usage & credits</Link>
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
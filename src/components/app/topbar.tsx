import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, Menu, Search } from "lucide-react";
import { findNavItem } from "@/lib/navigation";
import { authClient, useSession } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function Topbar({
  onOpenSearch,
  onOpenMobileNav,
}: {
  onOpenSearch: () => void;
  onOpenMobileNav: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = findNavItem(pathname);
  const navigate = useNavigate();
  const { data: session } = useSession();
  const user = session?.user;

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/login" });
  };

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

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Notifications"
          className="relative grid size-9 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Bell className="size-[18px]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-0 shadow-popover">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <span className="text-[13px] font-medium text-foreground">
              Notifications
            </span>
          </div>
          <div className="px-4 py-8 text-center">
            <p className="text-[13px] text-foreground">No notifications yet</p>
            <p className="mt-1 text-[12px] text-text-subtle">
              Activity across your workspace will appear here.
            </p>
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
          {user ? initialsFor(user.name) : "…"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 shadow-popover">
          <DropdownMenuLabel className="font-normal">
            <p className="text-[13px] text-foreground">{user?.name ?? "Loading…"}</p>
            <p className="text-xs text-text-subtle">{user?.email ?? ""}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/profile">Profile</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings">Settings</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={handleSignOut}
            className="text-danger focus:text-danger"
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
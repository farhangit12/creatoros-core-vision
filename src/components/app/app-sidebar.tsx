import { Link, useRouterState } from "@tanstack/react-router";
import { PanelLeftClose, PanelLeftOpen, LogOut, ChevronRight } from "lucide-react";
import { navigation } from "@/lib/navigation";
import { Monogram, Wordmark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SidebarNav({
  collapsed,
  onToggle,
  onNavigate,
  mobile = false,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isCollapsed = collapsed && !mobile;

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-os",
        isCollapsed ? "w-[68px]" : "w-[264px]",
        mobile && "w-full border-r-0",
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-border-subtle",
          isCollapsed ? "justify-center px-3" : "justify-between px-4",
        )}
      >
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5 rounded-md"
          aria-label="CreatorOS AI — Dashboard"
        >
          <Monogram className="size-7 shrink-0" />
          {!isCollapsed && <Wordmark />}
        </Link>
        {!isCollapsed && onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            className="grid size-7 shrink-0 place-items-center rounded-md text-text-subtle transition-colors duration-150 hover:bg-surface-2 hover:text-foreground"
          >
            <PanelLeftClose className="size-4" />
          </button>
        ) : null}
      </div>

      <nav
        aria-label="Primary"
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-5"
      >
        {navigation.map((group, gi) => (
          <div key={group.label} className={cn(gi > 0 && "mt-6")}>
            {isCollapsed ? (
              gi > 0 && <div className="mx-2 mb-3 h-px bg-border-subtle" />
            ) : (
              <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text-subtle">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.to;
                const link = (
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-[13px] transition-colors duration-150",
                      isCollapsed && "justify-center px-0",
                      active
                        ? "bg-accent-tint text-foreground"
                        : "text-text-muted hover:bg-surface-2 hover:text-foreground",
                    )}
                    aria-current={active ? "page" : undefined}
                  >
                    {active && !isCollapsed ? (
                      <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent-brand" />
                    ) : null}
                    <item.icon
                      className={cn(
                        "size-[17px] shrink-0",
                        active ? "text-accent-brand" : "text-current",
                      )}
                    />
                    {!isCollapsed && (
                      <>
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="shrink-0 rounded-full bg-accent-brand px-1.5 py-px font-mono text-[10px] text-primary-foreground">
                            {item.badge}
                          </span>
                        ) : item.status === "later" ? (
                          <span
                            aria-hidden
                            className="size-1.5 shrink-0 rounded-full bg-surface-3 group-hover:bg-warning/70"
                            title="Coming in a later phase"
                          />
                        ) : null}
                      </>
                    )}
                  </Link>
                );

                return (
                  <li key={item.to}>
                    {isCollapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent side="right" className="font-medium">
                          {item.label}
                          {item.status === "later" ? (
                            <span className="ml-2 text-text-subtle">
                              · later phase
                            </span>
                          ) : null}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border-subtle p-3">
        {isCollapsed && onToggle ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggle}
                aria-label="Expand sidebar"
                className="mb-2 grid h-9 w-full place-items-center rounded-lg text-text-subtle transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <PanelLeftOpen className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        ) : null}

        <Link
          to="/profile"
          onClick={onNavigate}
          className={cn(
            "flex h-11 items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-surface-2",
            isCollapsed && "justify-center px-0",
          )}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-3 font-mono text-[11px] text-foreground">
            AR
          </span>
          {!isCollapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-foreground">
                Alex Rivera
              </span>
              <span className="block truncate text-[11px] text-text-subtle">
                Studio plan
              </span>
            </span>
          )}
          {!isCollapsed && (
            <ChevronRight className="size-4 shrink-0 text-text-subtle" />
          )}
        </Link>
        {!isCollapsed && (
          <Link
            to="/login"
            onClick={onNavigate}
            className="mt-1 flex h-8 items-center gap-3 rounded-lg px-2 text-[12px] text-text-subtle transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <LogOut className="size-3.5" /> Sign out
          </Link>
        )}
      </div>
    </div>
  );
}
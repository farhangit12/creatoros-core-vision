import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Wraps a studio control that's Paid-only (see src/lib/plan-features.ts for
 * what gates each control). When `enabled` is false, renders the control
 * inert with a small "Pro" badge and an upgrade tooltip -- same lock UI
 * regardless of which studio/control it wraps. Purely a UI affordance; the
 * real enforcement lives server-side in each studio's server fn.
 */
export function PaidFeatureLock({
  enabled,
  label,
  children,
  className,
}: {
  enabled: boolean;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  if (enabled) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("relative inline-block", className)}>
          <div aria-disabled className="pointer-events-none opacity-50">
            {children}
          </div>
          <span className="pointer-events-none absolute -right-1.5 -top-1.5 inline-flex items-center gap-1 rounded-md border border-accent-brand/30 bg-accent-tint px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-accent-brand">
            <Lock className="size-2.5" />
            Pro
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>Upgrade to Pro to unlock {label}</TooltipContent>
    </Tooltip>
  );
}

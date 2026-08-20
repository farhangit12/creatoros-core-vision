import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { platforms, type Platform, type PlatformId } from "@/lib/creator-data";

/** A bordered panel used across studio surfaces. */
export function Panel({
  title,
  aside,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn("rounded-xl border border-border bg-surface", className)}
    >
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-border-subtle px-5 py-3.5">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-subtle">
            {title}
          </h2>
          {aside}
        </header>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-[12px] text-text-muted">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-text-subtle">{hint}</p> : null}
    </div>
  );
}

/** Small pill row used for enumerated choices (aspect ratio, style, duration). */
export function ChipGroup({
  options,
  value,
  onChange,
  disabled,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={cn(
            "h-8 rounded-lg border px-2.5 text-[12px] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
            value === o
              ? "border-accent-brand/40 bg-accent-tint text-foreground"
              : "border-border bg-surface-2 text-text-muted hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** Platform selector + the adaptive guidance panel required by platform-aware UI. */
export function PlatformPicker({
  value,
  onChange,
  compact,
}: {
  value: PlatformId;
  onChange: (v: PlatformId) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid gap-1.5", compact ? "grid-cols-5" : "grid-cols-5")}>
      {platforms.map((p) => (
        <Tooltip key={p.id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onChange(p.id)}
              aria-pressed={value === p.id}
              aria-label={p.label}
              className={cn(
                "flex h-11 items-center justify-center rounded-lg border transition-colors duration-150",
                value === p.id
                  ? "border-accent-brand/40 bg-accent-tint text-foreground"
                  : "border-border bg-surface-2 text-text-subtle hover:text-foreground",
              )}
            >
              <p.icon
                className={cn("size-4.5", value === p.id && "text-accent-brand")}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>{p.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

export function usePlatform(initial: PlatformId = "youtube") {
  const [id, setId] = useState<PlatformId>(initial);
  const platform = platforms.find((p) => p.id === id) as Platform;
  return { id, setId, platform };
}

/** Shows how the selected platform reshapes the output contract. */
export function PlatformGuidance({ platform }: { platform: Platform }) {
  const rows: [string, string][] = [
    ["Content type", platform.contentTypes.join(" · ")],
    ["Aspect ratio", platform.aspectRatios.join(" · ")],
    ["Duration", platform.durations.join(" · ")],
    ["Tone", platform.tone],
    ["Hook", platform.hook],
    ["Caption", platform.caption],
    ["CTA", platform.cta],
    ["Output", platform.outputFormat],
  ];
  return (
    <div className="space-y-3">
      <dl className="space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[92px_minmax(0,1fr)] gap-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
              {k}
            </dt>
            <dd className="text-[12px] leading-relaxed text-text-muted">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="flex items-start gap-2 rounded-lg border border-accent-brand/25 bg-accent-tint px-3 py-2.5 text-[12px] leading-relaxed text-foreground">
        <Sparkles className="mt-px size-3.5 shrink-0 text-accent-brand" />
        {platform.recommendation}
      </p>
    </div>
  );
}

export function RecommendedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-accent-brand/30 bg-accent-tint px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-accent-brand",
        className,
      )}
    >
      <Sparkles className="size-3" />
      AI recommended
    </span>
  );
}

/** A selectable generated option (script / image / thumbnail variation). */
export function OptionCard({
  label,
  title,
  recommended,
  selected,
  onSelect,
  meta,
  children,
  footer,
}: {
  label: string;
  title?: string;
  recommended?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  meta?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (onSelect && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-pressed={onSelect ? selected : undefined}
      className={cn(
        "flex flex-col rounded-xl border bg-surface p-4 text-left transition-colors duration-150",
        onSelect && "cursor-pointer hover:border-accent-brand/40",
        selected ? "border-accent-brand/60 bg-surface-2" : "border-border",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {recommended ? <RecommendedBadge /> : null}
          {selected ? (
            <span className="grid size-5 place-items-center rounded-full bg-accent-brand text-primary-foreground">
              <Check className="size-3" />
            </span>
          ) : null}
        </div>
      </div>
      {title ? (
        <p className="text-[14px] font-medium text-foreground">{title}</p>
      ) : null}
      {children}
      {meta ? (
        <p className="mt-3 font-mono text-[10px] text-text-subtle">{meta}</p>
      ) : null}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}

/** Contextual "what next" actions attached to any generated asset. */
export function ContextActions({
  actions,
  className,
}: {
  actions: { label: string; icon: LucideIcon; onClick?: () => void }[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-[12px] text-text-muted transition-colors duration-150 hover:border-accent-brand/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent-brand"
        >
          <a.icon className="size-3.5" />
          {a.label}
        </button>
      ))}
    </div>
  );
}

export type StateTone = "neutral" | "accent" | "success" | "warning" | "danger";

const toneClass: Record<StateTone, string> = {
  neutral: "border-border bg-surface-2 text-text-muted",
  accent: "border-accent-brand/30 bg-accent-tint text-accent-brand",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
};

export function StatusPill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: StateTone | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Generation cost estimate shown next to any generate control. Pass the
 * user's current balance to flag when it can't cover this action. */
export function CostHint({ credits, balance }: { credits: number; balance?: number | undefined }) {
  const insufficient = balance !== undefined && balance < credits;
  return (
    <span className={cn("font-mono text-[11px]", insufficient ? "text-danger" : "text-text-subtle")}>
      ≈ {credits} credits{insufficient ? " — not enough balance" : ""}
    </span>
  );
}

export function GeneratingState({ label = "Generating" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-2 px-3.5 py-3 text-[13px] text-text-muted">
      <Loader2 className="size-4 animate-spin text-accent-brand" />
      <span>{label}…</span>
    </div>
  );
}

/** Skeleton block for loading placeholders. */
export function WireLine({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-surface-3/70", className)} />
  );
}

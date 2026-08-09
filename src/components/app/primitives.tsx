import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function PhaseBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-warning" />
      Coming in a later phase
    </span>
  );
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6 border-b border-border-subtle pb-8 sm:flex sm:justify-between">
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? <p className="label-eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-2 text-[30px] font-medium leading-tight tracking-[-0.03em] text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-sm leading-relaxed text-text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionLabel({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 className="label-eyebrow">{children}</h2>
      {aside}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-8 py-16 text-center",
        className,
      )}
    >
      <span className="mb-5 grid size-11 place-items-center rounded-lg border border-border bg-surface-2 text-text-muted">
        <Icon className="size-[18px]" />
      </span>
      <p className="text-[15px] font-medium text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-subtle">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

/** Visual destination for a module that is not implemented in this phase. */
export function ModulePlaceholder({
  icon: Icon,
  title,
  eyebrow,
  description,
  capabilities,
  preview,
}: {
  icon: LucideIcon;
  title: string;
  eyebrow: string;
  description: string;
  capabilities: { title: string; body: string }[];
  preview?: ReactNode;
}) {
  return (
    <div className="space-y-12">
      <header className="relative overflow-hidden rounded-2xl border border-border bg-surface">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(70% 120% at 8% 0%, var(--accent-tint), transparent 60%)",
          }}
        />
        <div className="relative grid gap-8 p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-12">
          <div className="min-w-0 max-w-xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-accent-brand">
                <Icon className="size-[18px]" />
              </span>
              <span className="label-eyebrow">{eyebrow}</span>
            </div>
            <h1 className="mt-6 text-[36px] font-medium leading-[1.05] tracking-[-0.035em] text-foreground">
              {title}
            </h1>
            <p className="mt-4 text-[15px] leading-relaxed text-text-muted">
              {description}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <PhaseBadge />
              <Button variant="outline" size="sm" disabled>
                Notify me when it ships
              </Button>
            </div>
          </div>
          {preview ? (
            <div className="hidden w-[320px] shrink-0 lg:block">{preview}</div>
          ) : null}
        </div>
      </header>

      <section>
        <SectionLabel>Planned surface</SectionLabel>
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3">
          {capabilities.map((c) => (
            <div key={c.title} className="bg-surface p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-subtle">
                {c.title}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">
                {c.body}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-text-subtle">
          Nothing on this screen is connected to a backend. It documents the
          intended interface language only.
        </p>
      </section>
    </div>
  );
}

export function WireBlock({ className }: { className?: string }) {
  return <div className={cn("rounded-md bg-surface-3/60", className)} />;
}
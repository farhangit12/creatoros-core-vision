import { cn } from "@/lib/utils";

/**
 * CreatorOS monogram — a geometric aperture mark: an offset square frame
 * with a rotated inner blade, reading as both a lens and a cursor.
 */
export function Monogram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-7", className)}
    >
      <rect
        x="1.25"
        y="1.25"
        width="29.5"
        height="29.5"
        rx="8.5"
        className="fill-surface-2 stroke-border"
        strokeWidth="1"
      />
      <path
        d="M21.5 10.2A7.2 7.2 0 1 0 21.5 21.8"
        className="stroke-foreground"
        strokeWidth="2.1"
        strokeLinecap="square"
      />
      <path
        d="M16 16h8.4"
        className="stroke-accent-brand"
        strokeWidth="2.1"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-[15px] font-medium tracking-[-0.02em] text-foreground",
        className,
      )}
    >
      CreatorOS
      <span className="ml-1 font-mono text-[10px] tracking-[0.14em] text-accent-brand align-[2px]">
        AI
      </span>
    </span>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Monogram />
      <Wordmark />
    </span>
  );
}
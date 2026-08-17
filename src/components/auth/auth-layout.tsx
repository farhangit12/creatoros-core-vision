import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BrandLockup } from "@/components/brand/logo";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 45% at 50% -5%, oklch(0.634 0.181 256 / 0.18), transparent 65%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-brand/40 to-transparent"
      />

      <div className="relative w-full max-w-[400px]">
        <Link to="/" className="mb-10 flex justify-center">
          <BrandLockup />
        </Link>

        <div className="rounded-2xl border border-border bg-surface/80 p-7 shadow-floating backdrop-blur-sm sm:p-8">
          <h1 className="text-[22px] font-medium tracking-[-0.02em] text-foreground">
            {title}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-text-muted">
            {subtitle}
          </p>
          <div className="mt-7">{children}</div>
        </div>

        {footer ? (
          <p className="mt-6 text-center text-[13px] text-text-muted">
            {footer}
          </p>
        ) : null}
      </div>
    </div>
  );
}
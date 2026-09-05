import { Link } from "@tanstack/react-router";
import { BrandLockup } from "@/components/brand/logo";

export function PublicFooter() {
  return (
    <footer className="border-t border-border-subtle py-10">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-6 px-5 sm:px-8">
        <div className="flex flex-col gap-2">
          <BrandLockup />
          <span className="text-[13px] text-text-subtle">© 2026 CreatorOS AI</span>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-text-muted">
          <a href="/#about" className="transition-colors hover:text-foreground">
            About
          </a>
          <Link to="/login" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link to="/signup" className="transition-colors hover:text-foreground">
            Get Started
          </Link>
          <span className="hidden h-3.5 w-px bg-border-subtle sm:inline-block" aria-hidden="true" />
          <Link to="/privacy" className="transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <Link to="/terms" className="transition-colors hover:text-foreground">
            Terms of Service
          </Link>
          <Link to="/accessibility" className="transition-colors hover:text-foreground">
            Accessibility
          </Link>
          <Link to="/help" className="transition-colors hover:text-foreground">
            Help &amp; FAQ
          </Link>
        </nav>
      </div>
    </footer>
  );
}

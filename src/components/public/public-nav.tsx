import { Link } from "@tanstack/react-router";
import { BrandLockup } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export function PublicNav() {
  return (
    <header className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between px-5 sm:px-8">
      <Link to="/" className="flex items-center">
        <BrandLockup />
      </Link>
      <nav className="flex items-center gap-1 sm:gap-2">
        <a
          href="/#about"
          className="hidden h-9 items-center rounded-md px-3 text-[13px] text-text-muted transition-colors hover:text-foreground sm:flex"
        >
          About
        </a>
        <Button asChild variant="ghost" size="sm">
          <Link to="/login">Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/signup">Get Started</Link>
        </Button>
      </nav>
    </header>
  );
}

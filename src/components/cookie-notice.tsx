import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "creatoros-cookie-notice-dismissed";

/**
 * A minimal, honest cookie notice -- not a consent-management platform,
 * because there's nothing to ask consent for: this app only ever sets a
 * necessary session cookie plus a couple of localStorage preferences (theme,
 * this dismissal), never third-party advertising/tracking cookies (see
 * Privacy Policy). Dismissal is a per-browser localStorage flag, same
 * pattern as the existing theme preference in src/lib/theme.ts.
 */
export function CookieNotice() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // localStorage unavailable (private browsing, blocked site data) --
      // fail open by leaving the notice dismissed rather than erroring.
    }
  }, []);

  if (dismissed) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
        <p className="text-[13px] text-text-muted">
          We use only a necessary session cookie to keep you signed in, plus local
          storage for preferences like theme. No advertising or tracking cookies.{" "}
          <Link to="/privacy" className="text-accent-brand hover:underline">
            Privacy Policy
          </Link>
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            try {
              localStorage.setItem(STORAGE_KEY, "1");
            } catch {
              // Best-effort -- dismissing still hides the banner for this page view.
            }
            setDismissed(true);
          }}
        >
          Got it
        </Button>
      </div>
    </div>
  );
}

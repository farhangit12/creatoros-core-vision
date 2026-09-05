import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { applyTheme, THEME_STORAGE_KEY } from "@/lib/theme";
import { getCookieConsent, setCookieConsent, type CookieConsentChoice } from "@/lib/cookie-consent";

/**
 * A real accept/reject cookie control, not just a dismissible FYI banner.
 * "Necessary" (the session auth cookie) can't be turned off -- it's required
 * for the account features you're explicitly using, and is exempt from
 * consent requirements. "Preferences" (the local theme cache, see theme.ts)
 * is the only category that's actually optional, and rejecting it takes
 * real effect immediately (clears the cached value). No advertising or
 * tracking cookies exist to ask consent for.
 */
export function CookieNotice() {
  const [decided, setDecided] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [preferencesChoice, setPreferencesChoice] = useState(false);

  useEffect(() => {
    setDecided(getCookieConsent() !== null);
  }, []);

  if (decided) return null;

  function decide(choice: CookieConsentChoice) {
    setCookieConsent(choice);
    if (choice === "rejected") {
      try {
        window.localStorage.removeItem(THEME_STORAGE_KEY);
      } catch {
        // Best-effort.
      }
    } else {
      // Re-cache whatever theme is currently applied now that it's allowed to persist.
      const isLight = document.documentElement.classList.contains("light");
      applyTheme(isLight ? "light" : "dark");
    }
    setDecided(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto w-full max-w-[1180px] px-5 py-4 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-[13px] text-text-muted">
            We use a necessary session cookie to keep you signed in. We'd
            also like to cache your theme preference locally so it doesn't
            flash on reload — you can accept or reject that.{" "}
            <Link to="/privacy" className="text-accent-brand hover:underline">
              Privacy Policy
            </Link>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)}>
              Customize
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => decide("rejected")}>
              Reject non-essential
            </Button>
            <Button type="button" size="sm" onClick={() => decide("accepted")}>
              Accept all
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t border-border-subtle pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-medium text-foreground">Necessary</p>
                <p className="text-[12px] text-text-muted">
                  Session cookie that keeps you signed in. Always on — required for the account features you're using.
                </p>
              </div>
              <span className="mt-0.5 shrink-0 rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-medium text-text-muted">
                Always on
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-medium text-foreground">Preferences</p>
                <p className="text-[12px] text-text-muted">
                  Local storage caching your theme choice so it applies instantly on your next visit. No tracking or advertising cookies exist.
                </p>
              </div>
              <label className="mt-0.5 flex shrink-0 items-center gap-2 text-[12px] text-text-muted">
                <input
                  type="checkbox"
                  checked={preferencesChoice}
                  onChange={(e) => setPreferencesChoice(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                {preferencesChoice ? "On" : "Off"}
              </label>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={() => decide(preferencesChoice ? "accepted" : "rejected")}
              >
                Save choices
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

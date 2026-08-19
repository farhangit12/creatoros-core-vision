import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.11C3.24 21.3 7.29 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.27V6.62H1.26A11.98 11.98 0 0 0 0 12c0 1.93.46 3.76 1.26 5.38l4.01-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.29 0 3.24 2.7 1.26 6.62l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77z"
      />
    </svg>
  );
}

export function GoogleAuthButton({ label = "Continue with Google" }: { label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);
    const { error: authError } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard",
    });
    if (authError) {
      setLoading(false);
      setError(authError.message ?? "Couldn't continue with Google. Try again.");
    }
    // On success the client redirects the browser to Google itself, so
    // loading intentionally stays true through that redirect.
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full gap-2"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <GoogleGlyph />}
        {label}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

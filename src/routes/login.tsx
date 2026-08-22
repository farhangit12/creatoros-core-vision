import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { z } from "zod";
import { AuthLayout } from "@/components/auth/auth-layout";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { authClient } from "@/lib/auth-client";
import { canonicalLinks } from "@/lib/canonical";

// better-auth's own OAuth error codes (see node_modules/better-auth/dist/state.mjs's
// StateError codes and oauth2/state.mjs's parseState) -- friendlier text for the
// two shapes actually reproduced live (see auth.ts's onAPIError.errorURL comment
// and server.ts's OAuth-callback-retry comment for the full incident), honest
// fallback text for anything else so an unrecognized code never shows a raw
// machine-readable string to a real user.
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: "That sign-in link expired or was already used. Please try again.",
  internal_server_error: "Something went wrong signing you in. Please try again.",
  account_not_linked: "That Google account isn't linked yet. Try signing in with email/password first.",
};

export const Route = createFileRoute("/login")({
  validateSearch: z.object({
    error: z.string().optional(),
    error_description: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — CreatorOS AI" },
      {
        name: "description",
        content:
          "Sign in to CreatorOS AI, the creative operating system for creators and freelancers.",
      },
      { property: "og:title", content: "Sign in — CreatorOS AI" },
      {
        property: "og:description",
        content: "Sign in to your CreatorOS AI workspace.",
      },
    ],
    links: canonicalLinks("/login"),
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const emailInvalid = email.length > 0 && !email.includes("@");

  // Surfaces a real Google-sign-in failure (redirected here via auth.ts's
  // onAPIError.errorURL) instead of it silently landing on the homepage with
  // no explanation -- see auth.ts and server.ts for the full incident this
  // closes. Runs once on mount; clears the URL param afterward so a page
  // refresh doesn't keep re-showing a stale error.
  useEffect(() => {
    if (!search.error) return;
    setError(search.error_description ?? OAUTH_ERROR_MESSAGES[search.error] ?? "Sign-in failed. Please try again.");
    navigate({ to: "/login", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.error, search.error_description]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (emailInvalid || !email || !password) {
      setError("Enter a valid email and password to continue.");
      return;
    }
    setLoading(true);
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
      rememberMe,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message ?? "Couldn't sign in. Check your credentials and try again.");
      return;
    }
    navigate({ to: "/dashboard" });
  };

  return (
    <AuthLayout
      title="Sign in to CreatorOS"
      subtitle="Pick up exactly where your work left off."
      footer={
        <>
          New to CreatorOS?{" "}
          <Link to="/signup" className="text-accent-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error ? (
          <div
            role="alert"
            className="flex gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] leading-relaxed text-foreground"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@studio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={emailInvalid}
            className="h-10"
          />
          {emailInvalid ? (
            <p className="text-xs text-danger">Enter a valid email address.</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-text-muted transition-colors hover:text-accent-brand"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-1 top-1 grid size-8 place-items-center rounded-md text-text-subtle transition-colors hover:text-foreground"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(v) => setRememberMe(v === true)}
          />
          <Label htmlFor="remember" className="text-[13px] text-text-muted">
            Keep me signed in
          </Label>
        </div>

        <Button type="submit" className="h-10 w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3" aria-hidden>
        <div className="h-px flex-1 bg-border" />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleAuthButton />
    </AuthLayout>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/login")({
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
  }),
  component: LoginPage,
});

function LoginPage() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const emailInvalid = email.length > 0 && !email.includes("@");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (emailInvalid || !email || !password) {
      setError("Enter a valid email and password to continue.");
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setError(
        "Authentication is not connected in this prototype. Use the sidebar to explore the app.",
      );
    }, 900);
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
          <Checkbox id="remember" defaultChecked />
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

        <Button
          asChild
          variant="outline"
          className="h-10 w-full border-border bg-transparent"
        >
          <Link to="/dashboard">Continue to prototype workspace</Link>
        </Button>
      </form>
    </AuthLayout>
  );
}
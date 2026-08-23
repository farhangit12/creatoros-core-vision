import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, Check, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { canonicalLinks, ogUrlMeta } from "@/lib/canonical";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — CreatorOS AI" },
      {
        name: "description",
        content:
          "Create a CreatorOS AI account and set up your creative operating system.",
      },
      { property: "og:title", content: "Create your account — CreatorOS AI" },
      {
        property: "og:description",
        content: "Set up your CreatorOS AI workspace in under a minute.",
      },
      ...ogUrlMeta("/signup"),
    ],
    links: canonicalLinks("/signup"),
  }),
  component: SignupPage,
});

function strengthOf(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const labels = ["Too weak", "Weak", "Fair", "Strong", "Excellent"];

function SignupPage() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set once signup succeeds but requires email verification first (no
  // session is created yet in that case -- see auth.ts's
  // emailAndPassword.requireEmailVerification) -- swaps the form for a
  // "check your email" message instead of navigating to a dashboard the
  // user isn't actually signed into yet.
  const [verificationSentTo, setVerificationSentTo] = useState<string | null>(null);
  const score = strengthOf(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !email || !password || mismatch || !agreed) {
      setError("Fill in every field and confirm a matching password to continue.");
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message ?? "Couldn't create your account. Try again.");
      return;
    }
    if (!data?.token) {
      setVerificationSentTo(email);
      return;
    }
    navigate({ to: "/dashboard" });
  };

  if (verificationSentTo) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="One more step before your workspace is ready."
        footer={
          <>
            Already verified?{" "}
            <Link to="/login" className="text-accent-brand hover:underline">
              Sign in
            </Link>
          </>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="grid size-12 place-items-center rounded-full bg-accent-brand/10 text-accent-brand">
            <Mail className="size-6" />
          </div>
          <p className="text-sm leading-relaxed text-text-muted">
            We sent a verification link to <span className="font-medium text-foreground">{verificationSentTo}</span>.
            Click it to activate your account, then sign in.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="One account for every project, script and asset you make."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-accent-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-5" noValidate onSubmit={submit}>
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
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            className="h-10"
            placeholder="Jenny Rosen"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            className="h-10"
            placeholder="you@studio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              className="h-10 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-1 top-1 grid size-8 place-items-center rounded-md text-text-subtle hover:text-foreground"
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <div className="flex flex-1 gap-1" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-200",
                    i < score
                      ? score <= 1
                        ? "bg-danger"
                        : score === 2
                          ? "bg-warning"
                          : "bg-success"
                      : "bg-surface-3",
                  )}
                />
              ))}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
              {password ? labels[score] : "—"}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            className="h-10"
            value={confirm}
            aria-invalid={mismatch}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {mismatch ? (
            <p className="text-xs text-danger">Passwords don't match.</p>
          ) : confirm && !mismatch ? (
            <p className="flex items-center gap-1.5 text-xs text-success">
              <Check className="size-3" /> Passwords match
            </p>
          ) : null}
        </div>

        <div className="flex items-start gap-2.5">
          <Checkbox
            id="terms"
            aria-label="I agree to the Terms of Service and Privacy Policy."
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
            className="mt-0.5"
          />
          <p className="text-[13px] leading-relaxed text-text-muted">
            I agree to the{" "}
            <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-accent-brand hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent-brand hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <Button
          type="submit"
          className="h-10 w-full"
          disabled={!agreed || loading}
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3" aria-hidden>
        <div className="h-px flex-1 bg-border" />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleAuthButton label="Sign up with Google" />
    </AuthLayout>
  );
}
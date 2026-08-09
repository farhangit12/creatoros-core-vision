import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

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
    ],
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
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const score = strengthOf(password);
  const mismatch = confirm.length > 0 && confirm !== password;

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
      <form
        className="space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          window.setTimeout(() => setLoading(false), 900);
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" className="h-10" placeholder="Alex Rivera" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            className="h-10"
            placeholder="you@studio.com"
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
            checked={agreed}
            onCheckedChange={(v) => setAgreed(v === true)}
            className="mt-0.5"
          />
          <Label
            htmlFor="terms"
            className="text-[13px] leading-relaxed text-text-muted"
          >
            I agree to the Terms of Service and Privacy Policy.
          </Label>
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
    </AuthLayout>
  );
}
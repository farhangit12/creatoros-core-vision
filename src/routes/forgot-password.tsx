import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, Loader2, MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — CreatorOS AI" },
      {
        name: "description",
        content: "Request a password reset link for your CreatorOS AI account.",
      },
      { property: "og:title", content: "Reset your password — CreatorOS AI" },
      {
        property: "og:description",
        content: "Request a password reset link for CreatorOS AI.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const emailInvalid = email.length > 0 && !email.includes("@");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || emailInvalid) {
      setError("Enter a valid email address to continue.");
      return;
    }
    setState("loading");
    const { error: requestError } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    if (requestError) {
      setState("idle");
      setError(requestError.message ?? "Couldn't send the reset link. Try again.");
      return;
    }
    // Same success state regardless of whether the account exists — never
    // reveal account existence through this flow.
    setState("sent");
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll send a secure link to your email address."
      footer={
        <Link to="/login" className="text-accent-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      {state === "sent" ? (
        <div className="rounded-xl border border-success/25 bg-success/10 p-5">
          <MailCheck className="size-5 text-success" />
          <p className="mt-3 text-[15px] font-medium text-foreground">
            Check your inbox
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">
            If an account exists for {email}, a reset link is on its way. The
            link expires in 1 hour.
          </p>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={submit} noValidate>
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
              className="h-10"
              placeholder="you@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={emailInvalid}
            />
            {emailInvalid ? (
              <p className="text-xs text-danger">Enter a valid email address.</p>
            ) : null}
          </div>
          <Button
            type="submit"
            className="h-10 w-full"
            disabled={state === "loading"}
          >
            {state === "loading" ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Sending link…
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

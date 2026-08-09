import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
            If an account exists, a reset link is on its way. The link expires in
            30 minutes.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-5">
            <Link to="/reset-password">Open reset screen</Link>
          </Button>
        </div>
      ) : (
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            setState("loading");
            window.setTimeout(() => setState("sent"), 900);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              className="h-10"
              placeholder="you@studio.com"
              required
            />
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
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { AlertCircle, AlertTriangle, Check, CheckCircle2, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

const searchSchema = z.object({
  token: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Choose a new password — CreatorOS AI" },
      {
        name: "description",
        content: "Set a new password for your CreatorOS AI account.",
      },
      { property: "og:title", content: "Choose a new password — CreatorOS AI" },
      {
        property: "og:description",
        content: "Set a new password for CreatorOS AI.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token, error: linkError } = Route.useSearch();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mismatch = confirm.length > 0 && confirm !== newPassword;

  if (!token || linkError) {
    return (
      <AuthLayout
        title="Reset link invalid"
        subtitle="This password reset link is invalid or has expired."
        footer={
          <Link to="/login" className="text-accent-brand hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="rounded-xl border border-warning/25 bg-warning/10 p-5">
          <AlertTriangle className="size-5 text-warning" />
          <p className="mt-3 text-[15px] font-medium text-foreground">
            Link invalid or expired
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">
            Reset links expire after 1 hour and can only be used once. Request
            a new one to continue.
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (mismatch) {
      setError("Passwords don't match.");
      return;
    }
    setState("loading");
    const { error: resetError } = await authClient.resetPassword({
      newPassword,
      token,
    });
    if (resetError) {
      setState("idle");
      setError(
        resetError.message ?? "Couldn't update your password. Request a new link and try again.",
      );
      return;
    }
    setState("done");
  };

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Make it long, unusual and unique to CreatorOS."
      footer={
        <Link to="/login" className="text-accent-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      {state === "done" ? (
        <div className="rounded-xl border border-success/25 bg-success/10 p-5">
          <CheckCircle2 className="size-5 text-success" />
          <p className="mt-3 text-[15px] font-medium text-foreground">
            Password updated
          </p>
          <p className="mt-1.5 text-[13px] text-text-muted">
            You can now sign in with your new password.
          </p>
          <Button asChild size="sm" className="mt-5">
            <Link to="/login">Continue to sign in</Link>
          </Button>
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
          <div
            role="status"
            className="flex gap-2.5 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2.5 text-[13px] leading-relaxed text-text-muted"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <span>This reset link expires in 1 hour and can only be used once.</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new">New password</Label>
            <Input
              id="new"
              type="password"
              className="h-10"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
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
          <Button type="submit" className="h-10 w-full" disabled={state === "loading"}>
            {state === "loading" ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Updating…
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

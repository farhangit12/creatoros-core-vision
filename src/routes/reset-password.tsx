import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
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
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

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
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            setState("loading");
            window.setTimeout(() => setState("done"), 900);
          }}
        >
          <div
            role="status"
            className="flex gap-2.5 rounded-lg border border-warning/25 bg-warning/10 px-3 py-2.5 text-[13px] leading-relaxed text-text-muted"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <span>This reset link expires in 28 minutes.</span>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new">New password</Label>
            <Input id="new" type="password" className="h-10" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" type="password" className="h-10" required />
          </div>
          <Button
            type="submit"
            className="h-10 w-full"
            disabled={state === "loading"}
          >
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
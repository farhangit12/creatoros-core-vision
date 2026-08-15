import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, KeyRound, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "Profile — CreatorOS AI" },
      {
        name: "description",
        content: "Your CreatorOS AI identity, account details and security.",
      },
      { property: "og:title", content: "Profile — CreatorOS AI" },
      {
        property: "og:description",
        content: "Manage your CreatorOS AI identity and account.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState("alex@creatoros.ai");
  const emailInvalid = !email.includes("@");

  const save = () => {
    if (emailInvalid) return;
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      setEditing(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    }, 800);
  };

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="How you appear across CreatorOS. Changes are local to this prototype."
        actions={
          editing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={saving || emailInvalid}>
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              Edit profile
            </Button>
          )
        }
      />

      {saved ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-[13px] text-foreground"
        >
          <Check className="size-4 text-success" /> Profile updated
        </p>
      ) : null}

      <section className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-7 sm:flex-row sm:items-center">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-surface-3 font-mono text-[18px] text-foreground">
          AR
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[20px] font-medium tracking-[-0.02em] text-foreground">
            Alex Rivera
          </p>
          <p className="mt-1 text-[13px] text-text-muted">
            alex@creatoros.ai · Pro plan · Joined March 2026
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={!editing}>
          Change avatar
        </Button>
      </section>

      <section>
        <SectionLabel>Profile information</SectionLabel>
        <div className="grid gap-6 rounded-xl border border-border bg-surface p-7 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullname">Full name</Label>
            <Input
              id="fullname"
              className="h-10"
              defaultValue="Alex Rivera"
              disabled={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-email">Email</Label>
            <Input
              id="p-email"
              className="h-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!editing}
              aria-invalid={emailInvalid}
            />
            {emailInvalid ? (
              <p className="text-xs text-danger">Enter a valid email address.</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              className="h-10"
              defaultValue="Independent video creator"
              disabled={!editing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site">Website</Label>
            <Input
              id="site"
              className="h-10"
              defaultValue="alexrivera.studio"
              disabled={!editing}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={3}
              disabled={!editing}
              defaultValue="Long-form documentary essays and weekly short-form. Building a studio of one."
            />
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Security</SectionLabel>
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border bg-surface">
          <li className="flex items-center justify-between gap-4 px-5 py-4">
            <span className="flex min-w-0 items-center gap-3">
              <KeyRound className="size-4 shrink-0 text-text-subtle" />
              <span className="min-w-0">
                <span className="block text-[14px] text-foreground">Password</span>
                <span className="text-[13px] text-text-subtle">
                  Last changed 4 months ago
                </span>
              </span>
            </span>
            <Button asChild variant="outline" size="sm">
              <Link to="/reset-password">Change</Link>
            </Button>
          </li>
          <li className="flex items-center justify-between gap-4 px-5 py-4">
            <span className="flex min-w-0 items-center gap-3">
              <ShieldCheck className="size-4 shrink-0 text-text-subtle" />
              <span className="min-w-0">
                <span className="block text-[14px] text-foreground">
                  Two-factor authentication
                </span>
                <span className="text-[13px] text-text-subtle">
                  Not configured in this phase
                </span>
              </span>
            </span>
            <Button variant="outline" size="sm" disabled>
              Enable
            </Button>
          </li>
          <li className="flex items-center justify-between gap-4 px-5 py-4">
            <span className="flex min-w-0 items-center gap-3">
              <LogOut className="size-4 shrink-0 text-danger" />
              <span className="min-w-0">
                <span className="block text-[14px] text-foreground">Sign out</span>
                <span className="text-[13px] text-text-subtle">
                  End this session on all devices
                </span>
              </span>
            </span>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-danger/30 text-danger hover:bg-danger/10 hover:text-danger"
            >
              <Link to="/login">Sign out</Link>
            </Button>
          </li>
        </ul>
      </section>
    </div>
  );
}
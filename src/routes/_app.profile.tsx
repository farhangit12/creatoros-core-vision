import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertCircle, Check, KeyRound, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/app/primitives";
import { WireLine } from "@/components/app/studio-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";
import { getAvatarUploadSignature, getUserProfile, updateUserAvatar, updateUserProfile } from "@/lib/server/settings";
import { uploadFileToCloudinary } from "@/lib/files-upload-client";
import { toAvatarUrl } from "@/lib/files";

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

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

const PROFILE_QUERY_KEY = ["user-profile"] as const;

function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== newPassword;

  const reset = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      setError("Enter your current password and a new password of at least 8 characters.");
      return;
    }
    if (mismatch) {
      setError("New passwords don't match.");
      return;
    }
    setSubmitting(true);
    const { error: changeError } = await authClient.changePassword({
      currentPassword,
      newPassword,
    });
    setSubmitting(false);
    if (changeError) {
      setError(changeError.message ?? "Couldn't change your password. Try again.");
      return;
    }
    toast.success("Password changed");
    reset();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Change
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new one.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit} noValidate>
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
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              className="h-10"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className="h-10"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirm new password</Label>
            <Input
              id="confirm-new-password"
              type="password"
              autoComplete="new-password"
              className="h-10"
              value={confirm}
              aria-invalid={mismatch}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Changing…
                </>
              ) : (
                "Change password"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const getUserProfileFn = useServerFn(getUserProfile);
  const updateUserProfileFn = useServerFn(updateUserProfile);
  const getAvatarUploadSignatureFn = useServerFn(getAvatarUploadSignature);
  const updateUserAvatarFn = useServerFn(updateUserAvatar);
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFile = async (file: File) => {
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error("Avatar must be a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Avatar image must be 5MB or smaller.");
      return;
    }
    setUploadingAvatar(true);
    try {
      const signature = await getAvatarUploadSignatureFn();
      const result = await uploadFileToCloudinary(file, signature, () => {});
      await updateUserAvatarFn({ data: { url: result.url, mimeType: file.type, size: file.size } });
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      await authClient.getSession();
      toast.success("Avatar updated");
    } catch (error) {
      toast.error("Couldn't update your avatar.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authClient.revokeOtherSessions();
    } catch {
      // Best-effort: still sign this session out even if revoking others fails.
    }
    await authClient.signOut();
    navigate({ to: "/login" });
  };

  const { data: profile, isLoading } = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => getUserProfileFn(),
  });

  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");
  const emailInvalid = !email.includes("@");

  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
      setRole(profile.role ?? "");
      setWebsite(profile.website ?? "");
      setBio(profile.bio ?? "");
    }
  }, [profile?.id]);

  const [emailChangePending, setEmailChangePending] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateUserProfileFn>[0]) => updateUserProfileFn(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
    onError: () => {
      toast.error("Couldn't save your profile. Try again.");
    },
  });

  const save = async () => {
    if (emailInvalid || !profile) return;
    const trimmedEmail = email.trim();
    const emailChanged = trimmedEmail.toLowerCase() !== profile.email.toLowerCase();

    try {
      await updateMutation.mutateAsync({
        data: {
          name: name.trim() || undefined,
          role: role.trim(),
          website: website.trim(),
          bio: bio.trim(),
        },
      });
    } catch {
      return; // updateMutation.onError already showed a toast
    }

    if (emailChanged) {
      setEmailChangePending(true);
      const { error } = await authClient.changeEmail({
        newEmail: trimmedEmail,
        callbackURL: "/profile",
      });
      setEmailChangePending(false);
      // The real email hasn't changed yet either way — it only updates once
      // the confirmation link (sent to the new address) is clicked.
      setEmail(profile.email);
      if (error) {
        toast.error(error.message ?? "Couldn't start the email change. Try again.");
      } else {
        toast.success("Confirmation email sent", {
          description: `Check ${trimmedEmail} and click the link to confirm your new email.`,
        });
      }
    }

    setEditing(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const saving = updateMutation.isPending || emailChangePending;
  const displayName = profile?.name ?? "";
  const joined = profile ? format(profile.createdAt, "MMMM yyyy") : "";

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="How you appear across CreatorOS."
        actions={
          editing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  if (profile) {
                    setName(profile.name);
                    setEmail(profile.email);
                    setRole(profile.role ?? "");
                    setWebsite(profile.website ?? "");
                    setBio(profile.bio ?? "");
                  }
                }}
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
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={isLoading}>
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

      {isLoading ? (
        <section className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-7 sm:flex-row sm:items-center">
          <WireLine className="size-16 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <WireLine className="h-5 w-48" />
            <WireLine className="h-4 w-64" />
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-7 sm:flex-row sm:items-center">
          {profile?.image ? (
            <img
              src={toAvatarUrl(profile.image, 128)}
              alt=""
              className="size-16 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-surface-3 font-mono text-[18px] text-foreground">
              {initialsFor(displayName)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[20px] font-medium tracking-[-0.02em] text-foreground">
              {displayName}
            </p>
            <p className="mt-1 text-[13px] text-text-muted">
              {profile?.email} · Joined {joined}
            </p>
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept={ALLOWED_AVATAR_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleAvatarFile(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!editing || uploadingAvatar}
            onClick={() => avatarInputRef.current?.click()}
          >
            {uploadingAvatar ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Uploading…
              </>
            ) : (
              "Change avatar"
            )}
          </Button>
        </section>
      )}

      <section>
        <SectionLabel>Profile information</SectionLabel>
        {isLoading ? (
          <div className="grid gap-6 rounded-xl border border-border bg-surface p-7 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-2">
                <WireLine className="h-3 w-20" />
                <WireLine className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 rounded-xl border border-border bg-surface p-7 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullname">Full name</Label>
              <Input
                id="fullname"
                className="h-10"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
              ) : editing && profile && email.trim().toLowerCase() !== profile.email.toLowerCase() ? (
                <p className="text-xs text-text-subtle">
                  You'll need to confirm this from a link sent to the new address before it takes effect.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                className="h-10"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site">Website</Label>
              <Input
                id="site"
                className="h-10"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={!editing}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={3}
                disabled={!editing}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>
        )}
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
                  Change the password for this account
                </span>
              </span>
            </span>
            <ChangePasswordDialog />
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
              variant="outline"
              size="sm"
              className="border-danger/30 text-danger hover:bg-danger/10 hover:text-danger"
              onClick={handleSignOut}
              disabled={signingOut}
            >
              {signingOut ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Signing out…
                </>
              ) : (
                "Sign out"
              )}
            </Button>
          </li>
        </ul>
      </section>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { AlertCircle, Check, Laptop, Loader2, Moon, ShieldCheck, Sun } from "lucide-react";
import QRCode from "qrcode";
import { PageHeader } from "@/components/app/primitives";
import { WireLine } from "@/components/app/studio-kit";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { tones } from "@/lib/creator-data";
import { getUserProfile, getUserSettings, updateUserProfile, updateUserSettings } from "@/lib/server/settings";
import { authClient, useSession } from "@/lib/auth-client";
import { applyTheme, type ThemeSetting } from "@/lib/theme";

const sections = [
  "Account",
  "Appearance",
  "Notifications",
  "Security",
  "Preferences",
] as const;

type Section = (typeof sections)[number];

const searchSchema = z.object({
  section: z.enum(sections).optional(),
});

export const Route = createFileRoute("/_app/settings")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Settings — CreatorOS AI" },
      {
        name: "description",
        content:
          "Workspace settings for account, appearance, notifications, security and preferences.",
      },
      { property: "og:title", content: "Settings — CreatorOS AI" },
      {
        property: "og:description",
        content: "Configure your CreatorOS AI workspace.",
      },
    ],
  }),
  component: SettingsPage,
});

const PROFILE_QUERY_KEY = ["user-profile"] as const;
const SETTINGS_QUERY_KEY = ["user-settings"] as const;

function Row({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-6 border-b border-border-subtle px-5 py-5 last:border-0">
      <div className="min-w-0">
        <p className="text-[14px] text-foreground">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-text-subtle">
          {description}
        </p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

const SESSIONS_QUERY_KEY = ["auth-sessions"] as const;

function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  const os = /Windows/i.test(ua)
    ? "Windows"
    : /Macintosh|Mac OS X/i.test(ua)
      ? "macOS"
      : /Android/i.test(ua)
        ? "Android"
        : /iPhone|iPad|iPod/i.test(ua)
          ? "iOS"
          : /Linux/i.test(ua)
            ? "Linux"
            : "an unknown OS";
  const browser = /Edg\//i.test(ua)
    ? "Edge"
    : /Chrome\//i.test(ua)
      ? "Chrome"
      : /Firefox\//i.test(ua)
        ? "Firefox"
        : /Safari\//i.test(ua)
          ? "Safari"
          : "an unknown browser";
  return `${browser} on ${os}`;
}

type TwoFactorStep = "password" | "setup" | "done";

/**
 * TOTP-based 2FA setup/disable flow. Two real API calls make this work,
 * confirmed against better-auth's actual plugin source before writing this
 * (see auth.ts's twoFactor() comment): `enable({password})` returns a TOTP
 * URI + one-time backup codes in a single response -- the account isn't
 * actually flagged 2FA-on yet at that point, only after a real code is
 * confirmed via `verifyTotp`, so the dialog holds the returned data in
 * state across that gap rather than re-fetching it.
 */
function TwoFactorSection() {
  const { data: session, refetch } = useSession();
  const twoFactorEnabled = Boolean(session?.user && "twoFactorEnabled" in session.user && session.user.twoFactorEnabled);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<TwoFactorStep>("password");
  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setStep("password");
    setPassword("");
    setTotpURI(null);
    setQrDataUrl(null);
    setBackupCodes([]);
    setCode("");
    setError(null);
  };

  const startEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError("Enter your current password to continue.");
      return;
    }
    setSubmitting(true);
    const { data, error: enableError } = await authClient.twoFactor.enable({ password });
    setSubmitting(false);
    if (enableError || !data) {
      setError(enableError?.message ?? "Couldn't start setup. Check your password and try again.");
      return;
    }
    setTotpURI(data.totpURI);
    setBackupCodes(data.backupCodes);
    setQrDataUrl(await QRCode.toDataURL(data.totpURI));
    setStep("setup");
  };

  const confirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setSubmitting(true);
    const { error: verifyError } = await authClient.twoFactor.verifyTotp({ code: code.trim() });
    setSubmitting(false);
    if (verifyError) {
      setError(verifyError.message ?? "That code didn't work. Try again.");
      return;
    }
    setStep("done");
    refetch();
  };

  const disable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError("Enter your current password to confirm.");
      return;
    }
    setSubmitting(true);
    const { error: disableError } = await authClient.twoFactor.disable({ password });
    setSubmitting(false);
    if (disableError) {
      setError(disableError.message ?? "Couldn't disable 2FA. Try again.");
      return;
    }
    setOpen(false);
    reset();
    refetch();
  };

  const manualSecret = (() => {
    if (!totpURI) return null;
    try {
      return new URL(totpURI).searchParams.get("secret");
    } catch {
      return null;
    }
  })();

  return (
    <Row
      title="Two-factor authentication"
      description={
        twoFactorEnabled
          ? "Enabled. Your account requires a code from your authenticator app to sign in."
          : "Add a code from an authenticator app (Google Authenticator, 1Password, etc.) as a second sign-in step."
      }
      control={
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) reset();
          }}
        >
          <DialogTrigger asChild>
            {twoFactorEnabled ? (
              <Button size="sm" variant="outline" className="border-danger/30 text-danger hover:bg-danger/10 hover:text-danger">
                Disable
              </Button>
            ) : (
              <Button size="sm" variant="outline">
                Enable
              </Button>
            )}
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            {twoFactorEnabled ? (
              <>
                <DialogHeader>
                  <DialogTitle>Disable two-factor authentication</DialogTitle>
                  <DialogDescription>
                    Your account will only need your password to sign in afterward.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={disable} noValidate>
                  {error ? (
                    <div role="alert" className="flex gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] leading-relaxed text-foreground">
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
                      <span>{error}</span>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="twofactor-disable-password">Current password</Label>
                    <Input
                      id="twofactor-disable-password"
                      type="password"
                      autoComplete="current-password"
                      className="h-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="destructive" disabled={submitting || !password}>
                      {submitting ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" /> Disabling…
                        </>
                      ) : (
                        "Disable 2FA"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </>
            ) : step === "password" ? (
              <>
                <DialogHeader>
                  <DialogTitle>Enable two-factor authentication</DialogTitle>
                  <DialogDescription>Confirm your password to start setup.</DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={startEnable} noValidate>
                  {error ? (
                    <div role="alert" className="flex gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] leading-relaxed text-foreground">
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
                      <span>{error}</span>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="twofactor-enable-password">Current password</Label>
                    <Input
                      id="twofactor-enable-password"
                      type="password"
                      autoComplete="current-password"
                      className="h-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting || !password}>
                      {submitting ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" /> Starting…
                        </>
                      ) : (
                        "Continue"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </>
            ) : step === "setup" ? (
              <>
                <DialogHeader>
                  <DialogTitle>Scan this code</DialogTitle>
                  <DialogDescription>
                    Scan with your authenticator app, then enter the 6-digit code it shows. Save your backup codes below
                    somewhere safe — each one works once if you ever lose access to your authenticator.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={confirmEnable} noValidate>
                  {error ? (
                    <div role="alert" className="flex gap-2.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] leading-relaxed text-foreground">
                      <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
                      <span>{error}</span>
                    </div>
                  ) : null}
                  {qrDataUrl ? (
                    <div className="flex justify-center">
                      <img src={qrDataUrl} alt="Scan this QR code with your authenticator app" className="size-40 rounded-lg border border-border-subtle" />
                    </div>
                  ) : null}
                  {manualSecret ? (
                    <p className="break-all text-center font-mono text-[11px] text-text-subtle">{manualSecret}</p>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="twofactor-code">6-digit code</Label>
                    <Input
                      id="twofactor-code"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      className="h-10"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-2 p-3">
                    <p className="mb-2 text-[12px] font-medium text-text-subtle">Backup codes</p>
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[12px] text-foreground">
                      {backupCodes.map((c) => (
                        <span key={c}>{c}</span>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={submitting || !code.trim()}>
                      {submitting ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" /> Verifying…
                        </>
                      ) : (
                        "Verify & enable"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <ShieldCheck className="size-5 text-success" /> Two-factor authentication enabled
                  </DialogTitle>
                  <DialogDescription>
                    Your account now requires a code from your authenticator app to sign in.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      reset();
                    }}
                  >
                    Done
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      }
    />
  );
}

function ActiveSessionsSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: currentSession } = useSession();
  const currentSessionId = currentSession?.session?.id;

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await authClient.listSessions();
      if (error) throw new Error(error.message ?? "Couldn't load sessions.");
      return data ?? [];
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.revokeOtherSessions();
      if (error) throw new Error(error.message ?? "Couldn't revoke other sessions.");
    },
    onSuccess: async () => {
      toast.success("Other sessions revoked");
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      const { data } = await authClient.getSession();
      if (!data) navigate({ to: "/login" });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't revoke other sessions.");
    },
  });

  const otherCount = sessions.filter((s) => s.id !== currentSessionId).length;

  return (
    <div className="border-b border-border-subtle px-5 py-5 last:border-0">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[14px] text-foreground">Active sessions</p>
          <p className="mt-1 text-[13px] leading-relaxed text-text-subtle">
            Devices currently signed in to your account.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => revokeMutation.mutate()}
          disabled={isLoading || otherCount === 0 || revokeMutation.isPending}
        >
          {revokeMutation.isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Revoking…
            </>
          ) : (
            "Revoke others"
          )}
        </Button>
      </div>
      <div className="mt-4 space-y-2">
        {isLoading ? (
          <WireLine className="h-10 w-full" />
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-2 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] text-foreground">
                  {describeUserAgent(s.userAgent)}
                  {s.id === currentSessionId ? (
                    <span className="ml-2 text-[11px] text-accent-brand">This device</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[12px] text-text-subtle">
                  {s.ipAddress ? `${s.ipAddress} · ` : ""}
                  Last active {new Date(s.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DeleteAccountDialog() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const confirmed = confirmText.trim().toUpperCase() === "DELETE";

  const reset = () => {
    setPassword("");
    setConfirmText("");
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password) {
      setError("Enter your current password to confirm.");
      return;
    }
    if (!confirmed) {
      setError('Type "DELETE" to confirm.');
      return;
    }
    setSubmitting(true);
    const { error: deleteError } = await authClient.deleteUser({ password });
    setSubmitting(false);
    if (deleteError) {
      setError(deleteError.message ?? "Couldn't delete your account. Try again.");
      return;
    }
    navigate({ to: "/login" });
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
        <Button
          variant="outline"
          size="sm"
          className="border-danger/30 text-danger hover:bg-danger/10 hover:text-danger"
        >
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete your account</DialogTitle>
          <DialogDescription>
            This permanently removes your account, projects, files, generations and every
            other record tied to it. This cannot be undone.
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
            <Label htmlFor="delete-password">Current password</Label>
            <Input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              className="h-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">
              Type <span className="font-mono">DELETE</span> to confirm
            </Label>
            <Input
              id="delete-confirm"
              className="h-10"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={submitting || !password || !confirmed}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Deleting…
                </>
              ) : (
                "Delete my account"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SettingsPage() {
  const { section: sectionParam } = Route.useSearch();
  const queryClient = useQueryClient();
  const getUserProfileFn = useServerFn(getUserProfile);
  const updateUserProfileFn = useServerFn(updateUserProfile);
  const getUserSettingsFn = useServerFn(getUserSettings);
  const updateUserSettingsFn = useServerFn(updateUserSettings);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => getUserProfileFn(),
  });
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => getUserSettingsFn(),
  });

  const isLoading = profileLoading || settingsLoading;

  const [section, setSection] = useState<Section>(sectionParam ?? "Account");
  const [displayName, setDisplayName] = useState("");
  const [notifyProductUpdates, setNotifyProductUpdates] = useState(true);
  const [notifyAiUpdates, setNotifyAiUpdates] = useState(true);
  const [notifyCreditWarnings, setNotifyCreditWarnings] = useState(true);
  const [notifyPlannerReminders, setNotifyPlannerReminders] = useState(true);
  const [defaultAiTone, setDefaultAiTone] = useState<string>(tones[0]!);
  const [keyboardFirstMode, setKeyboardFirstMode] = useState(true);
  const [theme, setTheme] = useState<ThemeSetting>("dark");

  function syncFromServer() {
    if (profile) setDisplayName(profile.name);
    if (settings) {
      setNotifyProductUpdates(settings.notifyProductUpdates);
      setNotifyAiUpdates(settings.notifyAiUpdates);
      setNotifyCreditWarnings(settings.notifyCreditWarnings);
      setNotifyPlannerReminders(settings.notifyPlannerReminders);
      setDefaultAiTone(tones.includes(settings.defaultAiTone) ? settings.defaultAiTone : tones[0]!);
      setKeyboardFirstMode(settings.keyboardFirstMode);
      const serverTheme = settings.theme as ThemeSetting;
      setTheme(serverTheme);
      applyTheme(serverTheme);
    }
  }

  useEffect(syncFromServer, [profile?.id, settings?.userId]);

  useEffect(() => {
    if (sectionParam) setSection(sectionParam);
  }, [sectionParam]);

  function selectTheme(next: ThemeSetting) {
    setTheme(next);
    applyTheme(next);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([
        updateUserProfileFn({ data: { name: displayName.trim() || undefined } }),
        updateUserSettingsFn({
          data: {
            notifyProductUpdates,
            notifyAiUpdates,
            notifyCreditWarnings,
            notifyPlannerReminders,
            defaultAiTone,
            keyboardFirstMode,
            theme,
          },
        }),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
      toast.success("Preferences saved");
    },
    onError: () => toast.error("Couldn't save preferences. Try again."),
  });

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Preferences apply to this workspace."
      />

      <div className="grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="lg:sticky lg:top-20 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {sections.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => setSection(s)}
                  aria-current={section === s ? "true" : undefined}
                  className={cn(
                    "h-9 w-full whitespace-nowrap rounded-lg px-3 text-left text-[13px] transition-colors duration-150",
                    section === s
                      ? "bg-accent-tint text-foreground"
                      : "text-text-muted hover:bg-surface-2 hover:text-foreground",
                  )}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 rounded-xl border border-border bg-surface">
          {isLoading ? (
            <div className="space-y-4 p-5">
              {Array.from({ length: 4 }, (_, i) => (
                <WireLine key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              {section === "Account" ? (
                <>
                  <Row
                    title="Display name"
                    description="Shown on shared links and exports."
                    control={
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="h-9 w-56"
                      />
                    }
                  />
                  <Row
                    title="Delete account"
                    description="Permanently remove your account and all data."
                    control={<DeleteAccountDialog />}
                  />
                </>
              ) : null}

              {section === "Appearance" ? (
                <div className="p-5">
                  <p className="label-eyebrow">Theme</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    {(
                      [
                        { value: "dark", label: "Dark", description: "The CreatorOS default environment.", Icon: Moon },
                        { value: "light", label: "Light", description: "A bright workspace for daytime use.", Icon: Sun },
                        { value: "system", label: "System", description: "Follows your device's appearance setting.", Icon: Laptop },
                      ] as const
                    ).map(({ value, label, description, Icon }) => {
                      const selected = theme === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => selectTheme(value)}
                          className={cn(
                            "relative rounded-xl border p-5 text-left transition-colors duration-150",
                            selected
                              ? "border-accent-brand/50 bg-surface-2"
                              : "border-border hover:bg-surface-2/60",
                          )}
                        >
                          {selected ? (
                            <span className="absolute right-4 top-4 grid size-5 place-items-center rounded-full bg-accent-brand text-primary-foreground">
                              <Check className="size-3" />
                            </span>
                          ) : null}
                          <Icon className={cn("size-4", selected ? "text-accent-brand" : "text-text-subtle")} />
                          <p className="mt-4 text-[14px] text-foreground">{label}</p>
                          <p className="mt-1 text-[13px] text-text-subtle">{description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {section === "Notifications" ? (
                <>
                  <Row
                    title="Product updates"
                    description="New features, improvements and meaningful releases."
                    control={<Switch checked={notifyProductUpdates} onCheckedChange={setNotifyProductUpdates} />}
                  />
                  <Row
                    title="AI generation updates"
                    description="Alerts when background scripts, frames and batch generations complete."
                    control={<Switch checked={notifyAiUpdates} onCheckedChange={setNotifyAiUpdates} />}
                  />
                  <Row
                    title="Credit warnings"
                    description="Alert me when CreatorOS credit balance drops below threshold."
                    control={<Switch checked={notifyCreditWarnings} onCheckedChange={setNotifyCreditWarnings} />}
                  />
                  <Row
                    title="Planner/scheduling reminders"
                    description="Upcoming publishing dates and content deadlines."
                    control={<Switch checked={notifyPlannerReminders} onCheckedChange={setNotifyPlannerReminders} />}
                  />
                  <Row
                    title="Security/account alerts"
                    description="Not available yet — no security alert emails are sent by CreatorOS today."
                    control={<Switch checked={false} disabled />}
                  />
                </>
              ) : null}

              {section === "Security" ? (
                <>
                  <TwoFactorSection />
                  <ActiveSessionsSection />
                </>
              ) : null}

              {section === "Preferences" ? (
                <>
                  <Row
                    title="Default AI tone"
                    description="Applied to new generations across studios when you don't pick a tone explicitly."
                    control={
                      <Select value={defaultAiTone} onValueChange={setDefaultAiTone}>
                        <SelectTrigger className="h-9 w-56">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {tones.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    }
                  />
                  <Row
                    title="Keyboard-first mode"
                    description="Prioritise shortcuts and the command palette."
                    control={<Switch checked={keyboardFirstMode} onCheckedChange={setKeyboardFirstMode} />}
                  />
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={syncFromServer} disabled={isLoading || saveMutation.isPending}>
          Reset
        </Button>
        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={isLoading || saveMutation.isPending}>
          {saveMutation.isPending ? "Saving…" : "Save preferences"}
        </Button>
      </div>
      <Label className="sr-only">Settings form</Label>
    </div>
  );
}

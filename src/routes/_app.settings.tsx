import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Moon, Sun } from "lucide-react";
import { PageHeader } from "@/components/app/primitives";
import { WireLine } from "@/components/app/studio-kit";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getUserProfile, getUserSettings, updateUserProfile, updateUserSettings } from "@/lib/server/settings";

export const Route = createFileRoute("/_app/settings")({
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

const sections = [
  "Account",
  "Appearance",
  "Notifications",
  "Security",
  "Preferences",
] as const;

type Section = (typeof sections)[number];

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

function SettingsPage() {
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

  const [section, setSection] = useState<Section>("Account");
  const [displayName, setDisplayName] = useState("");
  const [notifyProductUpdates, setNotifyProductUpdates] = useState(true);
  const [notifyAiUpdates, setNotifyAiUpdates] = useState(true);
  const [notifyCreditWarnings, setNotifyCreditWarnings] = useState(true);
  const [notifyPlannerReminders, setNotifyPlannerReminders] = useState(true);
  const [defaultAiTone, setDefaultAiTone] = useState("Direct, dry");
  const [autosaveDrafts, setAutosaveDrafts] = useState(true);
  const [keyboardFirstMode, setKeyboardFirstMode] = useState(true);

  function syncFromServer() {
    if (profile) setDisplayName(profile.name);
    if (settings) {
      setNotifyProductUpdates(settings.notifyProductUpdates);
      setNotifyAiUpdates(settings.notifyAiUpdates);
      setNotifyCreditWarnings(settings.notifyCreditWarnings);
      setNotifyPlannerReminders(settings.notifyPlannerReminders);
      setDefaultAiTone(settings.defaultAiTone);
      setAutosaveDrafts(settings.autosaveDrafts);
      setKeyboardFirstMode(settings.keyboardFirstMode);
    }
  }

  useEffect(syncFromServer, [profile?.id, settings?.userId]);

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
            defaultAiTone: defaultAiTone.trim() || undefined,
            autosaveDrafts,
            keyboardFirstMode,
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
        description="Preferences apply to this workspace. Nothing here is persisted in the prototype."
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
                    title="Workspace language"
                    description="Interface language for CreatorOS."
                    control={
                      <Input defaultValue="English (UK)" className="h-9 w-56" disabled />
                    }
                  />
                  <Row
                    title="Delete account"
                    description="Permanently remove your account and all data."
                    control={
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-danger/30 text-danger hover:bg-danger/10 hover:text-danger"
                      >
                        Delete
                      </Button>
                    }
                  />
                </>
              ) : null}

              {section === "Appearance" ? (
                <div className="p-5">
                  <p className="label-eyebrow">Theme</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="relative rounded-xl border border-accent-brand/50 bg-surface-2 p-5">
                      <span className="absolute right-4 top-4 grid size-5 place-items-center rounded-full bg-accent-brand text-primary-foreground">
                        <Check className="size-3" />
                      </span>
                      <Moon className="size-4 text-accent-brand" />
                      <p className="mt-4 text-[14px] text-foreground">Dark</p>
                      <p className="mt-1 text-[13px] text-text-subtle">
                        The CreatorOS default environment.
                      </p>
                    </div>
                    <div className="rounded-xl border border-dashed border-border p-5 opacity-60">
                      <Sun className="size-4 text-text-subtle" />
                      <p className="mt-4 text-[14px] text-foreground">Light</p>
                      <p className="mt-1 text-[13px] text-text-subtle">
                        Token architecture supports it — shipping in a later phase.
                      </p>
                    </div>
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
                    description="Important security notices and session updates."
                    control={<Switch defaultChecked disabled />}
                  />
                </>
              ) : null}

              {section === "Security" ? (
                <>
                  <Row
                    title="Two-factor authentication"
                    description="Requires an authenticator app. Coming in a later phase."
                    control={
                      <Button size="sm" variant="outline" disabled>
                        Enable
                      </Button>
                    }
                  />
                  <Row
                    title="Active sessions"
                    description="This browser · London · active now"
                    control={
                      <Button size="sm" variant="outline">
                        Revoke others
                      </Button>
                    }
                  />
                </>
              ) : null}

              {section === "Preferences" ? (
                <>
                  <Row
                    title="Default AI tone"
                    description="Applied to new generations across studios."
                    control={
                      <Input
                        value={defaultAiTone}
                        onChange={(e) => setDefaultAiTone(e.target.value)}
                        className="h-9 w-56"
                      />
                    }
                  />
                  <Row
                    title="Autosave drafts"
                    description="Keep an on-device copy while you write."
                    control={<Switch checked={autosaveDrafts} onCheckedChange={setAutosaveDrafts} />}
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

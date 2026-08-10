import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Check,
  FileText,
  Video,
  MessagesSquare,
  Sparkles,
  Save,
  Send,
  PenSquare,
  Repeat,
} from "lucide-react";
import { EmptyState, SectionLabel } from "@/components/app/primitives";
import {
  CostHint,
  GeneratingState,
  OptionCard,
  RecommendedBadge,
  StatusPill,
} from "@/components/app/studio-kit";
import { platforms, type PlatformId } from "@/lib/creator-data";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/repurpose")({
  head: () => ({
    meta: [
      { title: "Repurpose — CreatorOS AI" },
      { name: "description", content: "Create once and adapt it into platform-native versions, ready to review, approve and schedule." },
      { property: "og:title", content: "Repurpose — CreatorOS AI" },
      { property: "og:description", content: "Create once and adapt it into platform-native versions, ready to review, approve and schedule." },
    ],
  }),
  component: RepurposePage,
});

type SourceItem = {
  id: string;
  type: "Script" | "Video" | "Chat";
  title: string;
  lastEdited: string;
};

const sources: SourceItem[] = [
  { id: "s1", type: "Script", title: "Creator burnout — talking points", lastEdited: "2h ago" },
  { id: "s2", type: "Video", title: "Studio tour walkthrough (raw cut)", lastEdited: "Yesterday" },
  { id: "s3", type: "Chat", title: "Newsletter outline conversation", lastEdited: "3 days ago" },
  { id: "s4", type: "Script", title: "Q3 sponsor pitch narration", lastEdited: "5 days ago" },
];

const sourceIcon: Record<SourceItem["type"], typeof FileText> = {
  Script: FileText,
  Video: Video,
  Chat: MessagesSquare,
};

const steps = ["Source", "Targets", "Adapt", "Review"] as const;
const flowLabels = ["Create once", "Adapt", "Review", "Approve", "Schedule"];

type ResultOption = { id: string; title: string; recommended?: boolean };

export default function RepurposePage() {
  const [step, setStep] = useState(0);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [targets, setTargets] = useState<PlatformId[]>(["youtube", "instagram"]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [selections, setSelections] = useState<Record<PlatformId, string>>({} as Record<PlatformId, string>);
  const [approved, setApproved] = useState<Record<PlatformId, boolean>>({} as Record<PlatformId, boolean>);
  const [editText, setEditText] = useState<Record<PlatformId, string>>({} as Record<PlatformId, string>);

  const source = sources.find((s) => s.id === sourceId) ?? null;

  const results: Record<PlatformId, ResultOption[]> = useMemo(() => {
    const map = {} as Record<PlatformId, ResultOption[]>;
    targets.forEach((id) => {
      const p = platforms.find((pl) => pl.id === id)!;
      map[id] = [
        { id: `${id}-a`, title: `${p.hook}`, recommended: true },
        { id: `${id}-b`, title: `Alternate cut leaning on ${p.tone.toLowerCase()}` },
        { id: `${id}-c`, title: `Shorter variant optimised for ${p.durations[0]}` },
      ];
    });
    return map;
  }, [targets]);

  function toggleTarget(id: PlatformId) {
    setTargets((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function runAdapt() {
    setIsGenerating(true);
    setGenerated(false);
    setTimeout(() => {
      const initialSel: Record<PlatformId, string> = {} as Record<PlatformId, string>;
      const initialText: Record<PlatformId, string> = {} as Record<PlatformId, string>;
      targets.forEach((id) => {
        initialSel[id] = `${id}-a`;
        const p = platforms.find((pl) => pl.id === id)!;
        initialText[id] = `${p.hook}\n\n${p.caption}\n\n${p.cta}`;
      });
      setSelections(initialSel);
      setEditText(initialText);
      setIsGenerating(false);
      setGenerated(true);
      setStep(3);
    }, 1400);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="label-eyebrow">Repurpose</p>
        <h1 className="mt-2 text-[30px] font-medium leading-tight tracking-[-0.03em] text-foreground">
          Create once, adapt everywhere
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-muted">
          Turn a single script, video or chat into platform-native versions — then review, approve and send them on for scheduling.
        </p>
      </div>

      {/* Flow stepper */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-4">
        {flowLabels.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]",
                i <= (generated ? 2 : step === 3 ? 2 : step)
                  ? "border-accent-brand/30 bg-accent-tint text-accent-brand"
                  : "border-border bg-surface-2 text-text-subtle",
              )}
            >
              {label}
            </span>
            {i < flowLabels.length - 1 ? (
              <span className="text-text-subtle">→</span>
            ) : null}
          </div>
        ))}
      </div>

      {/* Step nav */}
      <div className="flex gap-1.5">
        {steps.map((label, i) => (
          <button
            key={label}
            type="button"
            disabled={i > 0 && !source}
            onClick={() => setStep(i)}
            className={cn(
              "h-8 rounded-lg border px-3 text-[12px] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
              step === i
                ? "border-accent-brand/40 bg-accent-tint text-foreground"
                : "border-border bg-surface-2 text-text-muted hover:text-foreground",
            )}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      {!source && step === 0 ? null : null}

      {step === 0 ? (
        <section>
          <SectionLabel>Choose a source</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {sources.map((s) => {
              const Icon = sourceIcon[s.type];
              const selected = sourceId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSourceId(s.id)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border bg-surface p-4 text-left transition-colors duration-150 hover:border-accent-brand/40",
                    selected ? "border-accent-brand/60 bg-surface-2" : "border-border",
                  )}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-accent-brand">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-medium text-foreground">{s.title}</p>
                      {selected ? (
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-accent-brand text-primary-foreground">
                          <Check className="size-3" />
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                      {s.type} · Edited {s.lastEdited}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          {!source ? (
            <EmptyState
              icon={Repeat}
              className="mt-5"
              title="Pick a source to begin"
              description="Choose a script, video or chat above and CreatorOS will guide you through adapting it for every platform."
            />
          ) : null}
          <div className="mt-5 flex justify-end">
            <Button disabled={!source} onClick={() => setStep(1)}>
              Continue to targets
            </Button>
          </div>
        </section>
      ) : null}

      {step === 1 && source ? (
        <section className="space-y-5">
          <SectionLabel>Select target platforms</SectionLabel>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {platforms.map((p) => {
              const selected = targets.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleTarget(p.id)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-[12px] transition-colors duration-150",
                    selected
                      ? "border-accent-brand/50 bg-accent-tint text-foreground"
                      : "border-border bg-surface-2 text-text-subtle hover:text-foreground",
                  )}
                >
                  <p.icon className={cn("size-5", selected && "text-accent-brand")} />
                  {p.label}
                </button>
              );
            })}
          </div>

          {targets.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {targets.map((id) => {
                const p = platforms.find((pl) => pl.id === id)!;
                return (
                  <div key={id} className="rounded-xl border border-border bg-surface p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <p.icon className="size-4 text-accent-brand" />
                      <p className="text-[13px] font-medium text-foreground">{p.label}</p>
                    </div>
                    <dl className="space-y-1.5 text-[12px]">
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-subtle">Aspect ratio</dt>
                        <dd className="text-text-muted">{p.aspectRatios.join(" · ")}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-subtle">Duration</dt>
                        <dd className="text-text-muted">{p.durations[0]}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-subtle">Tone</dt>
                        <dd className="text-text-muted">{p.tone}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-subtle">Caption</dt>
                        <dd className="text-right text-text-muted">{p.caption}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-text-subtle">CTA</dt>
                        <dd className="text-text-muted">{p.cta}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-text-subtle">Select at least one platform to continue.</p>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button disabled={targets.length === 0} onClick={() => setStep(2)}>
              Continue to adapt
            </Button>
          </div>
        </section>
      ) : null}

      {step === 2 && source ? (
        <section className="space-y-5">
          <SectionLabel
            aside={<CostHint credits={targets.length * 6} />}
          >
            Adapt content
          </SectionLabel>
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="text-[13px] text-text-muted">
              CreatorOS will rewrite <span className="text-foreground">{source.title}</span> into {targets.length} platform-native version{targets.length === 1 ? "" : "s"}.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Button onClick={runAdapt} disabled={isGenerating} className="gap-2">
                <Sparkles className="size-4" />
                {isGenerating ? "Adapting…" : "Adapt content"}
              </Button>
              {isGenerating ? <GeneratingState label="Generating platform variations" /> : null}
            </div>
          </div>
          <div className="flex justify-start">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
          </div>
        </section>
      ) : null}

      {step === 3 && generated ? (
        <section className="space-y-6">
          <SectionLabel>Review &amp; approve</SectionLabel>
          <div className="grid gap-5 lg:grid-cols-2">
            {targets.map((id) => {
              const p = platforms.find((pl) => pl.id === id)!;
              const options = results[id] ?? [];
              const isApproved = approved[id] ?? false;
              return (
                <div key={id} className="space-y-3 rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p.icon className="size-4 text-accent-brand" />
                      <p className="text-[13px] font-medium text-foreground">{p.label}</p>
                    </div>
                    <StatusPill tone={isApproved ? "success" : "neutral"}>
                      {isApproved ? "Approved" : "Pending review"}
                    </StatusPill>
                  </div>

                  <div className="grid gap-2">
                    {options.map((opt) => (
                      <OptionCard
                        key={opt.id}
                        label="Variant"
                        title={opt.title}
                        recommended={opt.recommended ?? false}
                        selected={selections[id] === opt.id}
                        onSelect={() => setSelections((s) => ({ ...s, [id]: opt.id }))}
                      />
                    ))}
                  </div>

                  <Textarea
                    value={editText[id] ?? ""}
                    onChange={(e) => setEditText((s) => ({ ...s, [id]: e.target.value }))}
                    rows={4}
                    className="text-[12px]"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-text-muted">Approve for scheduling</span>
                    <Switch
                      checked={isApproved}
                      onCheckedChange={(v) => setApproved((s) => ({ ...s, [id]: v }))}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border-subtle pt-5">
            <Button variant="outline" className="gap-1.5">
              <Save className="size-3.5" /> Save
            </Button>
            <Button variant="outline" className="gap-1.5" asChild>
              <Link to="/content-planner">
                <Send className="size-3.5" /> Send to Content Planner
              </Link>
            </Button>
            <Button variant="outline" className="gap-1.5" asChild>
              <Link to="/script-studio">
                <PenSquare className="size-3.5" /> Open in Script Studio
              </Link>
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

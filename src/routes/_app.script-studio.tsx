import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Sparkles,
  GripVertical,
  RefreshCw,
  Wand2,
  ArrowRightLeft,
  Maximize2,
  Minimize2,
  Rows3,
} from "lucide-react";
import { EmptyState, PageHeader, SectionLabel } from "@/components/app/primitives";
import {
  ChipGroup,
  CostHint,
  Field,
  GeneratingState,
  OptionCard,
  Panel,
  PlatformGuidance,
  PlatformPicker,
  usePlatform,
} from "@/components/app/studio-kit";
import { tones, languages } from "@/lib/creator-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { generateScriptAction, rewriteScriptAction } from "@/lib/server/ai/script-studio";
import { getUserSettings } from "@/lib/server/settings";

const SETTINGS_QUERY_KEY = ["user-settings"] as const;
import type { ScriptOption } from "@/lib/ai/types";

export const Route = createFileRoute("/_app/script-studio")({
  head: () => ({
    meta: [
      { title: "Script Studio — CreatorOS AI" },
      { name: "description", content: "Draft, structure and refine long-form scripts with an editor built for spoken words." },
      { property: "og:title", content: "Script Studio — CreatorOS AI" },
      { property: "og:description", content: "Draft, structure and refine long-form scripts with an editor built for spoken words." },
    ],
  }),
  component: ScriptStudioPage,
});

type Section = { id: string; label: string; text: string };

const aiActions = [
  { key: "rewrite", label: "Rewrite", icon: RefreshCw, credits: 3 },
  { key: "expand", label: "Expand", icon: Maximize2, credits: 4 },
  { key: "shorten", label: "Shorten", icon: Minimize2, credits: 2 },
  { key: "improve", label: "Improve", icon: Wand2, credits: 3 },
  { key: "continue", label: "Continue", icon: ArrowRightLeft, credits: 4 },
];

function ScriptStudioPage() {
  const { id: platformId, setId: setPlatformId, platform } = usePlatform("youtube");
  const [title, setTitle] = useState("");

  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState<string>(platform.contentTypes[0] ?? "");
  const [duration, setDuration] = useState<string>(platform.durations[0] ?? "");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState<string>(tones[0] ?? "");
  const [language, setLanguage] = useState<string>(languages[0] ?? "");

  const getUserSettingsFn = useServerFn(getUserSettings);
  const { data: settings } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => getUserSettingsFn(),
  });
  useEffect(() => {
    if (settings?.defaultAiTone && tones.includes(settings.defaultAiTone)) {
      setTone(settings.defaultAiTone);
    }
  }, [settings?.userId]);
  const [creativity, setCreativity] = useState([55]);
  const [multiOption, setMultiOption] = useState(true);

  const [scriptOptions, setScriptOptions] = useState<ScriptOption[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [tonePickerOpen, setTonePickerOpen] = useState(false);

  const generateScriptFn = useServerFn(generateScriptAction);
  const rewriteScriptFn = useServerFn(rewriteScriptAction);

  const handlePlatformChange = (id: typeof platformId) => {
    setPlatformId(id);
    const next = platforms_lookup(id);
    setContentType(next.contentTypes[0] ?? "");
    setDuration(next.durations[0] ?? "");
  };

  function platforms_lookup(id: string) {
    return { contentTypes: platform.contentTypes, durations: platform.durations };
  }

  const generateMutation = useMutation({
    mutationFn: () =>
      generateScriptFn({
        data: {
          topic,
          platform: platform.label,
          contentType,
          duration,
          tone,
          language,
          creativity: creativity[0]! / 100,
          multiOption,
          ...(audience.trim() ? { audience: audience.trim() } : {}),
        },
      }),
    onSuccess: (result) => {
      setScriptOptions(result.options);
      setHasGenerated(true);
      setSelectedOption(null);
      setSections([]);
    },
    onError: () => toast.error("Couldn't generate a script. Try again."),
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const handleSelectOption = (key: string) => {
    const option = scriptOptions.find((o) => o.key === key);
    if (!option) return;
    setSelectedOption(key);
    setSections(option.sections);
  };

  const updateSection = (id: string, text: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));
  };

  const rewriteMutation = useMutation({
    mutationFn: async ({ key, targets }: { key: string; action: string; targets: Section[] }) => {
      const results = await Promise.all(
        targets.map((s) => rewriteScriptFn({ data: { sectionText: s.text, action: rewriteActionFor(key) } })),
      );
      return targets.map((s, i) => ({ id: s.id, text: results[i]!.text }));
    },
    onSuccess: (updates) => {
      setSections((prev) => prev.map((s) => {
        const update = updates.find((u) => u.id === s.id);
        return update ? { ...s, text: update.text } : s;
      }));
    },
    onError: () => toast.error("Couldn't rewrite that section. Try again."),
    onSettled: () => setProcessingAction(null),
  });

  function rewriteActionFor(key: string): string {
    if (key.startsWith("section-")) return "rewrite";
    if (key.startsWith("tone-")) return key;
    return key;
  }

  const runAction = (key: string) => {
    setProcessingAction(key);
    if (key.startsWith("section-")) {
      const sectionId = key.slice("section-".length);
      const target = sections.find((s) => s.id === sectionId);
      if (!target) {
        setProcessingAction(null);
        return;
      }
      rewriteMutation.mutate({ key, action: rewriteActionFor(key), targets: [target] });
      return;
    }
    if (sections.length === 0) {
      setProcessingAction(null);
      return;
    }
    rewriteMutation.mutate({ key, action: rewriteActionFor(key), targets: sections });
  };

  const fullText = sections.map((s) => s.text).join(" ");
  const stats = useMemo(() => {
    const words = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
    const chars = fullText.length;
    const minutes = Math.max(1, Math.round(words / 150));
    return { words, chars, minutes };
  }, [fullText]);

  function downloadBlob(content: string, mime: string, extension: string) {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "untitled-script").replace(/[^a-z0-9-_]+/gi, "-")}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPlainText() {
    if (sections.length === 0) return;
    downloadBlob(`${title || "Untitled script"}\n\n${sections.map((s) => `${s.label}\n${s.text}`).join("\n\n")}`, "text/plain", "txt");
  }

  function exportMarkdown() {
    if (sections.length === 0) return;
    downloadBlob(
      `# ${title || "Untitled script"}\n\n${sections.map((s) => `## ${s.label}\n\n${s.text}`).join("\n\n")}`,
      "text/markdown",
      "md",
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Create"
        title="Script Studio"
        description="Draft, structure and refine long-form scripts with an editor built for spoken words."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={sections.length === 0}>
                  <Download className="size-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportMarkdown}>Markdown</DropdownMenuItem>
                <DropdownMenuItem onClick={exportPlainText}>Plain text</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-11 border-none bg-transparent px-0 text-[20px] font-medium tracking-[-0.01em] text-foreground shadow-none focus-visible:ring-0"
        placeholder="Untitled script"
      />

      <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* LEFT INPUT PANEL */}
        <div className="space-y-6">
          <Panel title="Script inputs">
            <div className="space-y-5">
              <Field label="Topic / idea">
                <Textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What is this script about?"
                  className="min-h-[84px] bg-surface-2 text-[13px]"
                />
              </Field>
              <Field label="Platform">
                <PlatformPicker value={platformId} onChange={handlePlatformChange} />
              </Field>
              <PlatformGuidance platform={platform} />
              <Field label="Content type">
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger className="h-9 bg-surface-2 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platform.contentTypes.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Target duration">
                <ChipGroup options={platform.durations} value={duration} onChange={setDuration} />
              </Field>
              <Field label="Audience">
                <Input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. early-stage creators"
                  className="h-9 bg-surface-2 text-[13px]"
                />
              </Field>
              <Field label="Tone">
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="h-9 bg-surface-2 text-[13px]">
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
              </Field>
              <Field label="Language">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-9 bg-surface-2 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={`Creativity — ${creativity[0]}%`}>
                <Slider value={creativity} onValueChange={setCreativity} max={100} step={5} />
              </Field>

              <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                <span className="text-[12px] text-text-muted">Generate 3 options</span>
                <Switch checked={multiOption} onCheckedChange={setMultiOption} />
              </div>

              {generateMutation.isPending ? (
                <GeneratingState label="Drafting script options" />
              ) : (
                <Button className="w-full" onClick={handleGenerate} disabled={!topic.trim()}>
                  <Sparkles className="size-3.5" />
                  Generate
                </Button>
              )}
              <div className="flex justify-end">
                <CostHint credits={multiOption ? 18 : 7} />
              </div>
            </div>
          </Panel>
        </div>

        {/* MAIN COLUMN */}
        <div className="space-y-6">
          {!hasGenerated && !generateMutation.isPending ? (
            <EmptyState
              icon={FileText}
              title="No script yet"
              description="Fill in the inputs on the left and generate to see script options here."
            />
          ) : null}

          {generateMutation.isPending ? (
            <Panel title="Generating options">
              <GeneratingState label="Writing hook, beats and CTA" />
            </Panel>
          ) : null}

          {hasGenerated && !generateMutation.isPending ? (
            <>
              <section>
                <SectionLabel>Generated options</SectionLabel>
                <div className="grid gap-4 md:grid-cols-3">
                  {scriptOptions.map((option) => (
                    <OptionCard
                      key={option.key}
                      label={option.label}
                      title={option.sections[0]?.text ?? ""}
                      recommended={option.recommended}
                      selected={selectedOption === option.key}
                      onSelect={() => handleSelectOption(option.key)}
                      meta={`${platform.label} · ${duration}`}
                    >
                      <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-text-muted">
                        {option.sections[2]?.text}
                      </p>
                      {option.rationale ? (
                        <p className="mt-3 text-[11px] leading-relaxed text-accent-brand">
                          {option.rationale}
                        </p>
                      ) : null}
                    </OptionCard>
                  ))}
                </div>
              </section>

              {selectedOption ? (
                <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_220px]">
                  <Panel title="Editor" bodyClassName="p-5">
                    <div className="space-y-4">
                      {sections.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-lg border border-border bg-surface-2 p-4"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <GripVertical className="size-3.5 text-text-subtle" />
                              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                                {s.label}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] text-text-muted"
                              onClick={() => runAction(`section-${s.id}`)}
                            >
                              {processingAction === `section-${s.id}` ? (
                                <RefreshCw className="size-3 animate-spin" />
                              ) : (
                                <RefreshCw className="size-3" />
                              )}
                              Regenerate section
                            </Button>
                          </div>
                          <Textarea
                            value={s.text}
                            onChange={(e) => updateSection(s.id, e.target.value)}
                            className="min-h-[70px] bg-surface text-[13px]"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border-subtle pt-4 font-mono text-[11px] text-text-subtle">
                      <span>{stats.words} words</span>
                      <span>{stats.chars} characters</span>
                      <span>~{stats.minutes} min estimated</span>
                    </div>
                  </Panel>

                  {/* AI ACTIONS RAIL */}
                  <Panel title="AI actions" bodyClassName="p-3">
                    <TooltipProvider delayDuration={200}>
                      <div className="space-y-1.5">
                        {aiActions.map((a) => (
                          <Tooltip key={a.key}>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => runAction(a.key)}
                                disabled={processingAction === a.key}
                              >
                                {processingAction === a.key ? (
                                  <RefreshCw className="size-3.5 animate-spin" />
                                ) : (
                                  <a.icon className="size-3.5" />
                                )}
                                {a.label}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <CostHint credits={a.credits} />
                            </TooltipContent>
                          </Tooltip>
                        ))}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <DropdownMenu open={tonePickerOpen} onOpenChange={setTonePickerOpen}>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="w-full justify-start">
                                    <Rows3 className="size-3.5" />
                                    Change tone
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {tones.map((t) => (
                                    <DropdownMenuItem
                                      key={t}
                                      onClick={() => runAction(`tone-${t}`)}
                                    >
                                      {t}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <CostHint credits={3} />
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </Panel>
                </div>
              ) : null}

            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

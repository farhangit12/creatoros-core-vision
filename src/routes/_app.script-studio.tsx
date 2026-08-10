import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  Save,
  Download,
  Sparkles,
  GripVertical,
  RefreshCw,
  Wand2,
  ArrowRightLeft,
  Maximize2,
  Minimize2,
  Rows3,
  Image as ImageIcon,
  Clapperboard,
  Repeat,
  CalendarPlus,
  History,
  Eye,
  RotateCcw,
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
  StatusPill,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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

const mockProjects = ["Q3 Growth Series", "Onboarding Rewrite", "Founder Story Arc"];

type Section = { id: string; label: string; text: string };

const initialSections: Record<string, Section[]> = {
  a: [
    { id: "hook", label: "Hook", text: "You're losing viewers in the first 8 seconds — here's the fix nobody talks about." },
    { id: "intro", label: "Intro", text: "Quick intro: who this is for, and the one promise we're making in this video." },
    { id: "body", label: "Body beats", text: "Beat 1: the mistake. Beat 2: the reframe. Beat 3: a concrete before/after example." },
    { id: "cta", label: "CTA", text: "Subscribe if this helped, and check the next video for the full breakdown." },
  ],
  b: [
    { id: "hook", label: "Hook", text: "I tried the advice every creator gives about hooks — most of it is wrong." },
    { id: "intro", label: "Intro", text: "Set up the experiment: three hook styles, one video, real retention data." },
    { id: "body", label: "Body beats", text: "Beat 1: curiosity hook results. Beat 2: shock hook results. Beat 3: direct-promise hook results." },
    { id: "cta", label: "CTA", text: "Comment which hook style you use — I'll reply with your retention estimate." },
  ],
  c: [
    { id: "hook", label: "Hook", text: "This 12-minute structure is why our watch time doubled last month." },
    { id: "intro", label: "Intro", text: "Short credibility line, then a one-sentence roadmap of the video." },
    { id: "body", label: "Body beats", text: "Beat 1: the structure. Beat 2: why it works psychologically. Beat 3: a template you can copy." },
    { id: "cta", label: "CTA", text: "Grab the template linked below and tell us how it performs." },
  ],
};

const versions = [
  { id: "v4", label: "v4", timestamp: "Today, 2:41 PM", author: "You", current: true },
  { id: "v3", label: "v3", timestamp: "Today, 11:05 AM", author: "You", current: false },
  { id: "v2", label: "v2", timestamp: "Yesterday, 6:20 PM", author: "Amara K.", current: false },
  { id: "v1", label: "v1", timestamp: "Monday, 9:02 AM", author: "You", current: false },
];

const aiActions = [
  { key: "rewrite", label: "Rewrite", icon: RefreshCw, credits: 3 },
  { key: "expand", label: "Expand", icon: Maximize2, credits: 4 },
  { key: "shorten", label: "Shorten", icon: Minimize2, credits: 2 },
  { key: "improve", label: "Improve", icon: Wand2, credits: 3 },
  { key: "continue", label: "Continue", icon: ArrowRightLeft, credits: 4 },
];

function ScriptStudioPage() {
  const { id: platformId, setId: setPlatformId, platform } = usePlatform("youtube");
  const [title, setTitle] = useState("Why your first 8 seconds are killing retention");
  const [project, setProject] = useState<string>("none");

  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState(platform.contentTypes[0]);
  const [duration, setDuration] = useState(platform.durations[0]);
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState(tones[0]);
  const [language, setLanguage] = useState(languages[0]);
  const [creativity, setCreativity] = useState([55]);
  const [multiOption, setMultiOption] = useState(true);

  const [generating, setGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>(initialSections.a);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [tonePickerOpen, setTonePickerOpen] = useState(false);

  const handlePlatformChange = (id: typeof platformId) => {
    setPlatformId(id);
    const next = platforms_lookup(id);
    setContentType(next.contentTypes[0]);
    setDuration(next.durations[0]);
  };

  function platforms_lookup(id: string) {
    return { contentTypes: platform.contentTypes, durations: platform.durations };
  }

  const handleGenerate = () => {
    setGenerating(true);
    window.setTimeout(() => {
      setGenerating(false);
      setHasGenerated(true);
    }, 1400);
  };

  const handleSelectOption = (key: "a" | "b" | "c") => {
    setSelectedOption(key);
    setSections(initialSections[key]);
  };

  const updateSection = (id: string, text: string) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, text } : s)));
  };

  const runAction = (key: string) => {
    setProcessingAction(key);
    window.setTimeout(() => setProcessingAction(null), 1100);
  };

  const fullText = sections.map((s) => s.text).join(" ");
  const stats = useMemo(() => {
    const words = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
    const chars = fullText.length;
    const minutes = Math.max(1, Math.round(words / 150));
    return { words, chars, minutes };
  }, [fullText]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Create"
        title="Script Studio"
        description="Draft, structure and refine long-form scripts with an editor built for spoken words."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={project} onValueChange={setProject}>
              <SelectTrigger className="h-9 w-[180px] bg-surface-2 text-[13px]">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {mockProjects.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Save className="size-3.5" />
              Save
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="size-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>PDF</DropdownMenuItem>
                <DropdownMenuItem>Markdown</DropdownMenuItem>
                <DropdownMenuItem>Plain text</DropdownMenuItem>
                <DropdownMenuItem>Teleprompter</DropdownMenuItem>
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

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
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

              {generating ? (
                <GeneratingState label="Drafting script options" />
              ) : (
                <Button className="w-full" onClick={handleGenerate}>
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
          {!hasGenerated && !generating ? (
            <EmptyState
              icon={FileText}
              title="No script yet"
              description="Fill in the inputs on the left and generate to see script options here."
            />
          ) : null}

          {generating ? (
            <Panel title="Generating options">
              <GeneratingState label="Writing hook, beats and CTA" />
            </Panel>
          ) : null}

          {hasGenerated && !generating ? (
            <>
              <section>
                <SectionLabel>Generated options</SectionLabel>
                <div className="grid gap-4 md:grid-cols-3">
                  {(["a", "b", "c"] as const).map((key, i) => (
                    <OptionCard
                      key={key}
                      label={`Option ${key.toUpperCase()}`}
                      title={initialSections[key][0].text}
                      recommended={i === 0}
                      selected={selectedOption === key}
                      onSelect={() => handleSelectOption(key)}
                      meta={`${platform.label} · ${duration}`}
                    >
                      <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-text-muted">
                        {initialSections[key][2].text}
                      </p>
                      {i === 0 ? (
                        <p className="mt-3 text-[11px] leading-relaxed text-accent-brand">
                          Strongest hook-to-payoff ratio for this audience.
                        </p>
                      ) : null}
                    </OptionCard>
                  ))}
                </div>
              </section>

              {selectedOption ? (
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_240px]">
                  <Panel
                    title="Editor"
                    bodyClassName="p-5"
                    aside={
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm">
                            <History className="size-3.5" />
                            Versions
                          </Button>
                        </SheetTrigger>
                        <SheetContent>
                          <SheetHeader>
                            <SheetTitle>Version history</SheetTitle>
                          </SheetHeader>
                          <div className="mt-4 space-y-3 px-1">
                            {versions.map((v) => (
                              <div
                                key={v.id}
                                className="rounded-lg border border-border bg-surface-2 p-3"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono text-[12px] text-foreground">{v.label}</span>
                                  {v.current ? (
                                    <StatusPill tone="accent">Current</StatusPill>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-[11px] text-text-subtle">
                                  {v.timestamp} · {v.author}
                                </p>
                                <div className="mt-2 flex gap-1.5">
                                  <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                                    <Eye className="size-3" />
                                    Preview
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-[11px]"
                                    disabled={v.current}
                                  >
                                    <RotateCcw className="size-3" />
                                    Restore
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </SheetContent>
                      </Sheet>
                    }
                  >
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

              {selectedOption ? (
                <Panel title="Next steps">
                  <ContextActionsRow />
                </Panel>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ContextActionsRow() {
  const items = [
    { label: "Save to Project", icon: Save },
    { label: "Generate Thumbnail", icon: ImageIcon, to: "/thumbnail-studio" },
    { label: "Generate Image", icon: ImageIcon, to: "/image-studio" },
    { label: "Create Video", icon: Clapperboard, to: "/video-studio" },
    { label: "Repurpose", icon: Repeat, to: "/repurpose" },
    { label: "Add to Planner", icon: CalendarPlus, to: "/content-planner" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((a) =>
        a.to ? (
          <a
            key={a.label}
            href={a.to}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-[12px] text-text-muted transition-colors duration-150 hover:border-accent-brand/40 hover:text-foreground"
          >
            <a.icon className="size-3.5" />
            {a.label}
          </a>
        ) : (
          <button
            key={a.label}
            type="button"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-[12px] text-text-muted transition-colors duration-150 hover:border-accent-brand/40 hover:text-foreground"
          >
            <a.icon className="size-3.5" />
            {a.label}
          </button>
        ),
      )}
    </div>
  );
}

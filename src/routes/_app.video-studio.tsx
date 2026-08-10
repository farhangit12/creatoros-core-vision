import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Clapperboard,
  Play,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Mic,
  Captions,
  Music,
  Save,
  Download,
  Loader2,
  Image as ImageIcon,
  Film,
} from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/app/primitives";
import {
  ChipGroup,
  CostHint,
  Field,
  GeneratingState,
  Panel,
  PlatformPicker,
  StatusPill,
  usePlatform,
} from "@/components/app/studio-kit";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/_app/video-studio")({
  head: () => ({
    meta: [
      { title: "Video Studio — CreatorOS AI" },
      { name: "description", content: "Assemble short-form cuts, captions and renders on a single timeline." },
      { property: "og:title", content: "Video Studio — CreatorOS AI" },
      { property: "og:description", content: "Assemble short-form cuts, captions and renders on a single timeline." },
    ],
  }),
  component: VideoStudioPage,
});

const mockScripts = ["Why your first 8 seconds are killing retention", "The 3-part hook experiment", "Our 12-minute structure"];
const videoTypes = ["Talking head", "Voiceover + b-roll", "Screen recording", "Animated explainer"];
const visualStyles = ["Clean & minimal", "Bold captions", "Cinematic grade look", "Native / raw"];
const voices = ["Aria (US, warm)", "Milo (US, energetic)", "Nadia (UK, calm)", "Kenji (US, deep)"];
const musicTracks = ["No music", "Uplift — Ambient", "Momentum — Corporate", "Drift — Lo-fi"];

type Scene = {
  id: string;
  title: string;
  duration: number;
  caption: string;
  suggestion: string;
};

const initialScenes: Scene[] = [
  { id: "s1", title: "Hook — pattern break", duration: 4, caption: "You're losing viewers in 8 seconds.", suggestion: "Fast zoom, bold text overlay" },
  { id: "s2", title: "Context setup", duration: 6, caption: "Here's the mistake most creators make.", suggestion: "Talking head, medium shot" },
  { id: "s3", title: "Core beat 1", duration: 8, caption: "The reframe: think payoff-first.", suggestion: "B-roll of editing timeline" },
  { id: "s4", title: "Core beat 2", duration: 7, caption: "A before/after side-by-side.", suggestion: "Split-screen comparison" },
  { id: "s5", title: "CTA", duration: 5, caption: "Subscribe for the full breakdown.", suggestion: "Talking head, subscribe animation" },
];

const mediaSuggestions = [
  "Stock: creator recording at desk (b-roll)",
  "Stock: laptop timeline scrubbing close-up",
  "Broll: phone scrolling short-form feed",
  "Broll: analytics dashboard zoom-in",
];

function VideoStudioPage() {
  const { id: platformId, setId: setPlatformId, platform } = usePlatform("tiktok");
  const [scriptChoice, setScriptChoice] = useState<string>(mockScripts[0] ?? "");
  const [pastedScript, setPastedScript] = useState("");
  const [videoType, setVideoType] = useState<string>(videoTypes[1] ?? "");
  const [aspectRatio, setAspectRatio] = useState<string>(platform.aspectRatios[0] ?? "");
  const [duration, setDuration] = useState<string>(platform.durations[0] ?? "");
  const [visualStyle, setVisualStyle] = useState<string>(visualStyles[0] ?? "");

  const [voiceoverOn, setVoiceoverOn] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [musicOn, setMusicOn] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [hasBreakdown, setHasBreakdown] = useState(false);
  const [scenes, setScenes] = useState<Scene[]>(initialScenes);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(initialScenes[0]!.id);

  const [voice, setVoice] = useState<string>(voices[0] ?? "");
  const [musicTrack, setMusicTrack] = useState<string>(musicTracks[0] ?? "");
  const [volume, setVolume] = useState([60]);

  const [playing, setPlaying] = useState(false);
  const [renderState, setRenderState] = useState<"idle" | "queued" | "processing" | "done">("idle");

  const handlePlatformChange = (id: typeof platformId) => {
    setPlatformId(id);
  };

  const handleGenerateBreakdown = () => {
    setGenerating(true);
    window.setTimeout(() => {
      setGenerating(false);
      setHasBreakdown(true);
    }, 1500);
  };

  const moveScene = (index: number, dir: -1 | 1) => {
    setScenes((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index]!;
      next[index] = next[target]!;
      next[target] = tmp;
      return next;
    });
  };

  const updateCaption = (id: string, caption: string) => {
    setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, caption } : s)));
  };

  const selectedScene: Scene = scenes.find((s) => s.id === selectedSceneId) ?? scenes[0]!;
  const totalDuration = useMemo(() => scenes.reduce((sum, s) => sum + s.duration, 0), [scenes]);

  const handleRender = () => {
    setRenderState("queued");
    window.setTimeout(() => setRenderState("processing"), 800);
    window.setTimeout(() => setRenderState("done"), 2600);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Create"
        title="Video Studio"
        description="Assemble short-form cuts, captions and renders on a single timeline."
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* INPUT + AI PANEL */}
        <div className="space-y-6">
          <Panel title="Source & format">
            <div className="space-y-5">
              <Field label="Script">
                <Select value={scriptChoice} onValueChange={setScriptChoice}>
                  <SelectTrigger className="h-9 bg-surface-2 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockScripts.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Or paste a script" hint="Overrides the script selector above">
                <Textarea
                  value={pastedScript}
                  onChange={(e) => setPastedScript(e.target.value)}
                  placeholder="Paste script text…"
                  className="min-h-[70px] bg-surface-2 text-[13px]"
                />
              </Field>
              <Field label="Video type">
                <Select value={videoType} onValueChange={setVideoType}>
                  <SelectTrigger className="h-9 bg-surface-2 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {videoTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Platform">
                <PlatformPicker value={platformId} onChange={handlePlatformChange} />
              </Field>
              <Field label="Aspect ratio">
                <ChipGroup options={platform.aspectRatios} value={aspectRatio} onChange={setAspectRatio} />
              </Field>
              <Field label="Duration">
                <ChipGroup options={platform.durations} value={duration} onChange={setDuration} />
              </Field>
              <Field label="Visual style">
                <ChipGroup options={visualStyles} value={visualStyle} onChange={setVisualStyle} />
              </Field>
            </div>
          </Panel>

          <Panel title="AI assist">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
                  <span className="flex items-center gap-2 text-[12px] text-text-muted">
                    <Mic className="size-3.5" /> Voiceover
                  </span>
                  <Switch checked={voiceoverOn} onCheckedChange={setVoiceoverOn} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
                  <span className="flex items-center gap-2 text-[12px] text-text-muted">
                    <Captions className="size-3.5" /> Auto captions
                  </span>
                  <Switch checked={captionsOn} onCheckedChange={setCaptionsOn} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
                  <span className="flex items-center gap-2 text-[12px] text-text-muted">
                    <Music className="size-3.5" /> Music
                  </span>
                  <Switch checked={musicOn} onCheckedChange={setMusicOn} />
                </div>
              </div>

              {generating ? (
                <GeneratingState label="Breaking script into scenes" />
              ) : (
                <Button className="w-full" onClick={handleGenerateBreakdown}>
                  <Sparkles className="size-3.5" />
                  Generate scene breakdown
                </Button>
              )}
              <div className="flex justify-end">
                <CostHint credits={12} />
              </div>

              {hasBreakdown ? (
                <div className="space-y-3 border-t border-border-subtle pt-4">
                  <SectionLabel>Media suggestions</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {mediaSuggestions.map((m) => (
                      <span
                        key={m}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-text-muted"
                      >
                        <Film className="size-3" />
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Panel>
        </div>

        {/* EDITOR COLUMN */}
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <Panel title="Preview">
              <div
                className={
                  "relative mx-auto flex items-center justify-center rounded-xl border border-border-subtle bg-surface-2 " +
                  (aspectRatio === "9:16"
                    ? "aspect-9/16 max-h-[420px]"
                    : aspectRatio === "1:1" || aspectRatio === "4:5"
                      ? "aspect-square max-h-[420px]"
                      : "aspect-video w-full")
                }
              >
                <button
                  type="button"
                  onClick={() => setPlaying((p) => !p)}
                  className="grid size-12 place-items-center rounded-full border border-border bg-surface text-foreground transition-colors duration-150 hover:border-accent-brand/40"
                >
                  <Play className="size-5" fill={playing ? "currentColor" : "none"} />
                </button>
                <span className="absolute bottom-3 left-3 font-mono text-[10px] text-text-subtle">
                  {aspectRatio} · {selectedScene?.title ?? "No scene"}
                </span>
              </div>
            </Panel>

            <Panel title="Selected scene">
              {hasBreakdown ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{selectedScene.title}</p>
                    <p className="mt-1 font-mono text-[11px] text-text-subtle">
                      {selectedScene.duration}s · {selectedScene.suggestion}
                    </p>
                  </div>
                  <Field label="Caption">
                    <Textarea
                      value={selectedScene.caption}
                      onChange={(e) => updateCaption(selectedScene.id, e.target.value)}
                      className="min-h-[70px] bg-surface-2 text-[13px]"
                    />
                  </Field>
                  <Field label="Voiceover">
                    <div className="flex gap-2">
                      <Select value={voice} onValueChange={setVoice}>
                        <SelectTrigger className="h-9 bg-surface-2 text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {voices.map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" disabled>
                        Preview voice
                      </Button>
                    </div>
                  </Field>
                  <Field label={`Music — ${volume[0]}%`}>
                    <Select value={musicTrack} onValueChange={setMusicTrack}>
                      <SelectTrigger className="h-9 bg-surface-2 text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {musicTracks.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Slider className="mt-2" value={volume} onValueChange={setVolume} max={100} step={5} />
                  </Field>
                </div>
              ) : (
                <p className="text-[12px] leading-relaxed text-text-subtle">
                  Generate a scene breakdown to edit captions, voiceover and music per scene.
                </p>
              )}
            </Panel>
          </div>

          {hasBreakdown ? (
            <Panel title="Scenes">
              <div className="space-y-2">
                {scenes.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSceneId(s.id)}
                    className={
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors duration-150 " +
                      (selectedSceneId === s.id
                        ? "border-accent-brand/50 bg-surface-2"
                        : "border-border bg-surface hover:border-accent-brand/30")
                    }
                  >
                    <div className="grid size-12 shrink-0 place-items-center rounded-md bg-surface-3/70">
                      <ImageIcon className="size-4 text-text-subtle" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-foreground">{s.title}</p>
                      <p className="truncate text-[11px] text-text-subtle">{s.caption}</p>
                    </div>
                    <span className="font-mono text-[11px] text-text-subtle">{s.duration}s</span>
                    <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => moveScene(i, -1)}
                        disabled={i === 0}
                        className="grid size-5 place-items-center rounded border border-border text-text-subtle disabled:opacity-30"
                      >
                        <ArrowUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveScene(i, 1)}
                        disabled={i === scenes.length - 1}
                        className="grid size-5 place-items-center rounded border border-border text-text-subtle disabled:opacity-30"
                      >
                        <ArrowDown className="size-3" />
                      </button>
                    </div>
                  </button>
                ))}
              </div>

              {/* Timeline strip */}
              <div className="mt-5 space-y-2">
                <SectionLabel aside={<span className="font-mono text-[11px] text-text-subtle">Total {totalDuration}s</span>}>
                  Timeline
                </SectionLabel>
                <div className="flex h-8 w-full gap-0.5 overflow-hidden rounded-md border border-border">
                  {scenes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSceneId(s.id)}
                      style={{ flexGrow: s.duration }}
                      className={
                        "h-full min-w-[8px] transition-colors duration-150 " +
                        (selectedSceneId === s.id ? "bg-accent-brand/60" : "bg-surface-3/80 hover:bg-surface-3")
                      }
                      title={`${s.title} · ${s.duration}s`}
                    />
                  ))}
                </div>
              </div>
            </Panel>
          ) : null}

          {/* OUTPUT FOOTER */}
          <Panel title="Output" bodyClassName="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm">
                <Play className="size-3.5" />
                Preview
              </Button>
              <Button size="sm" onClick={handleRender} disabled={renderState === "queued" || renderState === "processing"}>
                {renderState === "queued" || renderState === "processing" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                {renderState === "queued" ? "Queued…" : renderState === "processing" ? "Rendering…" : "Generate / render"}
              </Button>
              <Button variant="outline" size="sm">
                <Save className="size-3.5" />
                Save to Project
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="size-3.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>MP4 (source aspect)</DropdownMenuItem>
                  <DropdownMenuItem>MP4 (all platform sizes)</DropdownMenuItem>
                  <DropdownMenuItem>Captions (.srt)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2">
              {renderState === "done" ? <StatusPill tone="success">Render ready</StatusPill> : null}
              {renderState === "processing" ? <StatusPill tone="accent">Processing</StatusPill> : null}
              {renderState === "queued" ? <StatusPill tone="warning">Queued</StatusPill> : null}
              <CostHint credits={22} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ImageIcon,
  UploadCloud,
  RefreshCw,
  Undo2,
  Redo2,
  Crop,
  Maximize2,
  Download,
  ChevronDown,
  Video,
  FileText,
  CalendarDays,
  Columns2,
} from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/app/primitives";
import {
  Panel,
  Field,
  ChipGroup,
  PlatformPicker,
  usePlatform,
  RecommendedBadge,
  OptionCard,
  ContextActions,
  CostHint,
  GeneratingState,
  WireLine,
} from "@/components/app/studio-kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/thumbnail-studio")({
  head: () => ({
    meta: [
      { title: "Thumbnail Studio — CreatorOS AI" },
      { name: "description", content: "Compose click-worthy frames from layout presets, typography and generated imagery." },
      { property: "og:title", content: "Thumbnail Studio — CreatorOS AI" },
      { property: "og:description", content: "Compose click-worthy frames from layout presets, typography and generated imagery." },
    ],
  }),
  component: ThumbnailStudioPage,
});

const styles = ["Bold text", "Cinematic", "Minimal", "Face-forward", "Documentary"];
const positions = ["TL", "TC", "TR", "ML", "MC", "MR", "BL", "BC", "BR"] as const;
type Position = (typeof positions)[number];

type Variation = {
  id: string;
  label: string;
  recommended: boolean;
  rationale: string;
};

function aspectClass(ratio: string) {
  if (ratio === "9:16") return "aspect-[9/16]";
  if (ratio === "1:1") return "aspect-square";
  if (ratio === "4:5") return "aspect-[4/5]";
  return "aspect-video";
}

function ThumbnailFrame({
  ratio,
  className,
  overlay,
  fontSize,
  position,
}: {
  ratio: string;
  className?: string;
  overlay?: string;
  fontSize?: number;
  position?: Position;
}) {
  const posClass: Record<Position, string> = {
    TL: "items-start justify-start text-left",
    TC: "items-start justify-center text-center",
    TR: "items-start justify-end text-right",
    ML: "items-center justify-start text-left",
    MC: "items-center justify-center text-center",
    MR: "items-center justify-end text-right",
    BL: "items-end justify-start text-left",
    BC: "items-end justify-center text-center",
    BR: "items-end justify-end text-right",
  };
  return (
    <div
      className={cn(
        "relative flex w-full overflow-hidden rounded-lg border border-border bg-surface-2",
        aspectClass(ratio),
        posClass[position ?? "BC"],
        className,
      )}
    >
      <ImageIcon className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-text-subtle/50" />
      {overlay ? (
        <span
          className="relative z-10 m-3 max-w-full break-words font-medium leading-tight text-foreground drop-shadow"
          style={{ fontSize: `${fontSize ?? 20}px` }}
        >
          {overlay}
        </span>
      ) : null}
    </div>
  );
}

function ThumbnailStudioPage() {
  const { id, setId, platform } = usePlatform("youtube");
  const [topic, setTopic] = useState("");
  const [ratio, setRatio] = useState((platform.aspectRatios[0] ?? "16:9"));
  const [style, setStyle] = useState(styles[0] ?? "Bold text");
  const [status, setStatus] = useState<"idle" | "generating" | "done">("idle");
  const [variations, setVariations] = useState<Variation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const [overlay, setOverlay] = useState("");
  const [fontSize, setFontSize] = useState(22);
  const [position, setPosition] = useState<Position>("BC");
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);

  function generate() {
    setStatus("generating");
    setVariations([]);
    setSelected(null);
    window.setTimeout(() => {
      const letters = ["A", "B", "C", "D"];
      const vs: Variation[] = letters.map((l, i) => ({
        id: l,
        label: `Variation ${l}`,
        recommended: i === 0,
        rationale:
          i === 0
            ? "High-contrast face + bold text tests best for CTR on this topic."
            : "Alternative composition generated from the same prompt.",
      }));
      setVariations(vs);
      setStatus("done");
    }, 1200);
  }

  function regenerate(vid: string) {
    setVariations((vs) => vs.map((v) => (v.id === vid ? { ...v } : v)));
  }

  function pushHistory(prevOverlay: string) {
    setHistory((h) => [...h, prevOverlay]);
    setFuture([]);
  }

  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [overlay, ...f]);
      setOverlay(prev ?? overlay);
      return h.slice(0, -1);
    });
  }

  function redo() {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setHistory((h) => [...h, overlay]);
      setOverlay(next ?? overlay);
      return f.slice(1);
    });
  }

  const selectedVariation = variations.find((v) => v.id === selected);
  const compareVariations = useMemo(
    () => variations.filter((v) => compareIds.includes(v.id)),
    [variations, compareIds],
  );

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Create"
        title="Thumbnail Studio"
        description="Compose click-worthy frames from layout presets, typography and generated imagery."
      />

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title="Input">
          <div className="space-y-5">
            <Field label="Topic / title">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. I tried the $1 vs $1000 setup"
              />
            </Field>
            <Field label="Platform">
              <PlatformPicker value={id} onChange={setId} />
            </Field>
            <Field label="Aspect ratio">
              <ChipGroup options={platform.aspectRatios} value={ratio} onChange={setRatio} />
            </Field>
            <Field label="Style">
              <ChipGroup options={styles} value={style} onChange={setStyle} />
            </Field>
            <Field label="Reference image" hint="Optional — used as a visual anchor.">
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-2/60 px-4 py-8 text-center opacity-70">
                <UploadCloud className="size-5 text-text-subtle" />
                <p className="text-[12px] text-text-subtle">
                  Drag an image or browse
                </p>
              </div>
            </Field>
            <div className="flex items-center justify-between pt-1">
              <CostHint credits={6} />
              <Button size="sm" onClick={generate} disabled={status === "generating"}>
                {status === "generating" ? "Generating…" : "Generate 4 variations"}
              </Button>
            </div>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel
            title="Results"
            aside={
              variations.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setCompare((c) => !c);
                    setCompareIds([]);
                  }}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors",
                    compare
                      ? "border-accent-brand/40 bg-accent-tint text-accent-brand"
                      : "border-border bg-surface-2 text-text-muted",
                  )}
                >
                  <Columns2 className="size-3" />
                  Compare
                </button>
              ) : null
            }
          >
            {status === "idle" && variations.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-text-subtle">
                Generate to see four thumbnail variations here.
              </p>
            ) : status === "generating" ? (
              <div className="space-y-4">
                <GeneratingState label="Rendering variations" />
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <WireLine key={i} className={cn("w-full", aspectClass(ratio))} />
                  ))}
                </div>
              </div>
            ) : compare ? (
              <div className="space-y-4">
                <p className="text-[12px] text-text-subtle">
                  Select two variations below to compare side by side.
                </p>
                <div className="flex flex-wrap gap-2">
                  {variations.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() =>
                        setCompareIds((ids) =>
                          ids.includes(v.id)
                            ? ids.filter((i) => i !== v.id)
                            : ids.length < 2
                              ? [...ids, v.id]
                              : [ids[1] ?? v.id, v.id],
                        )
                      }
                      className={cn(
                        "h-8 rounded-lg border px-2.5 text-[12px]",
                        compareIds.includes(v.id)
                          ? "border-accent-brand/40 bg-accent-tint text-foreground"
                          : "border-border bg-surface-2 text-text-muted",
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {compareVariations.length === 2 ? (
                    compareVariations.map((v) => (
                      <div key={v.id} className="space-y-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                          {v.label}
                        </p>
                        <ThumbnailFrame ratio={ratio} />
                      </div>
                    ))
                  ) : (
                    <p className="col-span-2 py-6 text-center text-[12px] text-text-subtle">
                      Pick two variations to compare.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {variations.map((v) => (
                  <OptionCard
                    key={v.id}
                    label={v.label}
                    recommended={v.recommended}
                    selected={selected === v.id}
                    onSelect={() => setSelected(v.id)}
                    meta={v.rationale}
                    footer={
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          regenerate(v.id);
                        }}
                      >
                        <RefreshCw className="size-3.5" />
                        Regenerate variation
                      </Button>
                    }
                  >
                    <ThumbnailFrame ratio={ratio} className="mt-1" />
                  </OptionCard>
                ))}
              </div>
            )}
          </Panel>

          {selectedVariation ? (
            <Panel title="Basic editor">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="space-y-5">
                  <Field label="Text overlay">
                    <Input
                      value={overlay}
                      onChange={(e) => {
                        pushHistory(overlay);
                        setOverlay(e.target.value);
                      }}
                      placeholder="Add a headline over the frame"
                    />
                  </Field>
                  <Field label={`Font size — ${fontSize}px`}>
                    <Slider
                      value={[fontSize]}
                      min={12}
                      max={48}
                      step={1}
                      onValueChange={([v]) => setFontSize(v ?? fontSize)}
                    />
                  </Field>
                  <Field label="Text position">
                    <div className="grid w-32 grid-cols-3 gap-1.5">
                      {positions.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPosition(p)}
                          className={cn(
                            "size-9 rounded-md border",
                            position === p
                              ? "border-accent-brand/40 bg-accent-tint"
                              : "border-border bg-surface-2",
                          )}
                          aria-label={`Position ${p}`}
                        />
                      ))}
                    </div>
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label={`Image X — ${posX}%`}>
                      <Slider value={[posX]} min={0} max={100} onValueChange={([v]) => setPosX(v ?? posX)} />
                    </Field>
                    <Field label={`Image Y — ${posY}%`}>
                      <Slider value={[posY]} min={0} max={100} onValueChange={([v]) => setPosY(v ?? posY)} />
                    </Field>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Crop className="size-3.5" />
                          Crop
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-44 space-y-1">
                        {["16:9", "1:1", "9:16", "4:5"].map((p) => (
                          <button
                            key={p}
                            className="block w-full rounded-md px-2 py-1.5 text-left text-[12px] text-text-muted hover:bg-surface-2 hover:text-foreground"
                          >
                            {p}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Maximize2 className="size-3.5" />
                          Resize
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-44 space-y-1">
                        {["1280×720", "1920×1080", "1080×1080"].map((p) => (
                          <button
                            key={p}
                            className="block w-full rounded-md px-2 py-1.5 text-left text-[12px] text-text-muted hover:bg-surface-2 hover:text-foreground"
                          >
                            {p}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                    <Button size="sm" variant="outline" onClick={undo} disabled={history.length === 0}>
                      <Undo2 className="size-3.5" />
                      Undo
                    </Button>
                    <Button size="sm" variant="outline" onClick={redo} disabled={future.length === 0}>
                      <Redo2 className="size-3.5" />
                      Redo
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                    Live preview
                  </p>
                  <ThumbnailFrame
                    ratio={ratio}
                    overlay={overlay}
                    fontSize={fontSize}
                    position={position}
                  />
                </div>
              </div>
            </Panel>
          ) : null}

          {selectedVariation ? (
            <Panel title="Output" bodyClassName="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm">Select final</Button>
                <Button size="sm" variant="outline">
                  Save to project
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Download className="size-3.5" />
                      Export
                      <ChevronDown className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>PNG 1280×720</DropdownMenuItem>
                    <DropdownMenuItem>JPG</DropdownMenuItem>
                    <DropdownMenuItem>All sizes</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <SectionLabel>Next</SectionLabel>
              <ContextActions
                actions={[
                  { label: "Use in Video Studio", icon: Video },
                  { label: "Attach to script", icon: FileText },
                  { label: "Add to planner", icon: CalendarDays },
                ]}
              />
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  UploadCloud,
  RefreshCw,
  Copy,
  Download,
  ChevronDown,
  Video,
  FolderKanban,
  Image as ImageIcon,
  Wand2,
  Eraser,
  RotateCcw,
} from "lucide-react";
import { PageHeader, SectionLabel, EmptyState } from "@/components/app/primitives";
import {
  Panel,
  Field,
  ChipGroup,
  PlatformPicker,
  usePlatform,
  OptionCard,
  ContextActions,
  CostHint,
  GeneratingState,
  WireLine,
} from "@/components/app/studio-kit";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/image-studio")({
  head: () => ({
    meta: [
      { title: "Image Studio — CreatorOS AI" },
      { name: "description", content: "Generate and iterate on brand-consistent imagery, covers and social assets." },
      { property: "og:title", content: "Image Studio — CreatorOS AI" },
      { property: "og:description", content: "Generate and iterate on brand-consistent imagery, covers and social assets." },
    ],
  }),
  component: ImageStudioPage,
});

const useCases = ["Post", "Story", "Blog header", "Cover art", "B-roll frame"];
const styles = ["Photoreal", "Illustration", "3D render", "Editorial", "Graphic"];
const counts = [1, 2, 4] as const;

type Img = { id: string; recommended?: boolean };

function aspectClass(ratio: string) {
  if (ratio === "9:16") return "aspect-[9/16]";
  if (ratio === "1:1") return "aspect-square";
  if (ratio === "4:5") return "aspect-[4/5]";
  return "aspect-video";
}

function ImageFrame({ ratio, className }: { ratio: string; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2",
        aspectClass(ratio),
        className,
      )}
    >
      <ImageIcon className="size-8 text-text-subtle/50" />
    </div>
  );
}

function ImageStudioPage() {
  const navigate = useNavigate();
  const { id, setId, platform } = usePlatform("instagram");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [useCase, setUseCase] = useState(useCases[0]);
  const [ratio, setRatio] = useState(platform.aspectRatios[0]);
  const [style, setStyle] = useState(styles[0]);
  const [refStrength, setRefStrength] = useState(50);
  const [count, setCount] = useState<(typeof counts)[number]>(4);

  const [status, setStatus] = useState<"idle" | "generating" | "done">("idle");
  const [images, setImages] = useState<Img[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1350);
  const [lockAspect, setLockAspect] = useState(true);
  const [exposure, setExposure] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [warmth, setWarmth] = useState(0);
  const [bgState, setBgState] = useState<"idle" | "processing" | "done">("idle");

  function generate() {
    setStatus("generating");
    setImages([]);
    setSelected(null);
    window.setTimeout(() => {
      const imgs: Img[] = Array.from({ length: count }).map((_, i) => ({
        id: `img-${i + 1}`,
        recommended: i === 0,
      }));
      setImages(imgs);
      setStatus("done");
    }, 1200);
  }

  function removeBackground() {
    setBgState("processing");
    window.setTimeout(() => setBgState("done"), 1000);
  }

  function resetAdjustments() {
    setExposure(0);
    setContrast(0);
    setSaturation(0);
    setWarmth(0);
  }

  const selectedImage = images.find((i) => i.id === selected);
  const compareImages = images.filter((i) => compareIds.includes(i.id));

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Create"
        title="Image Studio"
        description="Generate and iterate on brand-consistent imagery, covers and social assets."
      />

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title="Input">
          <div className="space-y-5">
            <Field label="Prompt">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate…"
                rows={4}
              />
            </Field>
            <Accordion type="single" collapsible>
              <AccordionItem value="negative" className="border-border-subtle">
                <AccordionTrigger className="text-[12px] text-text-muted hover:no-underline">
                  Negative prompt (optional)
                </AccordionTrigger>
                <AccordionContent>
                  <Textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Things to avoid — text, watermarks, extra limbs…"
                    rows={3}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <Field label="Platform">
              <PlatformPicker value={id} onChange={setId} />
            </Field>
            <Field label="Use case">
              <ChipGroup options={useCases} value={useCase} onChange={setUseCase} />
            </Field>
            <Field label="Aspect ratio">
              <ChipGroup options={platform.aspectRatios} value={ratio} onChange={setRatio} />
            </Field>
            <Field label="Style">
              <ChipGroup options={styles} value={style} onChange={setStyle} />
            </Field>
            <Field label="Reference image" hint="Optional visual anchor for the generation.">
              <div className="space-y-3">
                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface-2/60 px-4 py-8 text-center opacity-70">
                  <UploadCloud className="size-5 text-text-subtle" />
                  <p className="text-[12px] text-text-subtle">Drag an image or browse</p>
                </div>
                <Field label={`Reference strength — ${refStrength}%`}>
                  <Slider value={[refStrength]} min={0} max={100} onValueChange={([v]) => setRefStrength(v)} />
                </Field>
              </div>
            </Field>
            <Field label="Variations">
              <ChipGroup
                options={counts.map(String)}
                value={String(count)}
                onChange={(v) => setCount(Number(v) as (typeof counts)[number])}
              />
            </Field>
            <div className="flex items-center justify-between pt-1">
              <CostHint credits={count * 3} />
              <Button size="sm" onClick={generate} disabled={status === "generating"}>
                {status === "generating" ? "Generating…" : "Generate"}
              </Button>
            </div>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel
            title="Results"
            aside={
              images.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setCompare((c) => !c);
                    setCompareIds([]);
                  }}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-md border px-2 font-mono text-[10px] uppercase tracking-[0.1em]",
                    compare
                      ? "border-accent-brand/40 bg-accent-tint text-accent-brand"
                      : "border-border bg-surface-2 text-text-muted",
                  )}
                >
                  Compare
                </button>
              ) : null
            }
          >
            {status === "idle" && images.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No images generated yet"
                description="Write a prompt, choose a style and aspect ratio, then generate to fill this gallery."
              />
            ) : status === "generating" ? (
              <div className="space-y-4">
                <GeneratingState label="Generating images" />
                <div className={cn("grid gap-4", count === 1 ? "grid-cols-1" : "grid-cols-2")}>
                  {Array.from({ length: count }).map((_, i) => (
                    <WireLine key={i} className={cn("w-full", aspectClass(ratio))} />
                  ))}
                </div>
              </div>
            ) : compare ? (
              <div className="space-y-4">
                <p className="text-[12px] text-text-subtle">Select two images to compare side by side.</p>
                <div className="flex flex-wrap gap-2">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() =>
                        setCompareIds((ids) =>
                          ids.includes(img.id)
                            ? ids.filter((x) => x !== img.id)
                            : ids.length < 2
                              ? [...ids, img.id]
                              : [ids[1], img.id],
                        )
                      }
                      className={cn(
                        "h-8 rounded-lg border px-2.5 text-[12px]",
                        compareIds.includes(img.id)
                          ? "border-accent-brand/40 bg-accent-tint text-foreground"
                          : "border-border bg-surface-2 text-text-muted",
                      )}
                    >
                      Image {i + 1}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {compareImages.length === 2 ? (
                    compareImages.map((img) => (
                      <ImageFrame key={img.id} ratio={ratio} />
                    ))
                  ) : (
                    <p className="col-span-2 py-6 text-center text-[12px] text-text-subtle">
                      Pick two images to compare.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className={cn("grid gap-4", count === 1 ? "grid-cols-1" : "grid-cols-2")}>
                {images.map((img, i) => (
                  <OptionCard
                    key={img.id}
                    label={`Image ${i + 1}`}
                    recommended={img.recommended}
                    selected={selected === img.id}
                    onSelect={() => setSelected(img.id)}
                    footer={
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={(e) => e.stopPropagation()}>
                          <RefreshCw className="size-3.5" />
                          Regenerate
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={(e) => e.stopPropagation()}>
                          <Copy className="size-3.5" />
                          Create variation
                        </Button>
                      </div>
                    }
                  >
                    <ImageFrame ratio={ratio} className="mt-1" />
                  </OptionCard>
                ))}
              </div>
            )}
          </Panel>

          {selectedImage ? (
            <Panel title="Basic editing">
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="space-y-5">
                  <Field label="Crop presets">
                    <ChipGroup options={["16:9", "1:1", "9:16", "4:5"]} value={ratio} onChange={setRatio} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Width">
                      <Input
                        type="number"
                        value={width}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setWidth(v);
                          if (lockAspect) setHeight(Math.round((v * 5) / 4));
                        }}
                      />
                    </Field>
                    <Field label="Height">
                      <Input
                        type="number"
                        value={height}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setHeight(v);
                          if (lockAspect) setWidth(Math.round((v * 4) / 5));
                        }}
                      />
                    </Field>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2">
                    <span className="text-[12px] text-text-muted">Lock aspect ratio</span>
                    <Switch checked={lockAspect} onCheckedChange={setLockAspect} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label={`Exposure — ${exposure}`}>
                      <Slider value={[exposure]} min={-50} max={50} onValueChange={([v]) => setExposure(v)} />
                    </Field>
                    <Field label={`Contrast — ${contrast}`}>
                      <Slider value={[contrast]} min={-50} max={50} onValueChange={([v]) => setContrast(v)} />
                    </Field>
                    <Field label={`Saturation — ${saturation}`}>
                      <Slider value={[saturation]} min={-50} max={50} onValueChange={([v]) => setSaturation(v)} />
                    </Field>
                    <Field label={`Warmth — ${warmth}`}>
                      <Slider value={[warmth]} min={-50} max={50} onValueChange={([v]) => setWarmth(v)} />
                    </Field>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="outline" onClick={resetAdjustments}>
                      <RotateCcw className="size-3.5" />
                      Reset
                    </Button>
                    <Button size="sm" variant="outline" onClick={removeBackground} disabled={bgState === "processing"}>
                      <Eraser className="size-3.5" />
                      {bgState === "processing" ? "Processing…" : "Remove background"}
                    </Button>
                    {bgState === "done" ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle">
                        Placeholder — connects later
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                    Preview
                  </p>
                  <ImageFrame ratio={ratio} />
                </div>
              </div>
            </Panel>
          ) : null}

          {selectedImage ? (
            <Panel title="Output" bodyClassName="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm">Select</Button>
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
                    <DropdownMenuItem>PNG</DropdownMenuItem>
                    <DropdownMenuItem>JPG</DropdownMenuItem>
                    <DropdownMenuItem>WebP</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <SectionLabel>Next</SectionLabel>
              <ContextActions
                actions={[
                  { label: "Use as thumbnail", icon: Wand2, onClick: () => navigate({ to: "/thumbnail-studio" }) },
                  { label: "Use as project asset", icon: FolderKanban, onClick: () => navigate({ to: "/projects" }) },
                  { label: "Send to Video Studio", icon: Video, onClick: () => navigate({ to: "/video-studio" }) },
                ]}
              />
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

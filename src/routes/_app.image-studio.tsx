import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sparkles,
  UploadCloud,
  RefreshCw,
  Copy,
  Download,
  ChevronDown,
  FolderKanban,
  Image as ImageIcon,
  Wand2,
  Eraser,
  RotateCcw,
  X,
  Loader2,
  Expand,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  createImageVariationAction,
  generateImageAction,
  uploadReferenceImageAction,
} from "@/lib/server/ai/image-studio";
import { applyImageEdits, hasImageEdits } from "@/lib/image-edit-transforms";
import { ImageLightbox } from "@/components/app/image-lightbox";
import { listProjects } from "@/lib/server/projects";
import { linkAssetToProject } from "@/lib/server/project-content";
import { getGeneration } from "@/lib/server/ai/history";
import { getUserSettings } from "@/lib/server/settings";
import { getCreditBalance } from "@/lib/server/credits";
import { imageCost } from "@/lib/credits";
import { useSession } from "@/lib/auth-client";
import { platforms } from "@/lib/creator-data";
import { useDraftAutosave } from "@/lib/local-draft-storage";

const SETTINGS_QUERY_KEY = ["user-settings"] as const;

const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_REFERENCE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });
}

/** Same Cloudinary "force download" pattern already used by the Files module,
 * generalized to also apply a format conversion and target dimensions via
 * Cloudinary's own URL transforms -- no new backend needed. */
function toExportUrl(url: string, opts: { format: string; width: number; height: number }): string {
  const transform = `f_${opts.format},w_${opts.width},h_${opts.height},c_fill,fl_attachment`;
  return url.replace("/upload/", `/upload/${transform}/`);
}

export const Route = createFileRoute("/_app/image-studio")({
  validateSearch: (search: Record<string, unknown>): { reedit?: string } => ({
    ...(typeof search["reedit"] === "string" ? { reedit: search["reedit"] } : {}),
  }),
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

type Img = { id: string; recommended: boolean; url: string };

interface ImageStudioDraft {
  prompt: string;
  negativePrompt: string;
  overlayText: string;
  platformId: string;
  useCase: string;
  ratio: string;
  style: string;
  count: (typeof counts)[number];
  referenceImageUrl: string | null;
  referencePreview: string | null;
}

function aspectClass(ratio: string) {
  if (ratio === "9:16") return "aspect-[9/16]";
  if (ratio === "1:1") return "aspect-square";
  if (ratio === "4:5") return "aspect-[4/5]";
  return "aspect-video";
}

function ImageFrame({
  ratio,
  className,
  url,
  filter,
  onLoad,
  loading,
  onExpand,
}: {
  ratio: string;
  className?: string;
  url?: string;
  filter?: string;
  onLoad?: () => void;
  loading?: boolean;
  onExpand?: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-2",
        aspectClass(ratio),
        className,
      )}
    >
      {url ? (
        <img
          src={url}
          alt=""
          className="size-full object-cover"
          style={filter ? { filter } : undefined}
          onLoad={onLoad}
          onError={onLoad}
        />
      ) : (
        <ImageIcon className="size-8 text-text-subtle/50" />
      )}
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="size-5 animate-spin text-white" />
        </div>
      ) : null}
      {url && onExpand ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          aria-label="View full size"
          className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-md bg-black/50 text-white opacity-0 transition-opacity duration-150 hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Expand className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function ImageStudioPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id, setId, platform } = usePlatform("instagram");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [overlayText, setOverlayText] = useState("");
  const [useCase, setUseCase] = useState(useCases[0] ?? "Post");
  const [ratio, setRatio] = useState((platform.aspectRatios[0] ?? "16:9"));
  const [style, setStyle] = useState(styles[0] ?? "Photoreal");
  const [count, setCount] = useState<(typeof counts)[number]>(4);

  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [referenceDragOver, setReferenceDragOver] = useState(false);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<"idle" | "generating" | "done">("idle");
  const [images, setImages] = useState<Img[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const [width, setWidth] = useState(1080);
  const [height, setHeight] = useState(1350);
  const [lockAspect, setLockAspect] = useState(true);
  const [exposure, setExposure] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [warmth, setWarmth] = useState(0);

  // Real, Cloudinary-rendered edits (unlike exposure/contrast/saturation/
  // warmth above, which are CSS-only preview and never touch the exported
  // file) -- these are baked into the actual URL used for both preview and
  // export/download. Reset per-selection below.
  const [shadows, setShadows] = useState(0);
  const [highlights, setHighlights] = useState(0);
  const [upscale, setUpscale] = useState(false);
  const [removeBackground, setRemoveBackground] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const { data: session } = useSession();
  const search = Route.useSearch();
  const getGenerationFn = useServerFn(getGeneration);
  const getUserSettingsFn = useServerFn(getUserSettings);
  const { data: settings } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => getUserSettingsFn(),
  });

  const getCreditBalanceFn = useServerFn(getCreditBalance);
  const { data: creditAccount } = useQuery({
    queryKey: ["credit-balance"],
    queryFn: () => getCreditBalanceFn(),
  });

  useEffect(() => {
    if (!search.reedit) return;
    getGenerationFn({ data: { generationId: search.reedit } })
      .then((gen) => {
        const input = gen.input as {
          prompt?: string;
          negativePrompt?: string;
          overlayText?: string;
          platform?: string;
          useCase?: string;
          aspectRatio?: string;
          style?: string;
          count?: number;
          referenceImageUrl?: string;
        } | null;
        if (!input) return;
        setPrompt(input.prompt ?? "");
        setNegativePrompt(input.negativePrompt ?? "");
        setOverlayText(input.overlayText ?? "");
        const matchedPlatform = platforms.find((p) => p.label === input.platform);
        if (matchedPlatform) setId(matchedPlatform.id);
        if (input.useCase) setUseCase(input.useCase);
        if (input.aspectRatio) setRatio(input.aspectRatio);
        if (input.style) setStyle(input.style);
        if (input.count && (counts as readonly number[]).includes(input.count)) {
          setCount(input.count as (typeof counts)[number]);
        }
        if (input.referenceImageUrl) {
          setReferenceImageUrl(input.referenceImageUrl);
          setReferencePreview(input.referenceImageUrl);
        }
        toast.success("Reopened your original generation.");
      })
      .catch(() => toast.error("Couldn't load that creation."));
    void navigate({ to: "/image-studio", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.reedit]);

  useDraftAutosave<ImageStudioDraft>({
    userId: session?.user?.id,
    feature: "image-studio",
    enabled: settings?.autosaveDrafts ?? true,
    value: {
      prompt,
      negativePrompt,
      overlayText,
      platformId: id,
      useCase,
      ratio,
      style,
      count,
      referenceImageUrl,
      referencePreview,
    },
    onRestore: (d) => {
      setPrompt(d.prompt ?? "");
      setNegativePrompt(d.negativePrompt ?? "");
      setOverlayText(d.overlayText ?? "");
      if (d.platformId) setId(d.platformId as typeof id);
      if (d.useCase) setUseCase(d.useCase);
      if (d.ratio) setRatio(d.ratio);
      if (d.style) setStyle(d.style);
      if (d.count) setCount(d.count);
      if (d.referenceImageUrl) setReferenceImageUrl(d.referenceImageUrl);
      if (d.referencePreview) setReferencePreview(d.referencePreview);
    },
  });

  const generateImageFn = useServerFn(generateImageAction);
  const createVariationFn = useServerFn(createImageVariationAction);
  const uploadReferenceImageFn = useServerFn(uploadReferenceImageAction);
  const listProjectsFn = useServerFn(listProjects);
  const linkAssetToProjectFn = useServerFn(linkAssetToProject);

  const { data: projectOptions = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjectsFn(),
  });

  const linkToProjectMutation = useMutation({
    mutationFn: (params: { assetId: string; projectId: string }) => linkAssetToProjectFn({ data: params }),
    onSuccess: (_result, variables) => {
      const project = projectOptions.find((p) => p.id === variables.projectId);
      toast.success(project ? `Added to ${project.name}` : "Added to project");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't add this image to the project.");
    },
  });

  async function handleReferenceFile(file: File) {
    if (!ALLOWED_REFERENCE_MIME_TYPES.has(file.type)) {
      toast.error("Reference image must be JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
      toast.error("Reference image must be 8MB or smaller.");
      return;
    }
    const localPreview = URL.createObjectURL(file);
    setReferencePreview(localPreview);
    setReferenceUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const result = await uploadReferenceImageFn({ data: { dataUrl, mimeType: file.type } });
      setReferenceImageUrl(result.url);
    } catch {
      toast.error("Couldn't upload that reference image. Try again.");
      setReferencePreview(null);
    } finally {
      setReferenceUploading(false);
    }
  }

  function clearReferenceImage() {
    if (referencePreview) URL.revokeObjectURL(referencePreview);
    setReferencePreview(null);
    setReferenceImageUrl(null);
  }

  const generateMutation = useMutation({
    mutationFn: () =>
      generateImageFn({
        data: {
          prompt: prompt.trim(),
          count,
          aspectRatio: ratio,
          ...(style ? { style } : {}),
          ...(useCase ? { useCase } : {}),
          platform: platform.label,
          ...(referenceImageUrl ? { referenceImageUrl } : {}),
          ...(overlayText.trim() ? { overlayText: overlayText.trim() } : {}),
        },
      }),
    onSuccess: (result) => {
      setImages(result.assets.map((a) => ({ id: a.id, recommended: a.recommended, url: a.url })));
      setStatus("done");
      queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't generate images. Try again.");
      setStatus("idle");
    },
  });

  const variationMutation = useMutation({
    mutationFn: (sourceAssetId: string) =>
      createVariationFn({
        data: {
          sourceAssetId,
          aspectRatio: ratio,
          count: 1,
          ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
        },
      }),
    onSuccess: (result) => {
      setImages(result.assets.map((a) => ({ id: a.id, recommended: a.recommended, url: a.url })));
      setStatus("done");
      queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't create a variation. Try again.");
      setStatus("done");
    },
  });

  function generate() {
    setStatus("generating");
    setImages([]);
    setSelected(null);
    generateMutation.mutate();
  }

  function createVariation(sourceAssetId: string) {
    setStatus("generating");
    setSelected(null);
    variationMutation.mutate(sourceAssetId);
  }

  function resetAdjustments() {
    setExposure(0);
    setContrast(0);
    setSaturation(0);
    setWarmth(0);
    setShadows(0);
    setHighlights(0);
    setUpscale(false);
    setRemoveBackground(false);
  }

  // Edits are per-image -- switching selection (a new generation, or picking
  // a different variant) starts from a clean slate rather than silently
  // carrying over the previous image's shadows/highlights/upscale state.
  useEffect(() => {
    setShadows(0);
    setHighlights(0);
    setUpscale(false);
    setRemoveBackground(false);
  }, [selected]);

  const selectedImage = images.find((i) => i.id === selected);
  const compareImages = images.filter((i) => compareIds.includes(i.id));
  const editedImageUrl = selectedImage
    ? applyImageEdits(selectedImage.url, { shadows, highlights, upscale, removeBackground })
    : undefined;

  useEffect(() => {
    if (!selectedImage || !editedImageUrl) return;
    setEditLoading(editedImageUrl !== selectedImage.url);
  }, [editedImageUrl, selectedImage]);

  // Live preview only (CSS filters on the on-screen frame) -- there's no
  // server-side image processing here, so this doesn't affect the exported
  // file. Real, visible feedback for the sliders rather than controls that
  // silently do nothing.
  const previewFilter = [
    `brightness(${1 + exposure / 100})`,
    `contrast(${1 + contrast / 100})`,
    `saturate(${1 + saturation / 100})`,
    warmth !== 0 ? `sepia(${Math.min(100, Math.abs(warmth))}%)` : "",
    warmth < 0 ? `hue-rotate(${warmth}deg)` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Create"
        title="Image Studio"
        description="Generate and iterate on brand-consistent imagery, covers and social assets."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
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
            <Field label="Exact text to overlay (optional)">
              <Input
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                placeholder="e.g. SALE 50% OFF"
                maxLength={120}
              />
              <p className="mt-1.5 text-[11px] leading-relaxed text-text-subtle">
                Rendered as crisp real text over the image instead of leaving it to the AI, which
                often draws text inaccurately.
              </p>
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
              <input
                ref={referenceInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleReferenceFile(file);
                  e.target.value = "";
                }}
              />
              {referencePreview ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/60 p-2.5">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-surface-3">
                    <img src={referencePreview} alt="" className="size-full object-cover" />
                    {referenceUploading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="size-4 animate-spin text-white" />
                      </div>
                    ) : null}
                  </div>
                  <p className="flex-1 text-[12px] text-text-muted">
                    {referenceUploading ? "Uploading…" : "Reference image ready"}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={clearReferenceImage}
                    aria-label="Remove reference image"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => referenceInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      referenceInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setReferenceDragOver(true);
                  }}
                  onDragLeave={() => setReferenceDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setReferenceDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) void handleReferenceFile(file);
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors duration-150",
                    referenceDragOver
                      ? "border-accent-brand/60 bg-accent-tint"
                      : "border-border bg-surface-2/60 hover:border-accent-brand/40",
                  )}
                >
                  <UploadCloud className="size-5 text-text-subtle" />
                  <p className="text-[12px] text-text-subtle">Drag an image or browse</p>
                  <p className="text-[10px] text-text-subtle/70">JPEG, PNG or WebP, up to 8MB</p>
                </div>
              )}
            </Field>
            <Field label="Variations">
              <ChipGroup
                options={counts.map(String)}
                value={String(count)}
                onChange={(v) => setCount(Number(v) as (typeof counts)[number])}
              />
            </Field>
            <div className="flex items-center justify-between pt-1">
              <CostHint credits={imageCost(count)} balance={creditAccount?.balance} />
              <Button
                size="sm"
                onClick={generate}
                disabled={
                  status === "generating" ||
                  !prompt.trim() ||
                  (creditAccount ? creditAccount.balance < imageCost(count) : false)
                }
              >
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
                              : [ids[1] ?? img.id, img.id],
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
                      <ImageFrame key={img.id} ratio={ratio} url={img.url} />
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
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={creditAccount ? creditAccount.balance < imageCost(count) : false}
                          onClick={(e) => {
                            e.stopPropagation();
                            generate();
                          }}
                        >
                          <RefreshCw className="size-3.5" />
                          Regenerate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={creditAccount ? creditAccount.balance < imageCost(1) : false}
                          onClick={(e) => {
                            e.stopPropagation();
                            createVariation(img.id);
                          }}
                        >
                          <Copy className="size-3.5" />
                          Create variation
                        </Button>
                        <div className="text-center">
                          <CostHint credits={imageCost(1)} balance={creditAccount?.balance} />
                        </div>
                      </div>
                    }
                  >
                    <ImageFrame
                      ratio={ratio}
                      className="mt-1"
                      url={img.url}
                      onExpand={() => setLightboxUrl(img.url)}
                    />
                  </OptionCard>
                ))}
              </div>
            )}
          </Panel>

          {selectedImage ? (
            <Panel title="Basic editing" bodyClassName="space-y-6">
              <div className="max-w-xs space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                  Preview
                </p>
                <ImageFrame
                  ratio={ratio}
                  url={editedImageUrl ?? selectedImage.url}
                  filter={previewFilter}
                  loading={editLoading}
                  onLoad={() => setEditLoading(false)}
                />
              </div>

              <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                    Size
                  </p>
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
                </div>

                <div className="space-y-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                    Color adjustments — preview only
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    <Field label={`Exposure — ${exposure}`}>
                      <Slider value={[exposure]} min={-50} max={50} onValueChange={([v]) => setExposure(v ?? exposure)} />
                    </Field>
                    <Field label={`Contrast — ${contrast}`}>
                      <Slider value={[contrast]} min={-50} max={50} onValueChange={([v]) => setContrast(v ?? contrast)} />
                    </Field>
                    <Field label={`Saturation — ${saturation}`}>
                      <Slider value={[saturation]} min={-50} max={50} onValueChange={([v]) => setSaturation(v ?? saturation)} />
                    </Field>
                    <Field label={`Warmth — ${warmth}`}>
                      <Slider value={[warmth]} min={-50} max={50} onValueChange={([v]) => setWarmth(v ?? warmth)} />
                    </Field>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                    Real edits — applied to preview &amp; export
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    <Field label={`Shadows — ${shadows}`} hint="Lifts shadow detail.">
                      <Slider
                        value={[shadows]}
                        min={0}
                        max={100}
                        onValueChange={([v]) => setShadows(v ?? shadows)}
                      />
                    </Field>
                    <Field label={`Highlights — ${highlights}`} hint="Negative recovers blown highlights.">
                      <Slider
                        value={[highlights]}
                        min={-50}
                        max={50}
                        onValueChange={([v]) => setHighlights(v ?? highlights)}
                      />
                    </Field>
                  </div>
                  <div className="space-y-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[12px] text-text-muted">AI upscale</span>
                      <Switch checked={upscale} onCheckedChange={setUpscale} />
                    </div>
                    <p className="text-[10px] text-text-subtle">
                      4x resolution. First render can take a few seconds.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-5">
                <Button size="sm" variant="outline" onClick={resetAdjustments}>
                  <RotateCcw className="size-3.5" />
                  Reset all
                </Button>
                <Button
                  size="sm"
                  variant={removeBackground ? "default" : "outline"}
                  aria-pressed={removeBackground}
                  onClick={() => setRemoveBackground((v) => !v)}
                >
                  <Eraser className="size-3.5" />
                  {removeBackground ? "Background removed" : "Remove background"}
                </Button>
              </div>
            </Panel>
          ) : null}

          {selectedImage ? (
            <Panel title="Output" bodyClassName="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Download className="size-3.5" />
                      Export
                      <ChevronDown className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {["png", "jpg", "webp"].map((format) => (
                      <DropdownMenuItem
                        key={format}
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = toExportUrl(editedImageUrl ?? selectedImage.url, { format, width, height });
                          a.click();
                        }}
                      >
                        {format.toUpperCase()}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <SectionLabel>Next</SectionLabel>
              <div className="flex flex-wrap items-center gap-1.5">
                <ContextActions
                  actions={[
                    {
                      label: "Use as thumbnail",
                      icon: Wand2,
                      onClick: () =>
                        navigate({
                          to: "/thumbnail-studio",
                          search: { referenceImageUrl: editedImageUrl ?? selectedImage.url },
                        }),
                    },
                  ]}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2.5 text-[12px] text-text-muted transition-colors duration-150 hover:border-accent-brand/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent-brand"
                    >
                      <FolderKanban className="size-3.5" />
                      Use as project asset
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 space-y-1">
                    {projectOptions.length === 0 ? (
                      <p className="px-2 py-1.5 text-[12px] text-text-subtle">
                        No projects yet.{" "}
                        <button
                          type="button"
                          className="text-accent-brand hover:underline"
                          onClick={() => navigate({ to: "/projects" })}
                        >
                          Create one
                        </button>
                      </p>
                    ) : (
                      projectOptions.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          disabled={linkToProjectMutation.isPending}
                          onClick={() => linkToProjectMutation.mutate({ assetId: selectedImage.id, projectId: p.id })}
                          className="block w-full rounded-md px-2 py-1.5 text-left text-[12px] text-text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-50"
                        >
                          {p.name}
                        </button>
                      ))
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      <ImageLightbox url={lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)} />
    </div>
  );
}

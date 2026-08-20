import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
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
  CalendarDays,
  Columns2,
  X,
  Loader2,
  Expand,
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
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { generateThumbnailAction } from "@/lib/server/ai/thumbnail-studio";
import { uploadReferenceImageAction } from "@/lib/server/ai/image-studio";
import { applyImageEdits } from "@/lib/image-edit-transforms";
import { ImageLightbox } from "@/components/app/image-lightbox";
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

/** Same Cloudinary "force download" + format/resize transform pattern used
 * by Image Studio's export -- no new backend needed. */
function toExportUrl(url: string, format: string, size?: { width: number; height: number } | null): string {
  const dims = size ? `,w_${size.width},h_${size.height},c_fill` : "";
  return url.replace("/upload/", `/upload/f_${format}${dims},fl_attachment/`);
}

export const Route = createFileRoute("/_app/thumbnail-studio")({
  validateSearch: (search: Record<string, unknown>): { referenceImageUrl?: string; reedit?: string } => ({
    ...(typeof search["referenceImageUrl"] === "string" ? { referenceImageUrl: search["referenceImageUrl"] } : {}),
    ...(typeof search["reedit"] === "string" ? { reedit: search["reedit"] } : {}),
  }),
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
// ASCEND A3-B: locked to 1-2 -- never add 3 or 4 here, see registry/image-service.
const counts = [1, 2] as const;

type Variation = {
  id: string;
  label: string;
  recommended: boolean;
  rationale: string;
  url: string;
};

interface ThumbnailStudioDraft {
  topic: string;
  platformId: string;
  ratio: string;
  style: string;
  count: (typeof counts)[number];
  overlay: string;
  fontSize: number;
  position: Position;
  referenceImageUrl: string | null;
  referencePreview: string | null;
}

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
  url,
  onLoad,
  loading,
  onExpand,
}: {
  ratio: string;
  className?: string;
  overlay?: string;
  fontSize?: number;
  position?: Position;
  url?: string;
  onLoad?: () => void;
  loading?: boolean;
  onExpand?: () => void;
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
        "group relative flex w-full overflow-hidden rounded-lg border border-border bg-surface-2",
        aspectClass(ratio),
        posClass[position ?? "BC"],
        className,
      )}
    >
      {url ? (
        <img
          src={url}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onLoad={onLoad}
          onError={onLoad}
        />
      ) : (
        <ImageIcon className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-text-subtle/50" />
      )}
      {loading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
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
          className="absolute right-2 top-2 z-30 grid size-7 place-items-center rounded-md bg-black/50 text-white opacity-0 transition-opacity duration-150 hover:bg-black/70 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Expand className="size-3.5" />
        </button>
      ) : null}
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id, setId, platform } = usePlatform("youtube");
  const [topic, setTopic] = useState("");
  const [ratio, setRatio] = useState((platform.aspectRatios[0] ?? "16:9"));
  const [style, setStyle] = useState(styles[0] ?? "Bold text");
  const [count, setCount] = useState<(typeof counts)[number]>(1);
  const [status, setStatus] = useState<"idle" | "generating" | "done">("idle");
  const [variations, setVariations] = useState<Variation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const [overlay, setOverlay] = useState("");
  const [fontSize, setFontSize] = useState(22);
  const [position, setPosition] = useState<Position>("BC");
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);

  // Real, Cloudinary-rendered edits, baked into the actual preview/export
  // URL (unlike the overlay text above, which is a client-side CSS overlay
  // only) -- same mechanism as Image Studio's Shadows/Highlights/Upscale.
  const [shadows, setShadows] = useState(0);
  const [highlights, setHighlights] = useState(0);
  const [upscale, setUpscale] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [exportSize, setExportSize] = useState<{ width: number; height: number } | null>(null);

  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [referenceDragOver, setReferenceDragOver] = useState(false);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  // Picks up an image handed off from Image Studio's "Use as thumbnail"
  // action -- already a real, hosted Cloudinary URL, so it's used directly
  // as the reference image with no re-upload needed.
  const search = Route.useSearch();
  useEffect(() => {
    if (!search.referenceImageUrl) return;
    setReferenceImageUrl(search.referenceImageUrl);
    setReferencePreview(search.referenceImageUrl);
    void navigate({ to: "/thumbnail-studio", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.referenceImageUrl]);

  const { data: session } = useSession();
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
          topic?: string;
          platform?: string;
          aspectRatio?: string;
          style?: string;
          count?: number;
          referenceImageUrl?: string;
        } | null;
        if (!input) return;
        setTopic(input.topic ?? "");
        const matchedPlatform = platforms.find((p) => p.label === input.platform);
        if (matchedPlatform) setId(matchedPlatform.id);
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
    void navigate({ to: "/thumbnail-studio", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.reedit]);

  useDraftAutosave<ThumbnailStudioDraft>({
    userId: session?.user?.id,
    feature: "thumbnail-studio",
    enabled: settings?.autosaveDrafts ?? true,
    value: {
      topic,
      platformId: id,
      ratio,
      style,
      count,
      overlay,
      fontSize,
      position,
      referenceImageUrl,
      referencePreview,
    },
    onRestore: (d) => {
      setTopic(d.topic ?? "");
      if (d.platformId) setId(d.platformId as typeof id);
      if (d.ratio) setRatio(d.ratio);
      if (d.style) setStyle(d.style);
      if (d.count) setCount(d.count);
      if (d.overlay) setOverlay(d.overlay);
      if (d.fontSize) setFontSize(d.fontSize);
      if (d.position) setPosition(d.position);
      if (d.referenceImageUrl) setReferenceImageUrl(d.referenceImageUrl);
      if (d.referencePreview) setReferencePreview(d.referencePreview);
    },
  });

  const generateThumbnailFn = useServerFn(generateThumbnailAction);
  const uploadReferenceImageFn = useServerFn(uploadReferenceImageAction);

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
      generateThumbnailFn({
        data: {
          topic,
          aspectRatio: ratio,
          count,
          ...(style ? { style } : {}),
          platform: platform.label,
          ...(referenceImageUrl ? { referenceImageUrl } : {}),
        },
      }),
    onSuccess: (result) => {
      setVariations(
        result.variations.map((v) => ({
          id: v.id,
          label: v.label,
          recommended: v.recommended,
          rationale: v.rationale,
          url: v.asset.url,
        })),
      );
      setStatus("done");
      queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Couldn't generate thumbnails. Try again.");
      setStatus("idle");
    },
  });

  function generate() {
    setStatus("generating");
    setVariations([]);
    setSelected(null);
    generateMutation.mutate();
  }

  function regenerate(_vid: string) {
    generate();
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

  useEffect(() => {
    setShadows(0);
    setHighlights(0);
    setUpscale(false);
    setExportSize(null);
  }, [selected]);

  const selectedVariation = variations.find((v) => v.id === selected);
  const compareVariations = useMemo(
    () => variations.filter((v) => compareIds.includes(v.id)),
    [variations, compareIds],
  );
  const editedVariationUrl = selectedVariation
    ? applyImageEdits(selectedVariation.url, { shadows, highlights, upscale, removeBackground: false })
    : undefined;

  useEffect(() => {
    if (!selectedVariation || !editedVariationUrl) return;
    setEditLoading(editedVariationUrl !== selectedVariation.url);
  }, [editedVariationUrl, selectedVariation]);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Create"
        title="Thumbnail Studio"
        description="Compose click-worthy frames from layout presets, typography and generated imagery."
      />

      <div className="space-y-6">
        <Panel title="Input" bodyClassName="space-y-6">
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Topic / title" className="sm:col-span-2">
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
            <Field label="Style" className="sm:col-span-2">
              <ChipGroup options={styles} value={style} onChange={setStyle} />
            </Field>
            <Field label="Variations">
              <ChipGroup
                options={counts.map(String)}
                value={String(count)}
                onChange={(v) => setCount(Number(v) as (typeof counts)[number])}
                disabled={status === "generating"}
              />
            </Field>
            <Field label="Reference image" hint="Optional — used as a visual anchor." className="sm:col-span-2 xl:col-span-4">
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
          </div>
          <div className="flex items-center justify-between border-t border-border-subtle pt-5">
            <CostHint credits={imageCost(count)} balance={creditAccount?.balance} />
            <Button
              size="sm"
              onClick={generate}
              disabled={
                status === "generating" ||
                !topic.trim() ||
                (creditAccount ? creditAccount.balance < imageCost(count) : false)
              }
            >
              {status === "generating" ? "Generating…" : `Generate ${count} variation${count > 1 ? "s" : ""}`}
            </Button>
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
                Generate to see your thumbnail variation{count > 1 ? "s" : ""} here.
              </p>
            ) : status === "generating" ? (
              <div className="space-y-4">
                <GeneratingState label="Rendering variations" />
                <div className={cn("grid gap-4", count === 1 ? "grid-cols-1" : "grid-cols-2")}>
                  {Array.from({ length: count }).map((_, i) => (
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
                        <ThumbnailFrame ratio={ratio} url={v.url} />
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
              <div className={cn("grid gap-4", variations.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
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
                        disabled={creditAccount ? creditAccount.balance < imageCost(count) : false}
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
                    <ThumbnailFrame
                      ratio={ratio}
                      className="mt-1"
                      url={v.url}
                      onExpand={() => setLightboxUrl(v.url)}
                    />
                  </OptionCard>
                ))}
              </div>
            )}
          </Panel>

          {selectedVariation ? (
            <Panel title="Basic editor" bodyClassName="space-y-6">
              <div className="max-w-xs space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                  Live preview
                </p>
                <ThumbnailFrame
                  ratio={ratio}
                  overlay={overlay}
                  fontSize={fontSize}
                  position={position}
                  url={editedVariationUrl ?? selectedVariation.url}
                  loading={editLoading}
                  onLoad={() => setEditLoading(false)}
                />
              </div>

              <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                    Text &amp; layout
                  </p>
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
                            type="button"
                            onClick={() => setRatio(p)}
                            className={cn(
                              "block w-full rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-surface-2 hover:text-foreground",
                              ratio === p ? "text-foreground" : "text-text-muted",
                            )}
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
                        {["1280×720", "1920×1080", "1080×1080"].map((p) => {
                          const [w, h] = p.split("×").map(Number);
                          const isActive = exportSize?.width === w && exportSize?.height === h;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setExportSize({ width: w!, height: h! })}
                              className={cn(
                                "block w-full rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-surface-2 hover:text-foreground",
                                isActive ? "text-foreground" : "text-text-muted",
                              )}
                            >
                              {p}
                            </button>
                          );
                        })}
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
            </Panel>
          ) : null}

          {selectedVariation ? (
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
                    {["png", "jpg"].map((format) => (
                      <DropdownMenuItem
                        key={format}
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = toExportUrl(editedVariationUrl ?? selectedVariation.url, format, exportSize);
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
              <ContextActions
                actions={[
                  {
                    label: "Add to planner",
                    icon: CalendarDays,
                    onClick: () =>
                      navigate({
                        to: "/content-planner",
                        search: {
                          title: topic.trim() || "Untitled thumbnail",
                          platform: id,
                          coverImage: editedVariationUrl ?? selectedVariation.url,
                        },
                      }),
                  },
                ]}
              />
            </Panel>
          ) : null}
        </div>
      </div>

      <ImageLightbox url={lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)} />
    </div>
  );
}

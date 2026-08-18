import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UploadCloud, Plus, X, Check, Palette } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/app/primitives";
import { Field, ChipGroup, Panel } from "@/components/app/studio-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tones } from "@/lib/creator-data";

export const Route = createFileRoute("/_app/brand-kit")({
  head: () => ({
    meta: [
      { title: "Brand Kit — CreatorOS AI" },
      { name: "description", content: "Brand Kit in CreatorOS AI." },
      { property: "og:title", content: "Brand Kit — CreatorOS AI" },
      { property: "og:description", content: "Brand Kit in CreatorOS AI." },
    ],
  }),
  component: BrandKitPage,
});

const visualStyles = ["Minimal", "Bold", "Editorial", "Playful", "Cinematic"];
const thumbnailStyles = ["Face close-up", "Text overlay", "Split frame", "Illustrated"];
const headingFonts = ["Inter", "Space Grotesk", "Playfair Display", "Sora"];
const bodyFonts = ["Inter", "IBM Plex Sans", "Source Serif 4", "Sora"];

function TagInput({
  tags,
  onChange,
  tone = "neutral",
  placeholder,
}: {
  tags: string[];
  onChange: (t: string[]) => void;
  tone?: "neutral" | "danger";
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    if (draft.trim()) {
      onChange([...tags, draft.trim()]);
      setDraft("");
    }
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span
            key={t}
            className={
              "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] " +
              (tone === "danger"
                ? "border-danger/30 bg-danger/10 text-danger"
                : "border-border bg-surface-2 text-text-muted")
            }
          >
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))}>
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="h-8 text-[12px]"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function BrandKitPage() {
  const [name, setName] = useState("Northline Studio");
  const [colors, setColors] = useState(["#2563EB", "#0F172A", "#F8FAFC", "#22C55E", "#F59E0B"]);
  const [headingFont, setHeadingFont] = useState(headingFonts[0]!);
  const [bodyFont, setBodyFont] = useState(bodyFonts[0]!);
  const [visualStyle, setVisualStyle] = useState(visualStyles[0]!);
  const [thumbnailStyle, setThumbnailStyle] = useState(thumbnailStyles[0]!);
  const [tone, setTone] = useState(tones[0]!);
  const [doList, setDoList] = useState(["Use first-person stories", "Keep sentences short"]);
  const [dontList, setDontList] = useState(["Use corporate jargon", "Over-promise results"]);
  const [handles, setHandles] = useState({
    YouTube: "northlinestudio",
    Instagram: "northline.studio",
    TikTok: "northlinestudio",
    LinkedIn: "northline-studio",
    X: "northlinehq",
  });
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");

  function updateColor(i: number, v: string) {
    setColors((prev) => prev.map((c, idx) => (idx === i ? v : c)));
  }

  return (
    <div className="space-y-10 pb-24">
      <PageHeader
        eyebrow="Studio"
        title="Brand Kit"
        description="The identity every AI generation across CreatorOS pulls from — name, colours, fonts and voice."
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <Panel title="Identity">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Brand name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Logo">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-dashed border-border bg-surface-2 text-text-subtle">
                    <Palette className="size-4" />
                  </span>
                  <button
                    type="button"
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-border text-[12px] text-text-muted transition-colors hover:border-accent-brand/40 hover:text-foreground"
                  >
                    <UploadCloud className="size-3.5" /> Drop or browse
                  </button>
                </div>
              </Field>
            </div>
          </Panel>

          <Panel title="Brand colours">
            <div className="space-y-3">
              {colors.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span
                    className="size-8 shrink-0 rounded-md border border-border"
                    style={{ background: c }}
                  />
                  <Input
                    value={c}
                    onChange={(e) => updateColor(i, e.target.value)}
                    className="h-8 max-w-[140px] font-mono text-[12px]"
                  />
                  <button
                    type="button"
                    onClick={() => setColors((prev) => prev.filter((_, idx) => idx !== i))}
                    className="ml-auto text-text-subtle transition-colors hover:text-danger"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              {colors.length < 6 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setColors((prev) => [...prev, "#888888"])}
                >
                  <Plus className="size-3.5" /> Add colour
                </Button>
              ) : null}
            </div>
          </Panel>

          <Panel title="Fonts">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Heading font">
                <Select value={headingFont} onValueChange={setHeadingFont}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {headingFonts.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Body font">
                <Select value={bodyFont} onValueChange={setBodyFont}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {bodyFonts.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="mt-4 rounded-lg border border-border-subtle bg-surface-2 p-4">
              <p className="text-[18px] font-medium text-foreground">{headingFont} heading preview</p>
              <p className="mt-1 text-[13px] text-text-muted">
                {bodyFont} body copy — the quick brown fox jumps over the lazy dog.
              </p>
            </div>
          </Panel>

          <Panel title="Visual style">
            <ChipGroup options={visualStyles} value={visualStyle} onChange={setVisualStyle} />
          </Panel>

          <Panel title="Thumbnail style">
            <div className="space-y-3">
              <ChipGroup options={thumbnailStyles} value={thumbnailStyle} onChange={setThumbnailStyle} />
              <p className="text-[12px] leading-relaxed text-text-subtle">
                Applied by default across Thumbnail Studio generations for this brand.
              </p>
            </div>
          </Panel>

          <Panel title="Brand voice">
            <div className="space-y-5">
              <Field label="Tone">
                <ChipGroup options={tones} value={tone} onChange={setTone} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Do">
                  <TagInput tags={doList} onChange={setDoList} placeholder="Add a guideline" />
                </Field>
                <Field label="Don't">
                  <TagInput tags={dontList} onChange={setDontList} tone="danger" placeholder="Add a restriction" />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel title="Social handles">
            <div className="space-y-3">
              {(Object.keys(handles) as (keyof typeof handles)[]).map((k) => (
                <div key={k} className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-3">
                  <span className="text-[12px] text-text-muted">{k}</span>
                  <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3">
                    <span className="text-[12px] text-text-subtle">@</span>
                    <input
                      value={handles[k]}
                      onChange={(e) => setHandles((prev) => ({ ...prev, [k]: e.target.value }))}
                      className="h-9 w-full bg-transparent text-[12px] text-foreground outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="lg:sticky lg:top-6 lg:h-fit">
          <SectionLabel>Preview</SectionLabel>
          <div className="space-y-4">
            <div
              className="overflow-hidden rounded-xl border border-border"
              style={{ borderColor: colors[0] }}
            >
              <div className="flex aspect-video items-center justify-center" style={{ background: colors[1] }}>
                <p className="px-4 text-center text-[16px] font-semibold" style={{ color: colors[2] }}>
                  {name}
                </p>
              </div>
              <div className="bg-surface p-3">
                <p className="text-[12px] text-text-muted">Thumbnail preview · {thumbnailStyle}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <span
                  className="size-7 rounded-full"
                  style={{ background: colors[0] }}
                />
                <p className="text-[13px] font-medium text-foreground">{name}</p>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-text-muted">
                New episode is live — {tone.toLowerCase()} take on this week's biggest lesson. Link in bio.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                Script header
              </p>
              <p
                className="mt-2 text-[16px] font-medium"
                style={{ color: colors[0] }}
              >
                {name} — Episode 24
              </p>
              <p className="mt-1 text-[12px] text-text-subtle">
                {headingFont} / {bodyFont} · {visualStyle} visual style
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-6 py-3">
          {saveState === "saved" ? (
            <span className="mr-auto flex items-center gap-1.5 text-[12px] text-success">
              <Check className="size-3.5" /> Saved
            </span>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => setSaveState("idle")}>
            Discard
          </Button>
          <Button size="sm" onClick={() => setSaveState("saved")}>
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}

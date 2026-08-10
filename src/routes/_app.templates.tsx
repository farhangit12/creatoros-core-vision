import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileText,
  Image as ImageIcon,
  Workflow,
  MessageSquareText,
  CalendarRange,
  Search,
  Star,
  Sparkles,
  Save,
  LayoutTemplate,
} from "lucide-react";
import { PageHeader, SectionLabel, EmptyState } from "@/components/app/primitives";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_app/templates")({
  head: () => ({
    meta: [
      { title: "Templates — CreatorOS AI" },
      { name: "description", content: "Reusable starting points for scripts, posts, thumbnails and project structures." },
      { property: "og:title", content: "Templates — CreatorOS AI" },
      { property: "og:description", content: "Reusable starting points for scripts, posts, thumbnails and project structures." },
    ],
  }),
  component: TemplatesPage,
});

type Kind = "Script" | "Thumbnail" | "Content" | "Workflow" | "Prompt";

const kinds: { id: Kind; icon: typeof FileText; route: string }[] = [
  { id: "Script", icon: FileText, route: "/script-studio" },
  { id: "Thumbnail", icon: ImageIcon, route: "/thumbnail-studio" },
  { id: "Content", icon: CalendarRange, route: "/content-planner" },
  { id: "Workflow", icon: Workflow, route: "/content-planner" },
  { id: "Prompt", icon: MessageSquareText, route: "/chat" },
];

const categories = ["YouTube", "Shorts", "Instagram", "LinkedIn", "Marketing", "Educational", "Storytelling"];

type Template = {
  id: string;
  kind: Kind;
  title: string;
  description: string;
  categories: string[];
  uses: number;
  favourite: boolean;
  outline: string[];
};

const templates: Template[] = [
  { id: "t1", kind: "Script", title: "10-minute tutorial breakdown", description: "Structured hook, 3-step teach, recap and CTA for long-form YouTube.", categories: ["YouTube", "Educational"], uses: 482, favourite: true, outline: ["Hook (0:00-0:08)", "Context & promise", "Step 1 walkthrough", "Step 2 walkthrough", "Step 3 walkthrough", "Recap + CTA"] },
  { id: "t2", kind: "Thumbnail", title: "Bold face + result callout", description: "High-contrast thumbnail layout with reaction face and outcome text.", categories: ["YouTube"], uses: 310, favourite: false, outline: ["Subject cutout, left third", "Bold outcome headline", "Accent arrow or circle", "Contrast background"] },
  { id: "t3", kind: "Content", title: "Weekly short-form batch", description: "5-post content plan mixing Reels and TikTok around one theme.", categories: ["Shorts", "Instagram"], uses: 176, favourite: false, outline: ["Mon — trend remix", "Wed — behind the scenes", "Fri — tutorial cut", "Sat — community post", "Sun — recap"] },
  { id: "t4", kind: "Workflow", title: "Idea to publish pipeline", description: "6-stage production workflow from idea capture through publishing.", categories: ["Marketing"], uses: 92, favourite: true, outline: ["Idea capture", "Draft script", "Review pass", "Ready for asset gen", "Scheduled", "Published"] },
  { id: "t5", kind: "Prompt", title: "Contrarian hook generator", description: "Prompt scaffold for punchy, opinionated opening lines.", categories: ["Marketing", "Storytelling"], uses: 640, favourite: true, outline: ["Audience + belief input", "Contrarian claim", "Proof line", "Transition to body"] },
  { id: "t6", kind: "Script", title: "LinkedIn thought-leadership post", description: "Result-first opening with short paragraphs and a comment prompt.", categories: ["LinkedIn", "Marketing"], uses: 205, favourite: false, outline: ["Result-first line", "Context paragraph", "Lesson learned", "Comment prompt"] },
  { id: "t7", kind: "Content", title: "Product launch sprint", description: "14-day cross-platform teaser to launch-day content plan.", categories: ["Marketing", "Instagram"], uses: 88, favourite: false, outline: ["Day 1-3 teasers", "Day 4-7 build-up", "Launch day assets", "Day 9-14 follow-up"] },
  { id: "t8", kind: "Thumbnail", title: "Minimal text-only cover", description: "Clean typographic thumbnail for calm, educational tone channels.", categories: ["Educational", "YouTube"], uses: 143, favourite: false, outline: ["Single bold statement", "Muted background", "Small logo mark"] },
  { id: "t9", kind: "Prompt", title: "Story arc beat sheet", description: "Prompt for a 5-beat narrative arc used in cinematic storytelling videos.", categories: ["Storytelling"], uses: 267, favourite: false, outline: ["Setup", "Inciting moment", "Rising complication", "Turn", "Resolution"] },
];

const featuredIds = ["t1", "t5", "t4"];

function SaveTemplateDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Save className="size-4" /> Save as template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-[12px] text-text-muted">Template name</Label>
            <Input placeholder="e.g. My weekly recap format" />
          </div>
          <div className="space-y-2">
            <Label className="text-[12px] text-text-muted">Notes</Label>
            <Textarea placeholder="What makes this structure reusable?" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => setOpen(false)}>Save template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewDialog({ template }: { template: Template }) {
  const [open, setOpen] = useState(false);
  const kindMeta = kinds.find((k) => k.id === template.kind)!;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Preview</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <kindMeta.icon className="size-4 text-accent-brand" />
            {template.title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-text-muted">{template.description}</p>
        <div className="space-y-2 rounded-lg border border-border bg-surface-2 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">Structure outline</p>
          <ol className="space-y-1.5">
            {template.outline.map((step, i) => (
              <li key={step} className="flex gap-2 text-[13px] text-foreground">
                <span className="font-mono text-[11px] text-text-subtle">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button asChild>
            <Link to={kindMeta.route as any}>Use template</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateCard({ template }: { template: Template }) {
  const [favourite, setFavourite] = useState(template.favourite);
  const kindMeta = kinds.find((k) => k.id === template.kind)!;
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-accent-brand">
          <kindMeta.icon className="size-4" />
        </span>
        <button
          type="button"
          onClick={() => setFavourite((f) => !f)}
          className="text-text-subtle hover:text-warning"
        >
          <Star className={cn("size-4", favourite && "fill-warning text-warning")} />
        </button>
      </div>
      <p className="text-[14px] font-medium text-foreground">{template.title}</p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-text-muted">{template.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {template.categories.map((c) => (
          <span key={c} className="rounded-md border border-border bg-surface-2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle">
            {c}
          </span>
        ))}
      </div>
      <p className="mt-3 font-mono text-[10px] text-text-subtle">{template.uses} uses</p>
      <div className="mt-4 flex items-center gap-2">
        <PreviewDialog template={template} />
        <Button asChild size="sm" className="flex-1">
          <Link to={kindMeta.route as any}>Use Template</Link>
        </Button>
      </div>
    </div>
  );
}

function TemplatesPage() {
  const [kind, setKind] = useState<Kind>("Script");
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("popular");

  const filtered = useMemo(() => {
    let list = templates.filter((t) => t.kind === kind);
    if (category) list = list.filter((t) => t.categories.includes(category));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => (sort === "popular" ? b.uses - a.uses : a.title.localeCompare(b.title)));
    return list;
  }, [kind, category, search, sort]);

  const featured = templates.filter((t) => featuredIds.includes(t.id));

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Organize"
        title="Templates"
        description="Reusable starting points for scripts, posts, thumbnails and project structures."
        actions={<SaveTemplateDialog />}
      />

      <section>
        <SectionLabel aside={<span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent-brand"><Sparkles className="size-3" /> Featured</span>}>
          Featured templates
        </SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          {featured.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)}>
          <TabsList>
            {kinds.map((k) => (
              <TabsTrigger key={k.id} value={k.id} className="gap-1.5">
                <k.icon className="size-3.5" /> {k.id}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-subtle" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates" className="pl-8" />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most used</SelectItem>
              <SelectItem value="alpha">A → Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn(
              "h-8 rounded-lg border px-2.5 text-[12px] transition-colors duration-150",
              category === null ? "border-accent-brand/40 bg-accent-tint text-foreground" : "border-border bg-surface-2 text-text-muted hover:text-foreground",
            )}
          >
            All categories
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "h-8 rounded-lg border px-2.5 text-[12px] transition-colors duration-150",
                category === c ? "border-accent-brand/40 bg-accent-tint text-foreground" : "border-border bg-surface-2 text-text-muted hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={LayoutTemplate}
            title="No templates match"
            description="Try a different category, kind, or search term."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

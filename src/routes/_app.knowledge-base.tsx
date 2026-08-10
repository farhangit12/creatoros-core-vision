import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileText,
  StickyNote,
  Microscope,
  FileType,
  Link2,
  Search,
  Plus,
  LayoutGrid,
  List,
  MoreHorizontal,
  Database,
  Upload,
  NotebookPen,
} from "lucide-react";
import { PageHeader, PhaseBadge, EmptyState } from "@/components/app/primitives";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_app/knowledge-base")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — CreatorOS AI" },
      { name: "description", content: "Knowledge Base in CreatorOS AI." },
      { property: "og:title", content: "Knowledge Base — CreatorOS AI" },
      { property: "og:description", content: "Knowledge Base in CreatorOS AI." },
    ],
  }),
  component: KnowledgeBasePage,
});

type SourceType = "Documents" | "Notes" | "Research" | "PDFs" | "Saved links";

const typeIcon: Record<SourceType, typeof FileText> = {
  Documents: FileText,
  Notes: StickyNote,
  Research: Microscope,
  PDFs: FileType,
  "Saved links": Link2,
};

type Source = {
  id: string;
  type: SourceType;
  title: string;
  source: string;
  added: string;
  size: string;
  inContext: boolean;
  tags: string[];
  excerpt: string;
};

const seed: Source[] = [
  { id: "s1", type: "Documents", title: "Brand voice guidelines v3", source: "brand-voice-v3.docx", added: "Feb 22", size: "2,140 words", inContext: true, tags: ["brand", "voice"], excerpt: "Our voice is direct, a little irreverent, and always specific. Avoid corporate filler..." },
  { id: "s2", type: "Notes", title: "Audience pain points — Q1 calls", source: "note", added: "Feb 20", size: "480 words", inContext: true, tags: ["research", "audience"], excerpt: "Recurring theme: creators want faster turnaround without losing quality control..." },
  { id: "s3", type: "Research", title: "Short-form retention benchmarks", source: "internal study", added: "Feb 18", size: "1,120 words", inContext: false, tags: ["shorts", "benchmarks"], excerpt: "Median completion rate for sub-30s videos across the cohort was 61%..." },
  { id: "s4", type: "PDFs", title: "Sponsor deck — Acota Q1", source: "acota-sponsor-deck.pdf", added: "Feb 15", size: "3.2 MB", inContext: false, tags: ["sponsor", "acota"], excerpt: "Acota is looking for 3 integrated reads across YouTube and one dedicated short..." },
  { id: "s5", type: "Saved links", title: "Competitor thumbnail teardown", source: "creatorinsider.com", added: "Feb 12", size: "6 min read", inContext: true, tags: ["thumbnails", "competitive"], excerpt: "The top 10 channels in this niche lean heavily on high-contrast faces plus a single word..." },
  { id: "s6", type: "Documents", title: "Episode 40 transcript", source: "ep-40-transcript.docx", added: "Feb 9", size: "5,400 words", inContext: false, tags: ["transcript"], excerpt: "So today we're breaking down exactly how the algorithm treats watch time versus..." },
  { id: "s7", type: "Notes", title: "Naming conventions for assets", source: "note", added: "Feb 5", size: "210 words", inContext: true, tags: ["ops"], excerpt: "Format: [project]_[platform]_[date]_[version]. Keep lowercase, dashes not spaces..." },
  { id: "s8", type: "Saved links", title: "Platform algorithm update recap", source: "socialtoday.com", added: "Jan 30", size: "4 min read", inContext: false, tags: ["algorithm", "platform"], excerpt: "The latest update weights early session completion more heavily than raw watch time..." },
];

const navItems: { id: "All" | SourceType }[] = [
  { id: "All" },
  { id: "Documents" },
  { id: "Notes" },
  { id: "Research" },
  { id: "PDFs" },
  { id: "Saved links" },
];

function AddSourceMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> Add source
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="gap-2"><Upload className="size-3.5" /> Upload document</DropdownMenuItem>
        <DropdownMenuItem className="gap-2"><NotebookPen className="size-3.5" /> New note</DropdownMenuItem>
        <DropdownMenuItem className="gap-2"><Link2 className="size-3.5" /> Add link</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RowActionsMenu({ onOpen }: { onOpen: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="grid size-7 shrink-0 place-items-center rounded-md text-text-subtle hover:text-foreground"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem asChild>
          <Link to="/chat">Ask AI</Link>
        </DropdownMenuItem>
        <DropdownMenuItem>Add to Project</DropdownMenuItem>
        <DropdownMenuItem>Add to AI Context</DropdownMenuItem>
        <DropdownMenuItem>Attach to generation</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpen}>Open</DropdownMenuItem>
        <DropdownMenuItem className="text-danger">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function KnowledgeBasePage() {
  const [sources, setSources] = useState<Source[]>(seed);
  const [activeType, setActiveType] = useState<"All" | SourceType>("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<Source | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: sources.length };
    for (const t of navItems.slice(1)) {
      c[t.id] = sources.filter((s) => s.type === t.id).length;
    }
    return c;
  }, [sources]);

  const filtered = useMemo(() => {
    let list = sources.filter((s) => activeType === "All" || s.type === activeType);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.title.toLowerCase().includes(q) || s.tags.some((t) => t.includes(q)));
    }
    list = [...list].sort((a, b) => (sort === "recent" ? 0 : a.title.localeCompare(b.title)));
    return list;
  }, [sources, activeType, search, sort]);

  function toggleContext(id: string) {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, inContext: !s.inContext } : s)));
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Workspace"
        title="Knowledge Base"
        description="Centralize documents, notes and research the AI can draw on across studios."
        actions={
          <div className="flex items-center gap-2">
            <AddSourceMenu />
            <PhaseBadge />
          </div>
        }
      />

      <p className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-[12px] text-text-muted">
        <Database className="size-3.5 shrink-0 text-text-subtle" />
        Automatic indexing and semantic search connect in a later phase — sources shown here are for interface reference only.
      </p>

      <div className="grid gap-6 md:grid-cols-[180px_1fr]">
        <nav className="space-y-1">
          {navItems.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setActiveType(n.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors duration-150",
                activeType === n.id ? "bg-surface-2 text-foreground" : "text-text-muted hover:text-foreground",
              )}
            >
              {n.id}
              <span className="font-mono text-[10px] text-text-subtle">{counts[n.id] ?? 0}</span>
            </button>
          ))}
        </nav>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-subtle" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sources" className="pl-8" />
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most recent</SelectItem>
                <SelectItem value="alpha">A → Z</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
              <button
                type="button"
                onClick={() => setLayout("list")}
                className={cn("grid size-7 place-items-center rounded-md", layout === "list" ? "bg-surface text-foreground" : "text-text-muted hover:text-foreground")}
              >
                <List className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setLayout("grid")}
                className={cn("grid size-7 place-items-center rounded-md", layout === "grid" ? "bg-surface text-foreground" : "text-text-muted hover:text-foreground")}
              >
                <LayoutGrid className="size-3.5" />
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No sources found"
              description="Try a different search or add a document, note, or link to your knowledge base."
              action={<AddSourceMenu />}
            />
          ) : layout === "list" ? (
            <div className="divide-y divide-border-subtle rounded-xl border border-border bg-surface">
              {filtered.map((s) => {
                const Icon = typeIcon[s.type];
                return (
                  <div
                    key={s.id}
                    role="button"
                    onClick={() => setSelected(s)}
                    className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors duration-100 hover:bg-surface-2"
                  >
                    <Icon className="size-4 shrink-0 text-text-subtle" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-foreground">{s.title}</p>
                      <p className="truncate text-[11px] text-text-subtle">
                        {s.source} · {s.added} · {s.size}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {s.tags.map((t) => (
                          <span key={t} className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-text-subtle">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle">In AI context</span>
                      <Switch checked={s.inContext} onCheckedChange={() => toggleContext(s.id)} />
                    </div>
                    <RowActionsMenu onOpen={() => setSelected(s)} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((s) => {
                const Icon = typeIcon[s.type];
                return (
                  <div
                    key={s.id}
                    role="button"
                    onClick={() => setSelected(s)}
                    className="flex cursor-pointer flex-col rounded-xl border border-border bg-surface p-4 transition-colors duration-100 hover:border-accent-brand/40"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="grid size-8 place-items-center rounded-lg border border-border bg-surface-2 text-accent-brand">
                        <Icon className="size-4" />
                      </span>
                      <RowActionsMenu onOpen={() => setSelected(s)} />
                    </div>
                    <p className="text-[13px] font-medium text-foreground">{s.title}</p>
                    <p className="mt-1 text-[11px] text-text-subtle">{s.source} · {s.added}</p>
                    <p className="mt-2 line-clamp-2 text-[12px] text-text-muted">{s.excerpt}</p>
                    <div className="mt-3 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle">Context</span>
                      <Switch checked={s.inContext} onCheckedChange={() => toggleContext(s.id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selected ? (
            <div className="flex h-full flex-col">
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>
                  {selected.source} · Added {selected.added} · {selected.size}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {selected.tags.map((t) => (
                  <span key={t} className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-text-subtle">
                    {t}
                  </span>
                ))}
              </div>
              <div className="mt-5 rounded-lg border border-border bg-surface-2 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">Excerpt</p>
                <p className="mt-2 text-[13px] leading-relaxed text-text-muted">{selected.excerpt}</p>
              </div>
              <div className="mt-5 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2.5">
                <span className="text-[12px] text-text-muted">In AI context</span>
                <Switch checked={selected.inContext} onCheckedChange={() => toggleContext(selected.id)} />
              </div>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
                <Button asChild size="sm" variant="outline">
                  <Link to="/chat">Ask AI</Link>
                </Button>
                <Button size="sm" variant="outline">Add to Project</Button>
                <Button size="sm" variant="outline">Attach to generation</Button>
                <Button size="sm" variant="outline" className="text-danger">Delete</Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

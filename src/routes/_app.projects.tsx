import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  FolderKanban,
  Plus,
  Search,
  Star,
  MoreHorizontal,
  LayoutGrid,
  List,
  Copy,
  Archive,
  Trash2,
  FolderOpen,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import { PageHeader, SectionLabel, EmptyState } from "@/components/app/primitives";
import { StatusPill, type StateTone } from "@/components/app/studio-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/projects")({
  head: () => ({
    meta: [
      { title: "Projects — CreatorOS AI" },
      { name: "description", content: "Every deliverable, client and campaign in one operating surface — with search, filters and status." },
      { property: "og:title", content: "Projects — CreatorOS AI" },
      { property: "og:description", content: "Every deliverable, client and campaign in one operating surface — with search, filters and status." },
    ],
  }),
  component: ProjectsPage,
});

type ProjectStatus = "Idea" | "In progress" | "Review" | "Published" | "Archived";

type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  lastModified: string;
  tags: string[];
  favourite: boolean;
  cover: string;
  archived: boolean;
};

const statusTone: Record<ProjectStatus, StateTone> = {
  Idea: "neutral",
  "In progress": "accent",
  Review: "warning",
  Published: "success",
  Archived: "neutral",
};

const coverPatterns = ["Solid", "Diagonal", "Grid", "Dotted"];
const coverColors = [
  { id: "blue", className: "bg-accent-tint" },
  { id: "zinc", className: "bg-surface-3" },
  { id: "warn", className: "bg-warning/10" },
  { id: "ok", className: "bg-success/10" },
];

const templates = ["Blank", "YouTube series", "Brand campaign", "Product launch", "Weekly shorts"];

const initialProjects: Project[] = [
  {
    id: "creator-onboarding",
    name: "Creator Onboarding Series",
    description: "5-part YouTube series introducing the new workspace to creators.",
    status: "In progress",
    progress: 62,
    lastModified: "2 hours ago",
    tags: ["youtube", "series"],
    favourite: true,
    cover: "bg-accent-tint",
    archived: false,
  },
  {
    id: "spring-launch",
    name: "Spring Product Launch",
    description: "Cross-platform launch campaign for the spring release.",
    status: "Review",
    progress: 85,
    lastModified: "Yesterday",
    tags: ["campaign", "launch"],
    favourite: false,
    cover: "bg-surface-3",
    archived: false,
  },
  {
    id: "shorts-experiment",
    name: "Shorts Experiment Q3",
    description: "Testing hook variations across 12 short-form pieces.",
    status: "Idea",
    progress: 8,
    lastModified: "3 days ago",
    tags: ["shorts", "experiment"],
    favourite: false,
    cover: "bg-warning/10",
    archived: false,
  },
  {
    id: "founder-story",
    name: "Founder Story Documentary",
    description: "Long-form narrative piece for the brand channel.",
    status: "Published",
    progress: 100,
    lastModified: "1 week ago",
    tags: ["brand", "long-form"],
    favourite: true,
    cover: "bg-success/10",
    archived: false,
  },
  {
    id: "client-acme",
    name: "Acme Co. Retainer",
    description: "Monthly content retainer for Acme Co. social channels.",
    status: "In progress",
    progress: 40,
    lastModified: "5 days ago",
    tags: ["client", "retainer"],
    favourite: false,
    cover: "bg-accent-tint",
    archived: false,
  },
  {
    id: "podcast-clips",
    name: "Podcast Clip Factory",
    description: "Repurposing the weekly podcast into short vertical clips.",
    status: "Archived",
    progress: 100,
    lastModified: "2 months ago",
    tags: ["podcast", "repurpose"],
    favourite: false,
    cover: "bg-surface-3",
    archived: true,
  },
];

type SortKey = "modified" | "name" | "status" | "progress";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("modified");
  const [filter, setFilter] = useState<"all" | "favourites" | "archived">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCover, setNewCover] = useState(coverColors[0].id);
  const [newPattern, setNewPattern] = useState(coverPatterns[0]);
  const [newTags, setNewTags] = useState("");
  const [newTemplate, setNewTemplate] = useState(templates[0]);

  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);

  const filtered = useMemo(() => {
    let list = filter === "archived" ? archived : active;
    if (filter === "favourites") list = list.filter((p) => p.favourite);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    const sorted = [...list];
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "status") sorted.sort((a, b) => a.status.localeCompare(b.status));
    if (sort === "progress") sorted.sort((a, b) => b.progress - a.progress);
    return sorted;
  }, [active, archived, filter, search, sort]);

  function toggleFavourite(id: string) {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, favourite: !p.favourite } : p)),
    );
  }

  function duplicateProject(id: string) {
    const source = projects.find((p) => p.id === id);
    if (!source) return;
    const copy: Project = {
      ...source,
      id: `${id}-copy-${Date.now()}`,
      name: `${source.name} (copy)`,
      lastModified: "Just now",
    };
    setProjects((prev) => [copy, ...prev]);
    toast.success("Project duplicated", { description: copy.name });
  }

  function archiveProject(id: string) {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, archived: !p.archived, status: p.archived ? "In progress" : "Archived" } : p)),
    );
    toast("Project archive status updated");
  }

  function deleteProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast("Project deleted");
  }

  function handleCreate() {
    if (!newName.trim()) {
      toast.error("Give the project a name first");
      return;
    }
    const cover = coverColors.find((c) => c.id === newCover)?.className ?? coverColors[0].className;
    const created: Project = {
      id: `project-${Date.now()}`,
      name: newName.trim(),
      description: newDescription.trim() || "No description yet.",
      status: "Idea",
      progress: 0,
      lastModified: "Just now",
      tags: newTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      favourite: false,
      cover,
      archived: false,
    };
    setProjects((prev) => [created, ...prev]);
    setCreateOpen(false);
    setNewName("");
    setNewDescription("");
    setNewTags("");
    setNewCover(coverColors[0].id);
    setNewPattern(coverPatterns[0]);
    setNewTemplate(templates[0]);
    toast.success("Project created", { description: `${created.name} · ${newPattern} cover` });
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Organize"
        title="Projects"
        description="Every deliverable, client and campaign in one operating surface — with search, filters and status."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="size-4" />
                Create project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create project</DialogTitle>
                <DialogDescription>
                  Set up a workspace for a new deliverable or campaign.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[12px] text-text-muted">Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Autumn Campaign"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[12px] text-text-muted">Description</Label>
                  <Textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="What is this project for?"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[12px] text-text-muted">Cover colour</Label>
                    <div className="flex gap-2">
                      {coverColors.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setNewCover(c.id)}
                          aria-pressed={newCover === c.id}
                          className={cn(
                            "size-8 rounded-lg border",
                            c.className,
                            newCover === c.id ? "border-accent-brand" : "border-border",
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[12px] text-text-muted">Cover pattern</Label>
                    <Select value={newPattern} onValueChange={setNewPattern}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {coverPatterns.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[12px] text-text-muted">Tags</Label>
                    <Input
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      placeholder="comma, separated"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[12px] text-text-muted">Template</Label>
                    <Select value={newTemplate} onValueChange={setNewTemplate}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate}>Create project</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-subtle" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects or tags…"
            className="pl-9"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="modified">Last modified</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="progress">Progress</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <SlidersHorizontal className="size-3.5" />
              {filter === "all" ? "All projects" : filter === "favourites" ? "Favourites" : "Archived"}
              <ChevronDown className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilter("all")}>All projects</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("favourites")}>Favourites</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("archived")}>Archived</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex overflow-hidden rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-pressed={view === "grid"}
            className={cn(
              "grid size-9 place-items-center text-text-muted",
              view === "grid" ? "bg-surface-2 text-foreground" : "hover:text-foreground",
            )}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            aria-pressed={view === "list"}
            className={cn(
              "grid size-9 place-items-center border-l border-border text-text-muted",
              view === "list" ? "bg-surface-2 text-foreground" : "hover:text-foreground",
            )}
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects match your search"
          description="Try a different search term or clear the current filters to see all projects."
          action={
            <Button variant="outline" size="sm" onClick={() => { setSearch(""); setFilter("all"); }}>
              Clear filters
            </Button>
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onToggleFavourite={() => toggleFavourite(p.id)}
              onDuplicate={() => duplicateProject(p.id)}
              onArchive={() => archiveProject(p.id)}
              onDelete={() => deleteProject(p.id)}
            />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border">
          {filtered.map((p) => (
            <ProjectRow
              key={p.id}
              project={p}
              onToggleFavourite={() => toggleFavourite(p.id)}
              onDuplicate={() => duplicateProject(p.id)}
              onArchive={() => archiveProject(p.id)}
              onDelete={() => deleteProject(p.id)}
            />
          ))}
        </div>
      )}

      {filter === "all" && archived.length > 0 ? (
        <section>
          <SectionLabel
            aside={
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-text-muted"
                onClick={() => setShowArchived((v) => !v)}
              >
                <ChevronDown className={cn("size-3.5 transition-transform", showArchived && "rotate-180")} />
                {showArchived ? "Hide" : "Show"} {archived.length}
              </Button>
            }
          >
            Archived
          </SectionLabel>
          {showArchived ? (
            <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border">
              {archived.map((p) => (
                <ProjectRow
                  key={p.id}
                  project={p}
                  onToggleFavourite={() => toggleFavourite(p.id)}
                  onDuplicate={() => duplicateProject(p.id)}
                  onArchive={() => archiveProject(p.id)}
                  onDelete={() => deleteProject(p.id)}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function ProjectActionsMenu({
  onDuplicate,
  onFavourite,
  onArchive,
  onDelete,
  favourite,
  archived,
}: {
  onDuplicate: () => void;
  onFavourite: () => void;
  onArchive: () => void;
  onDelete: () => void;
  favourite: boolean;
  archived: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-text-subtle hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem>
          <FolderOpen className="size-3.5" /> Open
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="size-3.5" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onFavourite}>
          <Star className="size-3.5" /> {favourite ? "Unfavourite" : "Favourite"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onArchive}>
          <Archive className="size-3.5" /> {archived ? "Unarchive" : "Archive"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-danger focus:text-danger" onClick={onDelete}>
          <Trash2 className="size-3.5" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProjectCard({
  project,
  onToggleFavourite,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  project: Project;
  onToggleFavourite: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="group flex flex-col rounded-xl border border-border bg-surface transition-colors duration-150 hover:border-accent-brand/40"
    >
      <div className={cn("relative h-24 rounded-t-xl", project.cover)}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onToggleFavourite();
          }}
          className="absolute right-2 top-2 grid size-7 place-items-center rounded-md border border-border bg-surface/80 text-text-muted hover:text-warning"
        >
          <Star className={cn("size-3.5", project.favourite && "fill-warning text-warning")} />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[14px] font-medium leading-snug text-foreground">{project.name}</p>
          <div onClick={(e) => e.preventDefault()}>
            <ProjectActionsMenu
              onDuplicate={onDuplicate}
              onFavourite={onToggleFavourite}
              onArchive={onArchive}
              onDelete={onDelete}
              favourite={project.favourite}
              archived={project.archived}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill tone={statusTone[project.status]}>{project.status}</StatusPill>
          <span className="font-mono text-[11px] text-text-subtle">{project.lastModified}</span>
        </div>
        <div className="space-y-1.5">
          <Progress value={project.progress} className="h-1.5" />
          <p className="font-mono text-[10px] text-text-subtle">{project.progress}% complete</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {project.tags.map((t) => (
            <Badge key={t} variant="secondary" className="bg-surface-2 font-mono text-[10px] font-normal text-text-muted">
              {t}
            </Badge>
          ))}
        </div>
      </div>
    </Link>
  );
}

function ProjectRow({
  project,
  onToggleFavourite,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  project: Project;
  onToggleFavourite: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="flex items-center gap-4 bg-surface px-4 py-3 transition-colors duration-150 hover:bg-surface-2"
    >
      <div className={cn("size-9 shrink-0 rounded-lg", project.cover)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-foreground">{project.name}</p>
        <p className="truncate text-[12px] text-text-subtle">{project.description}</p>
      </div>
      <div className="hidden w-32 sm:block">
        <Progress value={project.progress} className="h-1.5" />
      </div>
      <StatusPill tone={statusTone[project.status]} className="hidden sm:inline-flex">
        {project.status}
      </StatusPill>
      <span className="hidden w-24 shrink-0 font-mono text-[11px] text-text-subtle md:block">
        {project.lastModified}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onToggleFavourite();
        }}
        className="grid size-7 shrink-0 place-items-center text-text-muted hover:text-warning"
      >
        <Star className={cn("size-3.5", project.favourite && "fill-warning text-warning")} />
      </button>
      <div onClick={(e) => e.preventDefault()}>
        <ProjectActionsMenu
          onDuplicate={onDuplicate}
          onFavourite={onToggleFavourite}
          onArchive={onArchive}
          onDelete={onDelete}
          favourite={project.favourite}
          archived={project.archived}
        />
      </div>
    </Link>
  );
}

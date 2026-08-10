import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  CalendarX2,
} from "lucide-react";
import { PageHeader, SectionLabel, EmptyState } from "@/components/app/primitives";
import { StatusPill } from "@/components/app/studio-kit";
import { platforms, pipelineStages, type PlatformId } from "@/lib/creator-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_app/content-planner")({
  head: () => ({
    meta: [
      { title: "Content Planner — CreatorOS AI" },
      {
        name: "description",
        content:
          "Plan publishing across channels on a calendar and timeline that understands production time.",
      },
      { property: "og:title", content: "Content Planner — CreatorOS AI" },
      {
        property: "og:description",
        content:
          "Plan publishing across channels on a calendar and timeline that understands production time.",
      },
    ],
  }),
  component: ContentPlannerPage,
});

type Stage = (typeof pipelineStages)[number];

type ContentCard = {
  id: string;
  title: string;
  platform: PlatformId;
  project: string;
  stage: Stage;
  day: number; // day of month, 1-35 grid index
};

const projects = ["Launch Sprint", "Weekly Series", "Client: Acota", "Personal Brand"];

const monthLabel = "March 2025";
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function seedCards(): ContentCard[] {
  return [
    { id: "c1", title: "Studio tour walkthrough", platform: "youtube", project: "Weekly Series", stage: "Scheduled", day: 3 },
    { id: "c2", title: "Behind the edit — reel", platform: "instagram", project: "Personal Brand", stage: "Draft", day: 5 },
    { id: "c3", title: "5 tools I use daily", platform: "tiktok", project: "Weekly Series", stage: "Idea", day: 5 },
    { id: "c4", title: "Q1 recap carousel", platform: "linkedin", project: "Client: Acota", stage: "Review", day: 9 },
    { id: "c5", title: "Launch teaser thread", platform: "x", project: "Launch Sprint", stage: "Ready", day: 12 },
    { id: "c6", title: "Product walkthrough short", platform: "youtube", project: "Launch Sprint", stage: "Scheduled", day: 14 },
    { id: "c7", title: "Founder AMA clip", platform: "instagram", project: "Personal Brand", stage: "Published", day: 18 },
    { id: "c8", title: "Client testimonial post", platform: "linkedin", project: "Client: Acota", stage: "Draft", day: 21 },
    { id: "c9", title: "Trend remix #4", platform: "tiktok", project: "Weekly Series", stage: "Idea", day: 24 },
    { id: "c10", title: "Newsletter cross-post", platform: "x", project: "Launch Sprint", stage: "Ready", day: 27 },
];
}

const stageTone: Record<Stage, "neutral" | "accent" | "success" | "warning"> = {
  Idea: "neutral",
  Draft: "neutral",
  Review: "warning",
  Ready: "accent",
  Scheduled: "accent",
  Published: "success",
};

function PlatformIcon({ id, className }: { id: PlatformId; className?: string }) {
  const p = platforms.find((pl) => pl.id === id)!;
  return <p.icon className={cn("size-3.5 text-text-subtle", className)} />;
}

function CardActionsMenu({ card }: { card: ContentCard }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="grid size-5 shrink-0 place-items-center rounded text-text-subtle hover:text-foreground"
        >
          <MoreHorizontal className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem>Create</DropdownMenuItem>
        <DropdownMenuItem>Edit</DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuItem>Reschedule</DropdownMenuItem>
        <DropdownMenuItem>Mark complete</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Open content</DropdownMenuItem>
        <DropdownMenuItem>Open project ({card.project})</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MiniCard({
  card,
  onDragStart,
}: {
  card: ContentCard;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      className="group flex cursor-grab flex-col gap-1 rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-left active:cursor-grabbing"
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <PlatformIcon id={card.platform} />
          <span className="truncate text-[11px] text-foreground">{card.title}</span>
        </div>
        <CardActionsMenu card={card} />
      </div>
      <StatusPill tone={stageTone[card.stage]} className="w-fit">
        {card.stage}
      </StatusPill>
    </div>
  );
}

function QuickCreateDialog({
  onCreate,
  trigger,
}: {
  onCreate: (card: Omit<ContentCard, "id">) => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<PlatformId>("youtube");
  const [project, setProject] = useState(projects[0]);
  const [stage, setStage] = useState<Stage>("Idea");
  const [day, setDay] = useState(10);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <Plus className="size-4" /> Quick create
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick create</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-[12px] text-text-muted">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Behind the scenes reel" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[12px] text-text-muted">Platform</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as PlatformId)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[12px] text-text-muted">Project</Label>
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[12px] text-text-muted">Stage</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as Stage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {pipelineStages.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[12px] text-text-muted">Date</Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(e) => setDay(Number(e.target.value) || 1)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={!title.trim()}
            onClick={() => {
              onCreate({ title: title.trim(), platform, project, stage, day });
              setTitle("");
              setOpen(false);
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContentPlannerPage() {
  const [cards, setCards] = useState<ContentCard[]>(seedCards);
  const [view, setView] = useState<"Month" | "Week" | "Day">("Month");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  const filtered = cards.filter(
    (c) =>
      (platformFilter === "all" || c.platform === platformFilter) &&
      (projectFilter === "all" || c.project === projectFilter) &&
      (stageFilter === "all" || c.stage === stageFilter),
  );

  const hasFilters = platformFilter !== "all" || projectFilter !== "all" || stageFilter !== "all";

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/card-id", id);
  }

  function handleDropOnDay(e: React.DragEvent, day: number) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/card-id");
    if (id) {
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, day } : c)));
    }
    setDragOverDay(null);
  }

  function handleDropOnStage(e: React.DragEvent, stage: Stage) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/card-id");
    if (id) {
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, stage } : c)));
    }
  }

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Organize"
        title="Content Planner"
        description="Plan publishing across channels on a calendar and timeline that understands production time."
        actions={<QuickCreateDialog onCreate={(c) => setCards((prev) => [...prev, { ...c, id: `c${Date.now()}` }])} />}
      />

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
            {(["Month", "Week", "Day"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] transition-colors duration-150",
                  view === v ? "bg-surface text-foreground" : "text-text-muted hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-text-subtle">
            <ChevronLeft className="size-3.5" />
            {monthLabel}
            <ChevronRight className="size-3.5" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Platform" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {platforms.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Stage" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {pipelineStages.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters && filtered.length === 0 ? (
          <EmptyState
            icon={CalendarX2}
            title="No content matches these filters"
            description="Try clearing a filter or create new content for this view."
          />
        ) : view === "Month" ? (
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
            {weekdayLabels.map((d) => (
              <div key={d} className="bg-surface-2 px-2 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                {d}
              </div>
            ))}
            {Array.from({ length: 35 }, (_, i) => i + 1).map((day) => {
              const dayCards = filtered.filter((c) => c.day === day);
              return (
                <div
                  key={day}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverDay(day);
                  }}
                  onDragLeave={() => setDragOverDay((d) => (d === day ? null : d))}
                  onDrop={(e) => handleDropOnDay(e, day)}
                  className={cn(
                    "min-h-[104px] space-y-1.5 bg-surface p-1.5 transition-colors duration-100",
                    dragOverDay === day && "bg-accent-tint",
                  )}
                >
                  <p className="px-0.5 font-mono text-[10px] text-text-subtle">{day}</p>
                  {dayCards.length === 0 ? (
                    <p className="px-0.5 text-[10px] text-text-subtle/60">No content</p>
                  ) : (
                    dayCards.map((c) => (
                      <MiniCard key={c.id} card={c} onDragStart={handleDragStart} />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ) : view === "Week" ? (
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
            {weekdayLabels.map((d, i) => (
              <div key={d} className="bg-surface-2 px-2 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                {d} {i + 3}
              </div>
            ))}
            {["Morning", "Midday", "Evening"].map((slot) =>
              weekdayLabels.map((_, i) => {
                const day = i + 3;
                const slotCards = filtered.filter((c) => c.day === day);
                return (
                  <div
                    key={`${slot}-${day}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOverDay(day);
                    }}
                    onDrop={(e) => handleDropOnDay(e, day)}
                    className={cn(
                      "min-h-[84px] space-y-1.5 bg-surface p-1.5",
                      dragOverDay === day && "bg-accent-tint",
                    )}
                  >
                    <p className="px-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-text-subtle">{slot}</p>
                    {slotCards.map((c) => (
                      <MiniCard key={c.id} card={c} onDragStart={handleDragStart} />
                    ))}
                  </div>
                );
              }),
            )}
          </div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDropOnDay(e, 10)}
            className="space-y-3 rounded-xl border border-border bg-surface p-5"
          >
            {filtered.filter((c) => c.day === 10).length === 0 ? (
              <EmptyState
                icon={CalendarX2}
                title="Nothing scheduled today"
                description="Drag a card here or use Quick create to add something for today."
              />
            ) : (
              filtered
                .filter((c) => c.day === 10)
                .map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-2 px-3 py-2.5">
                    <PlatformIcon id={c.platform} className="size-4" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-foreground">{c.title}</p>
                      <p className="text-[11px] text-text-subtle">{c.project}</p>
                    </div>
                    <StatusPill tone={stageTone[c.stage]}>{c.stage}</StatusPill>
                    <CardActionsMenu card={c} />
                  </div>
                ))
            )}
          </div>
        )}
      </section>

      <section>
        <SectionLabel>Content pipeline</SectionLabel>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          {pipelineStages.map((stage) => {
            const stageCards = cards.filter((c) => c.stage === stage);
            return (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDropOnStage(e, stage)}
                className="flex min-h-[220px] flex-col gap-2 rounded-xl border border-border bg-surface p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">{stage}</p>
                  <span className="font-mono text-[10px] text-text-subtle">{stageCards.length}</span>
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  {stageCards.map((c) => (
                    <MiniCard key={c.id} card={c} onDragStart={handleDragStart} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

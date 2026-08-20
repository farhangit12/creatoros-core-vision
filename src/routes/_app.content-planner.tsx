import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  AlertTriangle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
  CalendarX2,
  X,
} from "lucide-react";
import { PageHeader, SectionLabel, EmptyState } from "@/components/app/primitives";
import { StatusPill, WireLine } from "@/components/app/studio-kit";
import { platforms, pipelineStages, type PlatformId } from "@/lib/creator-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { listProjects } from "@/lib/server/projects";
import {
  createPlannerItem,
  deletePlannerItem,
  listPlannerItems,
  updatePlannerItem,
  type PlannerItemRecord,
} from "@/lib/server/planner";

const PLATFORM_IDS = ["youtube", "instagram", "tiktok", "linkedin", "x"] as const;

export const Route = createFileRoute("/_app/content-planner")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { title?: string; platform?: (typeof PLATFORM_IDS)[number]; coverImage?: string } => ({
    ...(typeof search["title"] === "string" ? { title: search["title"] } : {}),
    ...(PLATFORM_IDS.includes(search["platform"] as (typeof PLATFORM_IDS)[number])
      ? { platform: search["platform"] as (typeof PLATFORM_IDS)[number] }
      : {}),
    ...(typeof search["coverImage"] === "string" ? { coverImage: search["coverImage"] } : {}),
  }),
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

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

type FormValues = {
  title: string;
  platform: PlatformId;
  projectId: string | null;
  stage: Stage;
  date: Date;
  coverImage: string | null;
};

const NO_PROJECT_VALUE = "none";

function toDateInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function fromDateInputValue(value: string, fallback: Date): Date {
  if (!value) return fallback;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return fallback;
  return new Date(year, month - 1, day);
}

function ContentItemDialog({
  open,
  onOpenChange,
  isEdit,
  initial,
  defaultDate,
  projectOptions,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEdit: boolean;
  initial?: Partial<FormValues> | undefined;
  defaultDate: Date;
  projectOptions: { id: string; name: string }[];
  onSubmit: (values: FormValues) => void;
  submitting: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [platform, setPlatform] = useState<PlatformId>(initial?.platform ?? "youtube");
  const [projectId, setProjectId] = useState<string>(initial?.projectId ?? NO_PROJECT_VALUE);
  const [stage, setStage] = useState<Stage>(initial?.stage ?? "Idea");
  const [date, setDate] = useState<Date>(initial?.date ?? defaultDate);
  const [coverImage, setCoverImage] = useState<string | null>(initial?.coverImage ?? null);

  function reset() {
    setTitle(initial?.title ?? "");
    setPlatform(initial?.platform ?? "youtube");
    setProjectId(initial?.projectId ?? NO_PROJECT_VALUE);
    setStage(initial?.stage ?? "Idea");
    setDate(initial?.date ?? defaultDate);
    setCoverImage(initial?.coverImage ?? null);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit content" : "Quick create"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-[12px] text-text-muted">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Behind the scenes reel" />
          </div>
          {coverImage ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/60 p-2.5">
              <div className="size-14 shrink-0 overflow-hidden rounded-md bg-surface-3">
                <img src={coverImage} alt="" className="size-full object-cover" />
              </div>
              <p className="flex-1 text-[12px] text-text-muted">Cover image attached</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setCoverImage(null)}
                aria-label="Remove cover image"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          ) : null}
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
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROJECT_VALUE}>No project</SelectItem>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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
                type="date"
                value={toDateInputValue(date)}
                onChange={(e) => setDate(fromDateInputValue(e.target.value, date))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            disabled={!title.trim() || submitting}
            onClick={() =>
              onSubmit({
                title: title.trim(),
                platform,
                projectId: projectId === NO_PROJECT_VALUE ? null : projectId,
                stage,
                date,
                coverImage,
              })
            }
          >
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CardActionsMenu({
  card,
  projectName,
  onEdit,
  onDuplicate,
  onDelete,
  onOpenProject,
}: {
  card: PlannerItemRecord;
  projectName: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenProject?: (() => void) | undefined;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Options for ${card.title}`}
          className="grid size-5 shrink-0 place-items-center rounded text-text-subtle hover:text-foreground"
        >
          <MoreHorizontal className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>Duplicate</DropdownMenuItem>
        <DropdownMenuSeparator />
        {onOpenProject ? (
          <DropdownMenuItem onClick={onOpenProject}>Open project ({projectName})</DropdownMenuItem>
        ) : null}
        <DropdownMenuItem className="text-danger focus:text-danger" onClick={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MiniCard({
  card,
  projectName,
  onDragStart,
  onEdit,
  onDuplicate,
  onDelete,
  onOpenProject,
}: {
  card: PlannerItemRecord;
  projectName: string;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenProject?: (() => void) | undefined;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      className="group flex cursor-grab flex-col gap-1 rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-left active:cursor-grabbing"
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {card.coverImage ? (
            <img src={card.coverImage} alt="" className="size-4 shrink-0 rounded object-cover" />
          ) : (
            <PlatformIcon id={card.platform as PlatformId} />
          )}
          <span className="truncate text-[11px] text-foreground">{card.title}</span>
        </div>
        <CardActionsMenu
          card={card}
          projectName={projectName}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onOpenProject={onOpenProject}
        />
      </div>
      <StatusPill tone={stageTone[card.stage as Stage]} className="w-fit">
        {card.stage}
      </StatusPill>
    </div>
  );
}

const PLANNER_QUERY_KEY = ["planner-items"] as const;
const PROJECTS_QUERY_KEY = ["projects"] as const;

function ContentPlannerPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const listPlannerItemsFn = useServerFn(listPlannerItems);
  const listProjectsFn = useServerFn(listProjects);
  const createItemFn = useServerFn(createPlannerItem);
  const updateItemFn = useServerFn(updatePlannerItem);
  const deleteItemFn = useServerFn(deletePlannerItem);

  const {
    data: cards = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({ queryKey: PLANNER_QUERY_KEY, queryFn: () => listPlannerItemsFn() });

  const { data: projectOptions = [] } = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: () => listProjectsFn(),
  });

  const projectsById = useMemo(() => new Map(projectOptions.map((p) => [p.id, p.name])), [projectOptions]);

  function invalidatePlannerData() {
    queryClient.invalidateQueries({ queryKey: PLANNER_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  }

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      createItemFn({
        data: {
          title: values.title,
          platform: values.platform,
          projectId: values.projectId,
          stage: values.stage,
          coverImage: values.coverImage,
          day: values.date.getDate(),
          scheduledAt: values.date,
        },
      }),
    onSuccess: () => {
      invalidatePlannerData();
      setDialogState(null);
      toast.success("Content created");
    },
    onError: () => toast.error("Couldn't create content. Try again."),
  });

  const updateMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateItemFn>[0]) => updateItemFn(input),
    onSuccess: () => {
      invalidatePlannerData();
    },
    onError: () => toast.error("Couldn't update content. Try again."),
  });

  const editMutation = useMutation({
    mutationFn: (values: FormValues & { id: string }) =>
      updateItemFn({
        data: {
          id: values.id,
          title: values.title,
          platform: values.platform,
          projectId: values.projectId,
          stage: values.stage,
          coverImage: values.coverImage,
          day: values.date.getDate(),
          scheduledAt: values.date,
        },
      }),
    onSuccess: () => {
      invalidatePlannerData();
      setDialogState(null);
      toast.success("Content updated");
    },
    onError: () => toast.error("Couldn't update content. Try again."),
  });

  const duplicateMutation = useMutation({
    mutationFn: (card: PlannerItemRecord) =>
      createItemFn({
        data: {
          title: `${card.title} (copy)`,
          platform: card.platform as PlatformId,
          projectId: card.projectId,
          stage: card.stage as Stage,
          coverImage: card.coverImage,
          day: card.day,
          scheduledAt: card.scheduledAt,
        },
      }),
    onSuccess: () => {
      invalidatePlannerData();
      toast.success("Content duplicated");
    },
    onError: () => toast.error("Couldn't duplicate content. Try again."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteItemFn({ data: { id } }),
    onSuccess: () => {
      invalidatePlannerData();
      toast("Content deleted");
    },
    onError: () => toast.error("Couldn't delete content. Try again."),
  });

  const [view, setView] = useState<"Month" | "Week" | "Day">("Month");
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [dialogState, setDialogState] = useState<
    | { mode: "create"; prefill?: { title: string; platform: PlatformId; coverImage: string | null } }
    | { mode: "edit"; card: PlannerItemRecord }
    | null
  >(null);

  const search = Route.useSearch();
  useEffect(() => {
    if (!search.title) return;
    setDialogState({
      mode: "create",
      prefill: {
        title: search.title,
        platform: search.platform ?? "youtube",
        coverImage: search.coverImage ?? null,
      },
    });
    void navigate({ to: "/content-planner", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.title, search.platform, search.coverImage]);

  function goToPrevious() {
    setViewDate((d) => (view === "Month" ? addMonths(d, -1) : view === "Week" ? addWeeks(d, -1) : addDays(d, -1)));
  }

  function goToNext() {
    setViewDate((d) => (view === "Month" ? addMonths(d, 1) : view === "Week" ? addWeeks(d, 1) : addDays(d, 1)));
  }

  const headerLabel =
    view === "Month"
      ? format(viewDate, "MMMM yyyy")
      : view === "Week"
        ? `${format(startOfWeek(viewDate), "MMM d")} – ${format(endOfWeek(viewDate), "MMM d, yyyy")}`
        : format(viewDate, "EEEE, MMM d, yyyy");

  const filtered = cards.filter(
    (c) =>
      (platformFilter === "all" || c.platform === platformFilter) &&
      (projectFilter === "all" || c.projectId === projectFilter) &&
      (stageFilter === "all" || c.stage === stageFilter),
  );

  const hasFilters = platformFilter !== "all" || projectFilter !== "all" || stageFilter !== "all";

  const monthGridDays = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(viewDate));
    const gridEnd = endOfWeek(endOfMonth(viewDate));
    const days: Date[] = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
      days.push(d);
    }
    return days;
  }, [viewDate]);

  const weekViewDays = useMemo(() => {
    const weekStart = startOfWeek(viewDate);
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [viewDate]);

  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/card-id", id);
  }

  function handleDropOnDate(e: React.DragEvent, date: Date) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/card-id");
    if (id) {
      updateMutation.mutate({ data: { id, day: date.getDate(), scheduledAt: date } });
    }
    setDragOverDay(null);
  }

  function handleDropOnStage(e: React.DragEvent, stage: Stage) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/card-id");
    if (id) {
      updateMutation.mutate({ data: { id, stage } });
    }
  }

  function openEdit(card: PlannerItemRecord) {
    setDialogState({ mode: "edit", card });
  }

  function renderCard(c: PlannerItemRecord) {
    const projectName = c.projectId ? (projectsById.get(c.projectId) ?? "Unknown project") : "No project";
    return (
      <MiniCard
        key={c.id}
        card={c}
        projectName={projectName}
        onDragStart={handleDragStart}
        onEdit={() => openEdit(c)}
        onDuplicate={() => duplicateMutation.mutate(c)}
        onDelete={() => deleteMutation.mutate(c.id)}
        onOpenProject={
          c.projectId ? () => navigate({ to: "/projects/$projectId", params: { projectId: c.projectId! } }) : undefined
        }
      />
    );
  }

  const dialogInitial: Partial<FormValues> | undefined =
    dialogState?.mode === "edit"
      ? {
          title: dialogState.card.title,
          platform: dialogState.card.platform as PlatformId,
          projectId: dialogState.card.projectId,
          stage: dialogState.card.stage as Stage,
          date: new Date(dialogState.card.scheduledAt),
          coverImage: dialogState.card.coverImage,
        }
      : dialogState?.mode === "create"
        ? dialogState.prefill
        : undefined;

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Organize"
        title="Content Planner"
        description="Plan publishing across channels on a calendar and timeline that understands production time."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setDialogState({ mode: "create" })}>
            <Plus className="size-4" /> Quick create
          </Button>
        }
      />

      <ContentItemDialog
        key={dialogState === null ? "closed" : dialogState.mode === "edit" ? dialogState.card.id : "create"}
        open={dialogState !== null}
        onOpenChange={(open) => {
          if (!open) setDialogState(null);
        }}
        isEdit={dialogState?.mode === "edit"}
        initial={dialogInitial}
        defaultDate={viewDate}
        projectOptions={projectOptions}
        submitting={createMutation.isPending || editMutation.isPending}
        onSubmit={(values) => {
          if (dialogState?.mode === "edit") {
            editMutation.mutate({ ...values, id: dialogState.card.id });
          } else {
            createMutation.mutate(values);
          }
        }}
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
            <button
              type="button"
              onClick={goToPrevious}
              aria-label={`Previous ${view.toLowerCase()}`}
              className="rounded p-0.5 text-text-subtle transition-colors hover:text-foreground"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            {headerLabel}
            <button
              type="button"
              onClick={goToNext}
              aria-label={`Next ${view.toLowerCase()}`}
              className="rounded p-0.5 text-text-subtle transition-colors hover:text-foreground"
            >
              <ChevronRight className="size-3.5" />
            </button>
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
              {projectOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
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

        {isLoading ? (
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
            {Array.from({ length: 35 }, (_, i) => (
              <WireLine key={i} className="min-h-[104px] rounded-none" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Couldn't load the content planner"
            description="Something went wrong reaching the server. Try again."
            action={
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        ) : hasFilters && filtered.length === 0 ? (
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
            {monthGridDays.map((date) => {
              const dayCards = filtered.filter((c) => isSameDay(new Date(c.scheduledAt), date));
              const key = date.getTime();
              const inCurrentMonth = isSameMonth(date, viewDate);
              const isToday = isSameDay(date, new Date());
              return (
                <div
                  key={key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverDay(key);
                  }}
                  onDragLeave={() => setDragOverDay((d) => (d === key ? null : d))}
                  onDrop={(e) => handleDropOnDate(e, date)}
                  className={cn(
                    "min-h-[104px] space-y-1.5 bg-surface p-1.5 transition-colors duration-100",
                    !inCurrentMonth && "opacity-40",
                    dragOverDay === key && "bg-accent-tint",
                  )}
                >
                  <p
                    className={cn(
                      "px-0.5 font-mono text-[10px] text-text-subtle",
                      isToday && "font-semibold text-accent-brand",
                    )}
                  >
                    {date.getDate()}
                  </p>
                  {dayCards.length === 0 ? (
                    <p className="px-0.5 text-[10px] text-text-subtle/60">No content</p>
                  ) : (
                    dayCards.map((c) => renderCard(c))
                  )}
                </div>
              );
            })}
          </div>
        ) : view === "Week" ? (
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
            {weekViewDays.map((date) => (
              <div key={date.getTime()} className="bg-surface-2 px-2 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                {format(date, "EEE d")}
              </div>
            ))}
            {weekViewDays.map((date) => {
              const dayCards = filtered.filter((c) => isSameDay(new Date(c.scheduledAt), date));
              const key = date.getTime();
              return (
                <div
                  key={key}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverDay(key);
                  }}
                  onDragLeave={() => setDragOverDay((d) => (d === key ? null : d))}
                  onDrop={(e) => handleDropOnDate(e, date)}
                  className={cn(
                    "min-h-[220px] space-y-1.5 bg-surface p-1.5 transition-colors duration-100",
                    dragOverDay === key && "bg-accent-tint",
                  )}
                >
                  {dayCards.length === 0 ? (
                    <p className="px-0.5 text-[10px] text-text-subtle/60">No content</p>
                  ) : (
                    dayCards.map((c) => renderCard(c))
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDropOnDate(e, viewDate)}
            className="space-y-3 rounded-xl border border-border bg-surface p-5"
          >
            {filtered.filter((c) => isSameDay(new Date(c.scheduledAt), viewDate)).length === 0 ? (
              <EmptyState
                icon={CalendarX2}
                title="Nothing scheduled for this day"
                description="Drag a card here or use Quick create to add something for this day."
              />
            ) : (
              filtered
                .filter((c) => isSameDay(new Date(c.scheduledAt), viewDate))
                .map((c) => {
                  const projectName = c.projectId ? (projectsById.get(c.projectId) ?? "Unknown project") : "No project";
                  return (
                    <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-2 px-3 py-2.5">
                      {c.coverImage ? (
                        <img src={c.coverImage} alt="" className="size-9 shrink-0 rounded-md object-cover" />
                      ) : (
                        <PlatformIcon id={c.platform as PlatformId} className="size-4" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-foreground">{c.title}</p>
                        <p className="text-[11px] text-text-subtle">{projectName}</p>
                      </div>
                      <StatusPill tone={stageTone[c.stage as Stage]}>{c.stage}</StatusPill>
                      <CardActionsMenu
                        card={c}
                        projectName={projectName}
                        onEdit={() => openEdit(c)}
                        onDuplicate={() => duplicateMutation.mutate(c)}
                        onDelete={() => deleteMutation.mutate(c.id)}
                        onOpenProject={
                          c.projectId
                            ? () => navigate({ to: "/projects/$projectId", params: { projectId: c.projectId! } })
                            : undefined
                        }
                      />
                    </div>
                  );
                })
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
                  {stageCards.map((c) => renderCard(c))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

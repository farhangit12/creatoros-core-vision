import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, CalendarX2, LayoutGrid, List, Plus } from "lucide-react";
import {
  EmptyState,
  PageHeader,
  PhaseBadge,
  SectionLabel,
} from "@/components/app/primitives";
import { platforms, type PlatformId } from "@/lib/creator-data";
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

export const Route = createFileRoute("/_app/upcoming")({
  head: () => ({
    meta: [
      { title: "Upcoming — CreatorOS AI" },
      {
        name: "description",
        content:
          "Scheduled and planned items across your CreatorOS AI workspace.",
      },
      { property: "og:title", content: "Upcoming — CreatorOS AI" },
      {
        property: "og:description",
        content: "Everything scheduled across your workspace.",
      },
    ],
  }),
  component: UpcomingPage,
});

const reference = [
  {
    date: "Thu 28",
    items: [
      { time: "09:00", title: "Episode 42 — final cut review", status: "Scheduled" },
      { time: "14:30", title: "Newsletter draft due", status: "Draft" },
    ],
  },
  {
    date: "Sat 30",
    items: [{ time: "11:00", title: "Short-form batch publish", status: "Queued" }],
  },
];

const statusTone: Record<string, string> = {
  Scheduled: "text-accent-brand border-accent-brand/30",
  Draft: "text-text-muted border-border",
  Queued: "text-warning border-warning/30",
};

const projects = ["Launch Sprint", "Weekly Series", "Client: Acota", "Personal Brand"];

function QuickCreateDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<PlatformId>("youtube");
  const [project, setProject] = useState(projects[0]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> Quick create
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick create</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-[12px] text-text-muted">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Publish episode 43" />
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!title.trim()} onClick={() => setOpen(false)}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UpcomingPage() {
  const [view, setView] = useState<"list" | "calendar">("list");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const isEmpty = true;

  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Workspace"
        title="Upcoming"
        description="Deadlines, publishing slots and reminders will collect here once scheduling is connected."
        actions={
          <div className="flex items-center gap-2">
            <QuickCreateDialog />
            <PhaseBadge />
          </div>
        }
      />

      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionLabel>Your schedule</SectionLabel>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] transition-colors duration-150",
                view === "list" ? "bg-surface text-foreground" : "text-text-muted hover:text-foreground",
              )}
            >
              <List className="size-3.5" /> List
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] transition-colors duration-150",
                view === "calendar" ? "bg-surface text-foreground" : "text-text-muted hover:text-foreground",
              )}
            >
              <LayoutGrid className="size-3.5" /> Calendar
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
              {projects.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Scheduled">Scheduled</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Queued">Queued</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {view === "calendar" ? (
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="bg-surface-2 px-2 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
                {d}
              </div>
            ))}
            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
              <div key={day} className="min-h-[64px] bg-surface p-1.5">
                <p className="font-mono text-[10px] text-text-subtle">{day}</p>
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <EmptyState
            icon={CalendarX2}
            title="Nothing scheduled"
            description="You have no scheduled items yet. Plan content on the calendar or draft a script to get something in the queue."
            action={
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/content-planner">Open Content Planner</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/script-studio">Draft in Script Studio</Link>
                </Button>
              </div>
            }
          />
        ) : null}
      </section>

      <section>
        <SectionLabel
          aside={
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
              interface reference only
            </span>
          }
        >
          Populated state
        </SectionLabel>
        <div className="space-y-8 rounded-2xl border border-dashed border-border p-7 opacity-70">
          {reference.map((day) => (
            <div key={day.date} className="grid gap-4 sm:grid-cols-[92px_1fr]">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-subtle">
                {day.date}
              </p>
              <ul className="space-y-3">
                {day.items.map((i) => (
                  <li
                    key={i.title}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border-subtle pb-3 last:border-0 last:pb-0"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <CalendarClock className="size-4 shrink-0 text-text-subtle" />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] text-foreground">
                          {i.title}
                        </span>
                        <span className="font-mono text-[11px] text-text-subtle">
                          {i.time}
                        </span>
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]",
                        statusTone[i.status],
                      )}
                    >
                      {i.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

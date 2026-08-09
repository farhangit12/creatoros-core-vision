import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  FileText,
  FolderPlus,
  History,
  ImageIcon,
  MessagesSquare,
  Sparkles,
  FolderKanban,
  CalendarClock,
} from "lucide-react";
import {
  EmptyState,
  PhaseBadge,
  SectionLabel,
} from "@/components/app/primitives";
import { Button } from "@/components/ui/button";
import type { LinkProps } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CreatorOS AI" },
      {
        name: "description",
        content:
          "Your CreatorOS AI home: quick actions, recent projects and workspace activity.",
      },
      { property: "og:title", content: "Dashboard — CreatorOS AI" },
      {
        property: "og:description",
        content: "Your creative operating system, ready when you are.",
      },
    ],
  }),
  component: DashboardPage,
});

type Action = {
  title: string;
  body: string;
  icon: typeof FolderPlus;
  to: LinkProps["to"] & string;
  primary?: boolean;
  later?: boolean;
};

const actions: Action[] = [
  {
    title: "Create project",
    body: "Open a new workspace for a client, series or campaign.",
    icon: FolderPlus,
    to: "/projects",
    primary: true,
    later: true,
  },
  {
    title: "New AI chat",
    body: "Think out loud with an assistant that knows your voice.",
    icon: MessagesSquare,
    to: "/chat",
    later: true,
  },
  {
    title: "Generate script",
    body: "Go from a rough premise to a structured draft.",
    icon: FileText,
    to: "/script-studio",
    later: true,
  },
  {
    title: "Generate thumbnail",
    body: "Compose a frame that earns the click.",
    icon: ImageIcon,
    to: "/thumbnail-studio",
    later: true,
  },
];

function DashboardPage() {
  return (
    <div className="space-y-14">
      <section className="relative">
        <p className="label-eyebrow">Tuesday · 21:04 · Studio plan</p>
        <h1 className="mt-4 text-display max-w-3xl text-foreground">
          Good evening, Alex.
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-text-muted">
          Your creative workspace is ready. Nothing is scheduled for tonight —
          a good window for deep work.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button asChild size="sm">
            <Link to="/projects">
              Start a project <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
          <span className="font-mono text-[11px] text-text-subtle">
            or press ⌘K to jump anywhere
          </span>
        </div>
      </section>

      <section>
        <SectionLabel aside={<PhaseBadge />}>Quick actions</SectionLabel>
        <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <Link
            to={actions[0].to}
            className="group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-7 transition-colors duration-200 hover:border-accent-brand/40 hover:bg-surface-2"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(70% 90% at 100% 0%, var(--accent-tint), transparent 65%)",
              }}
            />
            <span className="relative grid size-10 place-items-center rounded-xl border border-border bg-surface-2 text-accent-brand">
              <FolderPlus className="size-[18px]" />
            </span>
            <span className="relative mt-8 block">
              <span className="block text-[20px] font-medium tracking-[-0.02em] text-foreground">
                Create project
              </span>
              <span className="mt-2 block max-w-sm text-sm leading-relaxed text-text-muted">
                Open a new workspace for a client, series or campaign — briefs,
                scripts, assets and schedule in one place.
              </span>
              <span className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                Coming in a later phase
                <ArrowUpRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </span>
          </Link>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 lg:gap-3">
            {actions.slice(1).map((a) => (
              <Link
                key={a.title}
                to={a.to}
                className="group flex items-start gap-4 rounded-xl border border-border bg-surface p-5 transition-colors duration-200 hover:border-accent-brand/40 hover:bg-surface-2"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-text-muted transition-colors group-hover:text-accent-brand">
                  <a.icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium text-foreground">
                    {a.title}
                  </span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-text-subtle">
                    {a.body}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-10 lg:grid-cols-2">
        <div>
          <SectionLabel
            aside={
              <Link
                to="/projects"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle transition-colors hover:text-accent-brand"
              >
                View all
              </Link>
            }
          >
            Recent projects
          </SectionLabel>
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Projects group everything you make — briefs, scripts, assets and schedule — into one surface."
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/projects">Create your first project</Link>
              </Button>
            }
          />
        </div>

        <div>
          <SectionLabel>Recent activity</SectionLabel>
          <EmptyState
            icon={History}
            title="Nothing has happened yet"
            description="Generations, edits and shares will appear here as a chronological trail of your work."
          />
        </div>
      </section>

      <section>
        <SectionLabel aside={<PhaseBadge />}>Upcoming</SectionLabel>
        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-text-muted">
              <CalendarClock className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-foreground">
                Scheduling isn't live yet
              </p>
              <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-text-muted">
                Publishing dates, reminders and content deadlines will surface
                here once the planner ships.
              </p>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link to="/upcoming">
              Preview the surface <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="flex items-center gap-3 border-t border-border-subtle pt-8 text-[13px] text-text-subtle">
        <Sparkles className="size-4 shrink-0 text-accent-brand" />
        <p>
          This is a design prototype. No data is stored and no AI models are
          connected.
        </p>
      </section>
    </div>
  );
}
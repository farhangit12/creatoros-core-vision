import { createFileRoute, Link } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpRight,
  FileText,
  FolderPlus,
  History,
  ImageIcon,
  MessagesSquare,
  Sparkles,
  FolderKanban,
  Upload,
  Wand2,
  PlayCircle,
} from "lucide-react";
import {
  EmptyState,
  SectionLabel,
} from "@/components/app/primitives";
import { StatusPill, WireLine, type StateTone } from "@/components/app/studio-kit";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { getDashboardSummary } from "@/lib/server/dashboard";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — CreatorOS AI" },
      {
        name: "description",
        content:
          "Your CreatorOS AI home: quick actions, recent projects, generations, credits and what is coming up.",
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

type To = LinkProps["to"] & string;

const quickActions: {
  title: string;
  body: string;
  icon: typeof FolderPlus;
  to: To;
}[] = [
  {
    title: "New AI chat",
    body: "Think out loud with an assistant that knows your voice.",
    icon: MessagesSquare,
    to: "/chat",
  },
  {
    title: "Generate script",
    body: "Go from a rough premise to a structured draft.",
    icon: FileText,
    to: "/script-studio",
  },
  {
    title: "Create image",
    body: "Brand-consistent visuals from a prompt or reference.",
    icon: Wand2,
    to: "/image-studio",
  },
  {
    title: "Create thumbnail",
    body: "Compose a frame that earns the click.",
    icon: ImageIcon,
    to: "/thumbnail-studio",
  },
  {
    title: "Upload file",
    body: "Bring footage, briefs and references into the workspace.",
    icon: Upload,
    to: "/files",
  },
];

const statusTone: Record<string, StateTone> = {
  Idea: "neutral",
  "In progress": "accent",
  Review: "warning",
  Published: "success",
  Archived: "neutral",
};

function DashboardPage() {
  const { data: session } = useSession();
  const firstName = session?.user.name?.trim().split(/\s+/)[0];

  const getDashboardSummaryFn = useServerFn(getDashboardSummary);
  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => getDashboardSummaryFn(),
  });

  const stats = [
    { label: "Projects", value: isLoading ? "…" : String(summary?.projectsCount ?? 0), note: "total" },
    { label: "Scheduled", value: isLoading ? "…" : String(summary?.scheduledCount ?? 0), note: "next 30 days" },
  ];

  return (
    <div className="space-y-14">
      <section className="relative">
        <p className="label-eyebrow">Workspace</p>
        <h1 className="mt-4 text-display max-w-3xl text-foreground">
          {firstName ? `Good to see you, ${firstName}.` : "Good to see you."}
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-text-muted">
          Your creative workspace is ready.
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
        <SectionLabel>Quick actions</SectionLabel>
        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <Link
            to="/projects"
            className="group relative flex min-h-[240px] flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-7 transition-colors duration-200 hover:border-accent-brand/40 hover:bg-surface-2"
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
                Open projects
                <ArrowUpRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </span>
          </Link>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {quickActions.map((a) => (
              <Link
                key={a.title}
                to={a.to}
                className="group flex items-start gap-4 rounded-xl border border-border bg-surface p-4 transition-colors duration-200 hover:border-accent-brand/40 hover:bg-surface-2"
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

      <section>
        <SectionLabel>Continue where you left off</SectionLabel>
        <div className="rounded-2xl border border-dashed border-border p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-text-muted">
                <PlayCircle className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-foreground">
                  Nothing in progress
                </p>
                <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-text-muted">
                  Drafts, unfinished generations and open studio sessions will
                  reappear here so you can pick up mid-thought.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link to="/script-studio">Start a draft</Link>
            </Button>
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
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => (
                <WireLine key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : summary && summary.recentProjects.length > 0 ? (
            <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border">
              {summary.recentProjects.map((p) => (
                <Link
                  key={p.id}
                  to="/projects/$projectId"
                  params={{ projectId: p.id }}
                  className="flex items-center justify-between gap-4 bg-surface px-4 py-3 transition-colors duration-150 hover:bg-surface-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">{p.name}</p>
                    <p className="font-mono text-[11px] text-text-subtle">
                      Updated {formatDistanceToNow(p.updatedAt, { addSuffix: true })}
                    </p>
                  </div>
                  <StatusPill tone={statusTone[p.status] ?? "neutral"}>{p.status}</StatusPill>
                </Link>
              ))}
            </div>
          ) : (
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
          )}
        </div>

        <div>
          <SectionLabel
            aside={
              <Link
                to="/ai-usage"
                className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle transition-colors hover:text-accent-brand"
              >
                Usage
              </Link>
            }
          >
            Recent AI generations
          </SectionLabel>
          <EmptyState
            icon={Sparkles}
            title="No generations yet"
            description="Scripts, images, thumbnails and chat replies you generate will be listed here with their credit cost."
            action={
              <Button asChild variant="outline" size="sm">
                <Link to="/chat">Open AI chat</Link>
              </Button>
            }
          />
        </div>
      </section>

      <section className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <SectionLabel>Recent activity</SectionLabel>
          <EmptyState
            icon={History}
            title="Nothing has happened yet"
            description="Generations, edits and shares will appear here as a chronological trail of your work."
          />
        </div>

        <div>
          <SectionLabel>AI credits</SectionLabel>
          <div className="rounded-2xl border border-dashed border-border p-7">
            <p className="text-[14px] text-foreground">Not available yet</p>
            <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-text-subtle">
              Credit balance and plan details will show here once billing is
              connected.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/ai-usage">Usage breakdown</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/billing">Billing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionLabel>Workspace stats</SectionLabel>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
                {s.label}
              </p>
              <p className="mt-3 font-mono text-[26px] leading-none text-foreground">
                {s.value}
              </p>
              <p className="mt-2 text-[12px] text-text-subtle">{s.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

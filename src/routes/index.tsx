import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FolderKanban, Sparkles, SquarePen } from "lucide-react";
import { BrandLockup } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CreatorOS AI — Everything you create. One workspace." },
      {
        name: "description",
        content:
          "Create, organise and refine your content with AI in one place.",
      },
      { property: "og:title", content: "CreatorOS AI" },
      {
        property: "og:description",
        content: "Everything you create. One workspace.",
      },
    ],
  }),
  component: Landing,
});

const capabilities = [
  {
    icon: SquarePen,
    title: "Plan content",
    body: "Map out what you're publishing and when, across every channel, on one calendar.",
  },
  {
    icon: Sparkles,
    title: "Create with AI",
    body: "Draft scripts, generate images and build thumbnails with AI assistance built into the workflow.",
  },
  {
    icon: FolderKanban,
    title: "Manage projects and assets",
    body: "Keep briefs, drafts, files and schedules together in one project, not scattered across tools.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen brand-wash">
      <header className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between px-5 sm:px-8">
        <BrandLockup />
        <nav className="flex items-center gap-1 sm:gap-2">
          <a
            href="#about"
            className="hidden h-9 items-center rounded-md px-3 text-[13px] text-text-muted transition-colors hover:text-foreground sm:flex"
          >
            About
          </a>
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/signup">Get Started</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">
        <section className="border-b border-border-subtle py-24 sm:py-32">
          <h1 className="max-w-3xl text-display text-foreground">
            Everything you create.
            <br />
            One workspace.
          </h1>
          <p className="mt-7 max-w-xl text-[16px] leading-relaxed text-text-muted">
            Create, organise and refine your content with AI in one place.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild className="h-10">
              <Link to="/signup">
                Get Started <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section id="about" className="border-b border-border-subtle py-20 sm:py-24">
          <p className="label-eyebrow">About</p>
          <p className="mt-5 max-w-2xl text-[20px] leading-relaxed tracking-[-0.01em] text-foreground">
            CreatorOS brings content planning, creation, AI tools, projects
            and assets into one workspace for creators.
          </p>
        </section>

        <section className="border-b border-border-subtle py-20 sm:py-24">
          <p className="label-eyebrow">Core capabilities</p>
          <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border-subtle bg-border md:grid-cols-3">
            {capabilities.map((c) => (
              <div key={c.title} className="bg-background p-8 md:p-10">
                <c.icon className="size-4 text-accent-brand" />
                <h2 className="mt-6 text-[17px] font-medium tracking-[-0.02em] text-foreground">
                  {c.title}
                </h2>
                <p className="mt-3 text-[14px] leading-relaxed text-text-muted">
                  {c.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-20 text-center sm:py-24">
          <h2 className="text-[28px] font-medium tracking-[-0.02em] text-foreground">
            Ready to create?
          </h2>
          <div className="mt-7 flex justify-center">
            <Button asChild className="h-10">
              <Link to="/signup">
                Create your workspace <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border-subtle py-10 text-[13px] text-text-subtle">
          <span>© 2026 CreatorOS AI</span>
        </footer>
      </main>
    </div>
  );
}

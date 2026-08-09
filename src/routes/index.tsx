import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Command, Layers, Sparkles } from "lucide-react";
import { BrandLockup } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CreatorOS AI — The creative operating system" },
      {
        name: "description",
        content:
          "One workspace for scripts, thumbnails, projects and publishing. CreatorOS AI is the creative operating system for independent creators.",
      },
      { property: "og:title", content: "CreatorOS AI" },
      {
        property: "og:description",
        content: "One workspace for everything you make.",
      },
    ],
  }),
  component: Landing,
});

const pillars = [
  {
    icon: Sparkles,
    title: "AI-first, not AI-flavoured",
    body: "Generation lives inside the work — scripts, frames, plans — not behind a chat box bolted onto a dashboard.",
  },
  {
    icon: Layers,
    title: "One surface for the studio",
    body: "Projects, files, planning and publishing share the same structure, so nothing lives in a second tool.",
  },
  {
    icon: Command,
    title: "Built for keyboard people",
    body: "⌘K reaches every project, file and action. The interface stays out of your way.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen brand-wash">
      <header className="mx-auto flex h-16 w-full max-w-[1180px] items-center justify-between px-5 sm:px-8">
        <BrandLockup />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">
        <section className="border-b border-border-subtle py-24 sm:py-32">
          <p className="label-eyebrow">Creative operating system · v0 prototype</p>
          <h1 className="mt-6 max-w-4xl text-display text-foreground">
            Everything you make,
            <br />
            in one operating system.
          </h1>
          <p className="mt-7 max-w-xl text-[16px] leading-relaxed text-text-muted">
            CreatorOS AI gives independent creators a single, disciplined
            workspace for scripts, thumbnails, projects, planning and publishing
            — with AI where it actually helps.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button asChild className="h-10">
              <Link to="/signup">
                Create your workspace <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-10 bg-transparent">
              <Link to="/dashboard">Explore the prototype</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-px overflow-hidden border-b border-border-subtle bg-border md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="bg-background p-8 md:p-10">
              <p.icon className="size-4 text-accent-brand" />
              <h2 className="mt-6 text-[17px] font-medium tracking-[-0.02em] text-foreground">
                {p.title}
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-text-muted">
                {p.body}
              </p>
            </div>
          ))}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-4 py-10 text-[13px] text-text-subtle">
          <span>© 2026 CreatorOS AI</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
            Design prototype · no backend connected
          </span>
        </footer>
      </main>
    </div>
  );
}

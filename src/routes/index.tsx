import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  FileText,
  FolderKanban,
  Image as ImageIcon,
  Lightbulb,
  MessagesSquare,
  Send,
  Sparkles,
  CalendarRange,
} from "lucide-react";
import { PublicNav } from "@/components/public/public-nav";
import { PublicFooter } from "@/components/public/public-footer";
import { Button } from "@/components/ui/button";
import { canonicalLinks, ogUrlMeta, absoluteUrl } from "@/lib/canonical";
import { PLANS } from "@/lib/credits";

/**
 * JSON-LD structured data for the homepage -- rendered via TanStack Router's
 * built-in "script:ld+json" meta key (see headContentUtils.js: any meta
 * entry with this key is emitted as a real <script type="application/ld+json">
 * tag, HTML-escaped). Helps search engines show CreatorOS as a real software
 * product (name, category, pricing) rather than just an untyped page.
 */
function structuredData() {
  const siteUrl = absoluteUrl("/");
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "CreatorOS AI",
      url: siteUrl,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "CreatorOS AI",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description:
        "AI-powered workspace for content creators: script writing, AI chat, image and thumbnail generation, content planning and file organisation in one place.",
      offers: (Object.values(PLANS)).map((plan) => ({
        "@type": "Offer",
        name: `${plan.name} plan`,
        price: String(plan.monthlyPriceUsd),
        priceCurrency: "USD",
        ...(plan.monthlyPriceUsd === 0 ? {} : { billingIncrement: "P1M" }),
      })),
    },
  ];
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      // Cast needed: this project's pinned @tanstack/react-router version
      // types head().meta narrower (raw HTMLMetaElement props) than the
      // "script:ld+json" key the framework's own runtime actually renders as
      // a real <script type="application/ld+json"> tag -- confirmed by
      // reading node_modules/@tanstack/react-router/dist/esm/headContentUtils.js
      // directly, per this project's "verify library APIs" convention.
      ...(structuredData().map((data) => ({ "script:ld+json": data })) as unknown as Array<{
        name: string;
        content: string;
      }>),
      {
        title:
          "CreatorOS AI — AI Content Creation & Planning Workspace for Creators",
      },
      {
        name: "description",
        content:
          "CreatorOS is an AI-powered workspace for content creators: write scripts, chat with AI, generate images and thumbnails, plan your content calendar and keep every file organised in one place.",
      },
      {
        name: "keywords",
        content:
          "AI content creation, AI script writer, AI thumbnail generator, content planner, creator workspace, AI image generator for creators",
      },
      { property: "og:title", content: "CreatorOS AI" },
      {
        property: "og:description",
        content: "Everything you create. One workspace.",
      },
      ...ogUrlMeta("/"),
    ],
    links: canonicalLinks("/"),
  }),
  component: Landing,
});

const steps = [
  { label: "Idea", icon: Lightbulb, body: "Capture what you want to make." },
  { label: "Plan", icon: CalendarRange, body: "Map it to your content calendar." },
  { label: "Create", icon: Sparkles, body: "Write and generate with AI." },
  { label: "Organise", icon: FolderKanban, body: "Keep files and projects together." },
  { label: "Publish", icon: Send, body: "Take it to your audience." },
];

const capabilities = [
  {
    icon: MessagesSquare,
    title: "AI Chat",
    body: "A conversational workspace for ideation, rewriting and research.",
  },
  {
    icon: FileText,
    title: "Script Studio",
    body: "Draft, structure and refine long-form scripts with AI assistance.",
  },
  {
    icon: Sparkles,
    title: "Image Studio",
    body: "Generate and iterate on brand-consistent imagery and assets.",
  },
  {
    icon: ImageIcon,
    title: "Thumbnail Studio",
    body: "Compose click-worthy thumbnails from layout presets and prompts.",
  },
];

const valueProps = [
  "One workspace",
  "Connected workflow",
  "AI tools built in",
  "Organised projects & assets",
];

function Landing() {
  return (
    <div className="min-h-screen brand-wash">
      <PublicNav />

      <main className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">
        {/* Hero */}
        <section className="border-b border-border-subtle py-24 sm:py-32">
          <h1 className="max-w-3xl text-display text-foreground">
            Everything you create.
            <br />
            One workspace.
          </h1>
          <p className="mt-7 max-w-xl text-[16px] leading-relaxed text-text-muted">
            CreatorOS is where you plan your content, write scripts and chat
            with AI, generate images and thumbnails, and keep every file and
            project together — one workspace instead of five separate tools.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Button asChild className="h-10">
              <Link to="/signup">
                Get Started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <a
              href="#how-it-works"
              className="text-[13px] text-text-muted transition-colors hover:text-foreground"
            >
              See how it works
            </a>
          </div>
        </section>

        {/* What is CreatorOS */}
        <section id="about" className="border-b border-border-subtle py-20 sm:py-24">
          <p className="label-eyebrow">About</p>
          <p className="mt-5 max-w-2xl text-[20px] leading-relaxed tracking-[-0.01em] text-foreground">
            CreatorOS is a workspace built for people who make content for a
            living — planning what to publish, writing and generating it with
            AI, and keeping every file and project organised, without
            stitching together a dozen separate apps.
          </p>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-b border-border-subtle py-20 sm:py-24">
          <p className="label-eyebrow">How it works</p>
          <ol className="mt-8 flex flex-col gap-6 sm:mt-10 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            {steps.map((step, i) => (
              <li key={step.label} className="flex items-start gap-4 sm:flex-1 sm:flex-col sm:gap-3">
                <div className="flex items-center gap-2.5 sm:gap-2">
                  <span className="font-mono text-[11px] tracking-[0.1em] text-text-subtle">
                    0{i + 1}
                  </span>
                  <step.icon className="size-4 text-accent-brand" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-[14px] font-medium tracking-[-0.01em] text-foreground">
                    {step.label}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-text-muted">
                    {step.body}
                  </p>
                </div>
                {i < steps.length - 1 ? (
                  <ArrowRight
                    className="mt-0.5 size-3.5 shrink-0 text-text-subtle sm:hidden"
                    aria-hidden="true"
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        {/* Core AI capabilities */}
        <section className="border-b border-border-subtle py-20 sm:py-24">
          <p className="label-eyebrow">Core AI capabilities</p>
          <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border-subtle bg-border sm:grid-cols-2">
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

        {/* Value proposition */}
        <section className="border-b border-border-subtle py-20 sm:py-24">
          <p className="label-eyebrow">Why one workspace</p>
          <p className="mt-5 max-w-2xl text-[20px] leading-relaxed tracking-[-0.01em] text-foreground">
            Switching tools breaks momentum. CreatorOS keeps planning, AI
            generation and your files in the same place, so a script you
            draft in the morning is right there when you build the thumbnail
            for it in the afternoon.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-text-muted">
            {valueProps.map((v, i) => (
              <span key={v} className="flex items-center gap-3">
                {i > 0 ? <span className="text-text-subtle" aria-hidden="true">·</span> : null}
                {v}
              </span>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 text-center sm:py-24">
          <h2 className="text-[28px] font-medium tracking-[-0.02em] text-foreground">
            Create your next piece of content in one workspace.
          </h2>
          <div className="mt-7 flex justify-center">
            <Button asChild className="h-10">
              <Link to="/signup">
                Get Started <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

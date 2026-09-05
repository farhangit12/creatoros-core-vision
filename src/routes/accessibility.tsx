import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PublicNav } from "@/components/public/public-nav";
import { PublicFooter } from "@/components/public/public-footer";
import { canonicalLinks, ogUrlMeta } from "@/lib/canonical";

export const Route = createFileRoute("/accessibility")({
  head: () => ({
    meta: [
      { title: "Accessibility Statement — CreatorOS AI" },
      {
        name: "description",
        content: "CreatorOS AI's commitment to accessibility and how to report issues.",
      },
      { property: "og:title", content: "Accessibility Statement — CreatorOS AI" },
      {
        property: "og:description",
        content: "CreatorOS AI's commitment to accessibility and how to report issues.",
      },
      ...ogUrlMeta("/accessibility"),
    ],
    links: canonicalLinks("/accessibility"),
  }),
  component: AccessibilityPage,
});

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[17px] font-medium tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-text-muted">
        {children}
      </div>
    </section>
  );
}

function AccessibilityPage() {
  return (
    <div className="min-h-screen brand-wash">
      <PublicNav />

      <main className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">
        <section className="border-b border-border-subtle py-20 sm:py-24">
          <p className="label-eyebrow">Legal</p>
          <h1 className="mt-5 text-[32px] font-medium tracking-[-0.02em] text-foreground">
            Accessibility Statement
          </h1>
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-text-muted">
            Effective date: 5 September 2026.
          </p>
        </section>

        <div className="max-w-2xl space-y-10 py-20 sm:py-24">
          <Section title="Our commitment">
            <p>
              CreatorOS AI is committed to making our product usable by as
              many people as possible, including people with disabilities.
              We aim to follow the Web Content Accessibility Guidelines
              (WCAG) 2.1 Level AA as a general standard, and treat
              accessibility as an ongoing effort rather than a one-time
              checklist.
            </p>
          </Section>

          <Section title="Current state">
            <p>
              CreatorOS has not yet completed a full, independent
              accessibility audit. We're sharing this honestly rather than
              claiming full conformance we haven't verified. If you
              encounter a barrier using CreatorOS with assistive technology
              (a screen reader, keyboard-only navigation, voice control, or
              otherwise), please tell us — see "Reporting an issue" below.
            </p>
          </Section>

          <Section title="Reporting an issue">
            <p>
              If you experience any accessibility barrier while using
              CreatorOS, contact us at{" "}
              <a
                href="mailto:edev351@gmail.com"
                className="text-accent-brand hover:underline"
              >
                edev351@gmail.com
              </a>{" "}
              with a description of the issue, the page it occurred on, and
              the assistive technology or browser you were using. We'll do
              our best to respond promptly and address genuine barriers.
            </p>
          </Section>

          <Section title="Changes to this statement">
            <p>
              We may update this statement as CreatorOS's accessibility work
              progresses. Material changes will be reflected by updating the
              effective date above.
            </p>
          </Section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

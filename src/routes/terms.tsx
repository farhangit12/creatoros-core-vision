import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PublicNav } from "@/components/public/public-nav";
import { PublicFooter } from "@/components/public/public-footer";
import { canonicalLinks, ogUrlMeta } from "@/lib/canonical";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — CreatorOS AI" },
      {
        name: "description",
        content: "The terms that govern your use of CreatorOS AI.",
      },
      { property: "og:title", content: "Terms of Service — CreatorOS AI" },
      {
        property: "og:description",
        content: "The terms that govern your use of CreatorOS AI.",
      },
      ...ogUrlMeta("/terms"),
    ],
    links: canonicalLinks("/terms"),
  }),
  component: TermsPage,
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

function TermsPage() {
  return (
    <div className="min-h-screen brand-wash">
      <PublicNav />

      <main className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">
        <section className="border-b border-border-subtle py-20 sm:py-24">
          <p className="label-eyebrow">Legal</p>
          <h1 className="mt-5 text-[32px] font-medium tracking-[-0.02em] text-foreground">
            Terms of Service
          </h1>
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-text-muted">
            Effective date: 20 August 2026.
          </p>
        </section>

        <div className="max-w-2xl space-y-10 py-20 sm:py-24">
          <Section title="Acceptance of terms">
            <p>
              By creating an account or using CreatorOS AI ("CreatorOS", "we",
              "us"), you agree to these Terms of Service. If you don't agree,
              don't use CreatorOS.
            </p>
          </Section>

          <Section title="What CreatorOS is">
            <p>
              CreatorOS is a workspace for planning, creating and organising
              content, including AI-assisted chat, script writing, image
              generation and thumbnail generation, alongside project and file
              management.
            </p>
          </Section>

          <Section title="Your account">
            <p>
              You're responsible for the accuracy of the information you
              provide and for keeping your login credentials secure. Notify
              us if you suspect unauthorised access to your account.
            </p>
          </Section>

          <Section title="Acceptable use">
            <p>You agree not to use CreatorOS to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Generate or distribute illegal, infringing or abusive content.</li>
              <li>Attempt to disrupt, reverse-engineer or gain unauthorised access to the service.</li>
              <li>Violate another person's intellectual property or privacy rights.</li>
            </ul>
          </Section>

          <Section title="Your content">
            <p>
              You retain ownership of the content you create in CreatorOS —
              scripts, images, thumbnails, files and projects. You grant us a
              limited license to store and process that content solely to
              provide the service to you.
            </p>
          </Section>

          <Section title="AI-generated content">
            <p>
              CreatorOS uses third-party AI providers to generate text and
              images. AI output can be inaccurate, unoriginal or unsuitable
              for your purpose. You're responsible for reviewing AI-generated
              content before publishing or relying on it.
            </p>
          </Section>

          <Section title="Plans and billing">
            <p>
              CreatorOS offers a free plan and paid Pro and Scale plans.
              Paid plans are billed monthly through Polar.sh, our Merchant
              of Record, who processes your payment and handles applicable
              tax. Pricing and billing terms are always shown before you're
              charged. You can upgrade, downgrade, or cancel a paid plan at
              any time from Billing — cancellation stops future charges but
              doesn't retroactively refund the current billing period unless
              required by law.
            </p>
          </Section>

          <Section title="Refunds and disputes">
            <p>
              Paid subscriptions don't include a general right to a refund
              for a partial billing period, except where required by law —
              see "Plans and billing" above. If you believe you were charged
              in error, contact us at{" "}
              <a
                href="mailto:edev351@gmail.com"
                className="text-accent-brand hover:underline"
              >
                edev351@gmail.com
              </a>{" "}
              and we'll look into it. Because Polar.sh processes your
              payment as our Merchant of Record, payment disputes and
              chargebacks may also be handled directly through Polar in
              accordance with their own terms.
            </p>
          </Section>

          <Section title="Termination">
            <p>
              You may stop using CreatorOS and request account deletion at
              any time. We may suspend or terminate accounts that violate
              these terms.
            </p>
          </Section>

          <Section title="Disclaimer and liability">
            <p>
              CreatorOS is provided "as is," without warranties of any kind.
              To the extent permitted by law, we aren't liable for indirect
              or consequential damages arising from your use of the service.
            </p>
          </Section>

          <Section title="Changes to these terms">
            <p>
              We may update these terms as CreatorOS evolves. Material
              changes will be reflected by updating the effective date above.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about these terms can be sent to{" "}
              <a
                href="mailto:edev351@gmail.com"
                className="text-accent-brand hover:underline"
              >
                edev351@gmail.com
              </a>
              .
            </p>
          </Section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PublicNav } from "@/components/public/public-nav";
import { PublicFooter } from "@/components/public/public-footer";
import { canonicalLinks, ogUrlMeta } from "@/lib/canonical";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CreatorOS AI" },
      {
        name: "description",
        content: "How CreatorOS AI collects, uses and protects your data.",
      },
      { property: "og:title", content: "Privacy Policy — CreatorOS AI" },
      {
        property: "og:description",
        content: "How CreatorOS AI collects, uses and protects your data.",
      },
      ...ogUrlMeta("/privacy"),
    ],
    links: canonicalLinks("/privacy"),
  }),
  component: PrivacyPage,
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

function PrivacyPage() {
  return (
    <div className="min-h-screen brand-wash">
      <PublicNav />

      <main className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">
        <section className="border-b border-border-subtle py-20 sm:py-24">
          <p className="label-eyebrow">Legal</p>
          <h1 className="mt-5 text-[32px] font-medium tracking-[-0.02em] text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-text-muted">
            Effective date: 5 September 2026.
          </p>
        </section>

        <div className="max-w-2xl space-y-10 py-20 sm:py-24">
          <Section title="Who we are">
            <p>
              CreatorOS AI ("CreatorOS", "we", "us") is a workspace for
              planning, creating and organising content. This policy is
              operated by Md Farhan Akhter, founder of CreatorOS AI.
            </p>
          </Section>

          <Section title="What we collect">
            <p>We collect the information needed to run your workspace:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Account details you provide — name, email address and password (stored securely, never in plain text).</li>
              <li>Content you create or upload — scripts, chat messages, generated images and thumbnails, project data, and files you add to your workspace.</li>
              <li>Basic usage data — such as sign-in activity and device/browser information, used to keep your account secure.</li>
            </ul>
          </Section>

          <Section title="How we use it">
            <p>
              We use your data to operate CreatorOS: to save and display your
              projects, planner and files; to process your prompts through
              our AI providers and return results to you; to authenticate
              your sessions; and to send account-related email (for example,
              password resets).
            </p>
          </Section>

          <Section title="Third-party processors">
            <p>
              CreatorOS relies on a small number of infrastructure providers
              to operate. Data is shared with them only as needed to provide
              the service:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Neon — hosts our database (account and workspace data).</li>
              <li>Groq and OpenRouter — process AI chat, script and text-generation requests.</li>
              <li>Cloudflare Workers AI — generates AI images and thumbnails.</li>
              <li>Cloudinary — stores uploaded files and generated images.</li>
              <li>Resend — delivers account emails such as password resets.</li>
              <li>Polar.sh — processes payments and manages subscriptions for paid plans, as your Merchant of Record.</li>
            </ul>
          </Section>

          <Section title="Cookies and local storage">
            <p>
              We use two categories, and only one is optional:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">Necessary</strong> — a session cookie that keeps you signed in. This can't be turned off; it's required for the account features you're using.</li>
              <li><strong className="text-foreground">Preferences</strong> — local storage caching your theme choice so it applies instantly on your next visit. This is optional: you can accept or reject it from the cookie banner shown on your first visit, or change your mind at any time by clearing your browser's local storage for this site.</li>
            </ul>
            <p>
              We do not use third-party advertising or tracking cookies of
              any kind.
            </p>
          </Section>

          <Section title="We do not sell your data">
            <p>
              We do not sell or share your personal information to third
              parties for money or for their own advertising purposes. Data
              is shared only with the infrastructure processors listed above,
              solely to operate CreatorOS on your behalf.
            </p>
          </Section>

          <Section title="Data retention and deletion">
            <p>
              We keep your account data for as long as your account remains
              active. You can delete individual files, projects and
              generations from within CreatorOS at any time, and you can
              delete your whole account yourself from Settings — full
              account deletion doesn't require contacting us.
            </p>
            <p>
              Deleting your account is immediate and permanent: your account
              record, projects, files, chats and AI generations are removed
              from our live database, and your uploaded files, generated
              images and thumbnails, and profile photo are removed from our
              storage provider. A copy may still exist in short-term
              database backups for a limited window after deletion (up to a
              few hours) before those backups roll off and are fully purged.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              Depending on where you live (for example under the EU/UK GDPR
              or the California CCPA/CPRA), you may have the right to:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Know what personal data we hold about you and request a copy (access / right to know).</li>
              <li>Correct inaccurate personal data (rectification).</li>
              <li>Delete your personal data (erasure / right to delete) — you can do this yourself at any time from Settings, with no need to contact us.</li>
              <li>Receive your data in a portable format (data portability).</li>
              <li>Object to, or request we restrict, certain processing.</li>
              <li>Not be discriminated against for exercising any of these rights.</li>
            </ul>
            <p>
              As stated above, we do not sell or share your personal
              information, so there is no "opt-out of sale" to request. To
              exercise any of these rights, contact us at{" "}
              <a
                href="mailto:edev351@gmail.com"
                className="text-accent-brand hover:underline"
              >
                edev351@gmail.com
              </a>
              . We'll respond within a reasonable time and may need to verify
              your identity first.
            </p>
          </Section>

          <Section title="Children's privacy">
            <p>
              CreatorOS is not directed at children and is not intended for
              use by anyone under 16.
            </p>
          </Section>

          <Section title="Changes to this policy">
            <p>
              We may update this policy as CreatorOS evolves. Material
              changes will be reflected by updating the effective date above.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions about this policy can be sent to{" "}
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

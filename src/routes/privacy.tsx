import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PublicNav } from "@/components/public/public-nav";
import { PublicFooter } from "@/components/public/public-footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CreatorOS AI" },
      {
        name: "description",
        content: "How CreatorOS AI collects, uses and protects your data.",
      },
    ],
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
            Effective date: 20 August 2026.
          </p>
        </section>

        <div className="max-w-2xl space-y-10 py-20 sm:py-24">
          <Section title="Who we are">
            <p>
              CreatorOS AI ("CreatorOS", "we", "us") is a workspace for
              planning, creating and organising content. This policy is
              operated by CreatorOS Inc.
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
              We use a session cookie to keep you signed in, and local
              storage in your browser to remember your theme preference. We
              do not use third-party advertising or tracking cookies.
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
              Depending on where you live, you may have rights to access,
              correct or delete your personal data, or to object to certain
              processing. To exercise these rights, contact us at{" "}
              <a
                href="mailto:edev351@gmail.com"
                className="text-accent-brand hover:underline"
              >
                edev351@gmail.com
              </a>
              .
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

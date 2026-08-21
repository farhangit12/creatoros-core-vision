import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PublicNav } from "@/components/public/public-nav";
import { PublicFooter } from "@/components/public/public-footer";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & FAQ — CreatorOS AI" },
      {
        name: "description",
        content: "Answers to common questions about using CreatorOS AI.",
      },
    ],
  }),
  component: HelpPage,
});

function Question({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div className="border-b border-border-subtle py-6 first:pt-0 last:border-b-0">
      <h3 className="text-[15px] font-medium tracking-[-0.01em] text-foreground">{q}</h3>
      <div className="mt-2 space-y-2 text-[14px] leading-relaxed text-text-muted">
        {children}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-[17px] font-medium tracking-[-0.02em] text-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function HelpPage() {
  return (
    <div className="min-h-screen brand-wash">
      <PublicNav />

      <main className="mx-auto w-full max-w-[1180px] px-5 sm:px-8">
        <section className="border-b border-border-subtle py-20 sm:py-24">
          <p className="label-eyebrow">Support</p>
          <h1 className="mt-5 text-[32px] font-medium tracking-[-0.02em] text-foreground">
            Help &amp; FAQ
          </h1>
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-text-muted">
            Answers to the questions that come up most. Can't find yours? Use the
            feedback button in the app, or email{" "}
            <a href="mailto:edev351@gmail.com" className="text-accent-brand hover:underline">
              edev351@gmail.com
            </a>
            .
          </p>
        </section>

        <div className="max-w-2xl space-y-12 py-20 sm:py-24">
          <Section title="Getting started">
            <Question q="How do I create an account?">
              <p>
                Sign up with an email and password, or use "Continue with Google" on the
                sign-up page. Every new account starts on the Free plan with a starting
                credit balance already in your workspace.
              </p>
            </Question>
            <Question q="I forgot my password — what now?">
              <p>
                Use "Forgot password" on the sign-in page. We'll email a reset link that
                expires in an hour and can only be used once.
              </p>
            </Question>
          </Section>

          <Section title="Credits &amp; plans">
            <Question q="What are credits, and what uses them?">
              <p>
                Every AI generation — a chat reply, a script draft, an image, a
                thumbnail — costs a small number of credits, shown before you generate.
                Free, Pro and Scale plans differ in how many credits you get per month;
                Scale is unlimited, subject to a fair-use daily cap.
              </p>
            </Question>
            <Question q="What happens if I run out of credits?">
              <p>
                Generation is blocked until your balance renews next month, or you
                upgrade your plan from Billing. You can always see your exact balance
                on the AI Usage page.
              </p>
            </Question>
            <Question q="How do I upgrade, downgrade or cancel?">
              <p>
                From Billing, choose a plan to open a secure checkout, or use "Manage
                billing" to reach your subscription, payment method and invoices at any
                time.
              </p>
            </Question>
          </Section>

          <Section title="The studios">
            <Question q="What's the difference between the four AI tools?">
              <p>
                <strong>AI Chat</strong> is open-ended conversation and research.{" "}
                <strong>Script Studio</strong> drafts and refines structured, long-form
                scripts. <strong>Image Studio</strong> generates and edits standalone
                images. <strong>Thumbnail Studio</strong> is purpose-built for
                platform-sized thumbnails, including text overlays and crop presets.
              </p>
            </Question>
            <Question q="Can I come back to something I generated earlier?">
              <p>
                Yes — the Library page keeps every chat, script, image and thumbnail
                you've created, with a "Re-edit" action that reopens the original
                inputs in the right studio.
              </p>
            </Question>
          </Section>

          <Section title="Organizing your work">
            <Question q="What's a Project, and how is it different from Files?">
              <p>
                A Project groups related content — scripts, images, thumbnails, files
                and chats — around one deliverable or campaign. Files is a flat
                workspace drive for anything you upload directly; individual files can
                still be linked to a Project from their menu.
              </p>
            </Question>
            <Question q="How do I schedule content?">
              <p>
                Content Planner gives you a calendar/timeline view. You can create an
                item directly there, or send a generated thumbnail to it via "Add to
                planner" in Thumbnail Studio.
              </p>
            </Question>
          </Section>

          <Section title="Account &amp; privacy">
            <Question q="How do I delete my account?">
              <p>
                Account deletion removes your profile, projects, files, generations and
                sessions. Contact{" "}
                <a href="mailto:edev351@gmail.com" className="text-accent-brand hover:underline">
                  edev351@gmail.com
                </a>{" "}
                to request it. See the{" "}
                <a href="/privacy" className="text-accent-brand hover:underline">
                  Privacy Policy
                </a>{" "}
                for what's collected and how it's used.
              </p>
            </Question>
          </Section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

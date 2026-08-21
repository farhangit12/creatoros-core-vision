import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sendFeedbackEmail } from "@/lib/server/email";
import { recordAuditEvent } from "@/lib/server/audit-log";

async function requireUser(): Promise<{ id: string; name: string; email: string }> {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  if (!session) {
    throw new Error("Not authenticated.");
  }
  return session.user;
}

const feedbackSchema = z.object({
  message: z.string().trim().min(1, "Please write a message.").max(4000),
  route: z.string().trim().max(200).optional(),
});

/** In-app feedback/bug-report submission -- emails the support inbox via the
 * existing Resend integration. No new table; not persisted beyond the email. */
export const submitFeedback = createServerFn({ method: "POST" })
  .validator((input: unknown) => feedbackSchema.parse(input))
  .handler(async ({ data }) => {
    const user = await requireUser();
    await sendFeedbackEmail({
      fromName: user.name,
      fromEmail: user.email,
      route: data.route ?? "unknown",
      message: data.message,
    });
    await recordAuditEvent({
      userId: user.id,
      event: "feedback_submitted",
      metadata: { route: data.route ?? null },
      request: getRequest(),
    });
    return { ok: true as const };
  });

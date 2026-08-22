import { db } from "@/db";
import { auditLog } from "@/db/schema";

/**
 * Writes to the `audit_log` table that has existed in the schema since the
 * auth/DB foundation phase but was never actually written to anywhere --
 * every sensitive account/billing operation now records a real row here
 * instead of that table being dead weight. Best-effort: a logging failure
 * must never block the real operation it's describing.
 */
export async function recordAuditEvent(params: {
  userId: string | null;
  event: string;
  metadata?: Record<string, unknown>;
  request?: Request;
}): Promise<void> {
  try {
    await db.insert(auditLog).values({
      id: crypto.randomUUID(),
      userId: params.userId,
      event: params.event,
      metadata: params.metadata ?? null,
      ipAddress: params.request?.headers.get("x-real-ip") ?? params.request?.headers.get("x-forwarded-for") ?? null,
      userAgent: params.request?.headers.get("user-agent") ?? null,
    });
  } catch (error) {
    console.error("Failed to record audit event", { event: params.event, error });
  }
}

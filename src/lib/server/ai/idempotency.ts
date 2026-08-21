import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiGenerations, type aiFeatureValues } from "@/db/schema";

export class DuplicateSubmissionError extends Error {
  constructor() {
    super("Looks like that already went through a moment ago — check your history before retrying.");
    this.name = "DuplicateSubmissionError";
  }
}

// Deliberately short: only meant to catch an accidental double-click/retry
// on the exact same input, not to rate-limit deliberate repeat generations.
const DUPLICATE_WINDOW_MS = 4_000;

/**
 * Guards against an accidental duplicate AI generation (and duplicate
 * credit charge) from a double-click or a client retry-after-apparent-
 * timeout, by checking for a just-completed generation whose stored `input`
 * contains the same client-submitted fields. Uses Postgres jsonb
 * containment (`@>`) rather than exact equality specifically so this stays
 * correct without needing to reconstruct the exact superset object each
 * studio server fn stores (which includes extra fields like userId) --
 * `clientData` only needs to be the fields the caller actually validated
 * from the request, not the full stored shape. No migration needed --
 * existing columns only.
 *
 * Honest limitation: aiGenerations rows are only inserted *after* a
 * generation finishes (see script-studio.ts etc.), so this can't catch two
 * requests that are both still genuinely in flight at the same instant --
 * it catches the much more common case where the first request already
 * completed and a second, identical one arrives moments later. Closing the
 * true-concurrent case would need a claim/lock inserted at request start,
 * which is a bigger structural change than this fix.
 *
 * Wired into script.generate, script.rewrite, image.generate,
 * image.variation and thumbnail.generate. Deliberately NOT wired into chat:
 * its stored `input` is `{messages, tone}` where `messages` is the whole
 * growing conversation history, not a small stable object -- matching on
 * `tone` alone (the only stable field) would false-positive on any two
 * different messages sent moments apart with the same tone, which is a real
 * usability regression, not a safe simplification.
 */
export async function assertNotDuplicateSubmission(params: {
  userId: string;
  feature: (typeof aiFeatureValues)[number];
  operation: string;
  clientData: Record<string, unknown>;
}): Promise<void> {
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const [existing] = await db
    .select({ id: aiGenerations.id })
    .from(aiGenerations)
    .where(
      and(
        eq(aiGenerations.userId, params.userId),
        eq(aiGenerations.feature, params.feature),
        eq(aiGenerations.operation, params.operation),
        eq(aiGenerations.status, "completed"),
        gte(aiGenerations.createdAt, since),
        sql`${aiGenerations.input} @> ${JSON.stringify(params.clientData)}::jsonb`,
      ),
    )
    .limit(1);
  if (existing) {
    throw new DuplicateSubmissionError();
  }
}

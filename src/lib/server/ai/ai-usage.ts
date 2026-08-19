import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, count, desc, eq, sum } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { aiFeatureValues, aiGenerationStatusValues, aiGenerations, aiAssets } from "@/db/schema";
import { destroyImageFromCloudinary } from "@/lib/ai/providers/image/cloudinary-upload";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function toSerializableGeneration(row: typeof aiGenerations.$inferSelect) {
  return { ...row, input: row.input as Json, output: row.output as Json };
}

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  if (!session) {
    throw new Error("Not authenticated.");
  }
  return session.user.id;
}

const listGenerationsSchema = z.object({
  feature: z.enum(aiFeatureValues).optional(),
  status: z.enum(aiGenerationStatusValues).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

export const listGenerations = createServerFn({ method: "GET" })
  .validator((input: unknown) => listGenerationsSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const conditions = [eq(aiGenerations.userId, userId)];
    if (data.feature) conditions.push(eq(aiGenerations.feature, data.feature));
    if (data.status) conditions.push(eq(aiGenerations.status, data.status));

    const rows = await db
      .select()
      .from(aiGenerations)
      .where(and(...conditions))
      .orderBy(desc(aiGenerations.createdAt))
      .limit(data.limit ?? 50);
    return rows.map(toSerializableGeneration);
  });

const deleteGenerationSchema = z.object({
  generationId: z.string().min(1),
});

export const deleteGeneration = createServerFn({ method: "POST" })
  .validator((input: unknown) => deleteGenerationSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();

    const [generation] = await db
      .select({ id: aiGenerations.id })
      .from(aiGenerations)
      .where(and(eq(aiGenerations.id, data.generationId), eq(aiGenerations.userId, userId)));
    if (!generation) {
      throw new Error("Generation not found.");
    }

    const assets = await db
      .select({ url: aiAssets.url })
      .from(aiAssets)
      .where(and(eq(aiAssets.generationId, data.generationId), eq(aiAssets.userId, userId)));
    await Promise.all(assets.map((a) => destroyImageFromCloudinary(a.url)));

    // aiAssets rows cascade-delete with their parent generation (FK
    // onDelete: "cascade") -- no separate delete needed for them.
    await db
      .delete(aiGenerations)
      .where(and(eq(aiGenerations.id, data.generationId), eq(aiGenerations.userId, userId)));

    return { success: true };
  });

export const getUsageSummary = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();

  const [totals, byFeature, byStatus] = await Promise.all([
    db
      .select({
        totalGenerations: count(),
        totalTokens: sum(aiGenerations.totalTokens),
        totalCostCents: sum(aiGenerations.costCents),
      })
      .from(aiGenerations)
      .where(eq(aiGenerations.userId, userId)),
    db
      .select({ feature: aiGenerations.feature, count: count() })
      .from(aiGenerations)
      .where(eq(aiGenerations.userId, userId))
      .groupBy(aiGenerations.feature),
    db
      .select({ status: aiGenerations.status, count: count() })
      .from(aiGenerations)
      .where(eq(aiGenerations.userId, userId))
      .groupBy(aiGenerations.status),
  ]);

  return {
    totalGenerations: totals[0]?.totalGenerations ?? 0,
    totalTokens: Number(totals[0]?.totalTokens ?? 0),
    totalCostCents: Number(totals[0]?.totalCostCents ?? 0),
    byFeature,
    byStatus,
  };
});

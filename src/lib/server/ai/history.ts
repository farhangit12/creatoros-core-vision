import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { aiFeatureValues, aiGenerations, aiAssets } from "@/db/schema";
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

const listStudioCreationsSchema = z.object({
  feature: z.enum(aiFeatureValues),
  operations: z.array(z.string().min(1)).min(1),
  limit: z.number().int().min(1).max(200).optional(),
});

export const listStudioCreations = createServerFn({ method: "GET" })
  .validator((input: unknown) => listStudioCreationsSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();

    const rows = await db
      .select()
      .from(aiGenerations)
      .where(
        and(
          eq(aiGenerations.userId, userId),
          eq(aiGenerations.feature, data.feature),
          inArray(aiGenerations.operation, data.operations),
        ),
      )
      .orderBy(desc(aiGenerations.createdAt))
      .limit(data.limit ?? 100);

    if (rows.length === 0) {
      return [];
    }

    const assetRows = await db
      .select()
      .from(aiAssets)
      .where(
        and(
          eq(aiAssets.userId, userId),
          inArray(
            aiAssets.generationId,
            rows.map((r) => r.id),
          ),
        ),
      )
      .orderBy(aiAssets.variantIndex);

    const assetsByGeneration = new Map<string, (typeof aiAssets.$inferSelect)[]>();
    for (const asset of assetRows) {
      const list = assetsByGeneration.get(asset.generationId) ?? [];
      list.push(asset);
      assetsByGeneration.set(asset.generationId, list);
    }

    return rows.map((row) => ({
      ...toSerializableGeneration(row),
      assets: (assetsByGeneration.get(row.id) ?? []).map((a) => ({ ...a, metadata: a.metadata as Json })),
    }));
  });

const clearStudioCreationsSchema = z.object({
  feature: z.enum(aiFeatureValues),
  operations: z.array(z.string().min(1)).min(1),
});

export const clearStudioCreations = createServerFn({ method: "POST" })
  .validator((input: unknown) => clearStudioCreationsSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();

    const rows = await db
      .select({ id: aiGenerations.id })
      .from(aiGenerations)
      .where(
        and(
          eq(aiGenerations.userId, userId),
          eq(aiGenerations.feature, data.feature),
          inArray(aiGenerations.operation, data.operations),
        ),
      );
    if (rows.length === 0) {
      return { deleted: 0 };
    }
    const ids = rows.map((r) => r.id);

    const assetRows = await db
      .select({ url: aiAssets.url })
      .from(aiAssets)
      .where(and(eq(aiAssets.userId, userId), inArray(aiAssets.generationId, ids)));
    await Promise.all(assetRows.map((a) => destroyImageFromCloudinary(a.url)));

    // aiAssets rows cascade-delete with their parent generation (FK
    // onDelete: "cascade") -- no separate delete needed for them.
    await db
      .delete(aiGenerations)
      .where(
        and(
          eq(aiGenerations.userId, userId),
          eq(aiGenerations.feature, data.feature),
          inArray(aiGenerations.operation, data.operations),
        ),
      );

    return { deleted: ids.length };
  });

const getGenerationSchema = z.object({
  generationId: z.string().min(1),
});

export const getGeneration = createServerFn({ method: "GET" })
  .validator((input: unknown) => getGenerationSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();

    const [row] = await db
      .select()
      .from(aiGenerations)
      .where(and(eq(aiGenerations.id, data.generationId), eq(aiGenerations.userId, userId)));
    if (!row) {
      throw new Error("Creation not found.");
    }

    const assetRows = await db
      .select()
      .from(aiAssets)
      .where(and(eq(aiAssets.generationId, data.generationId), eq(aiAssets.userId, userId)))
      .orderBy(aiAssets.variantIndex);

    return {
      ...toSerializableGeneration(row),
      assets: assetRows.map((a) => ({ ...a, metadata: a.metadata as Json })),
    };
  });

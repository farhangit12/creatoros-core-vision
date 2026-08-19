import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import {
  aiAssets,
  aiConversations,
  aiGenerations,
  files,
  plannerItems,
  projectActivity,
  projects,
} from "@/db/schema";

const LINKABLE_LIMIT = 50;

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function toSerializableGeneration<T extends { input: unknown; output: unknown }>(row: T) {
  return { ...row, input: row.input as Json, output: row.output as Json };
}

function toSerializableAsset<T extends { metadata: unknown }>(row: T) {
  return { ...row, metadata: row.metadata as Json };
}

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  if (!session) {
    throw new Error("Not authenticated.");
  }
  return session.user.id;
}

async function assertOwnedProject(userId: string, projectId: string): Promise<void> {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  if (!project) {
    throw new Error("Project not found.");
  }
}

async function recordActivity(params: {
  projectId: string;
  userId: string;
  action: string;
  detail?: string | null;
}): Promise<void> {
  await db.insert(projectActivity).values({
    id: randomUUID(),
    projectId: params.projectId,
    userId: params.userId,
    action: params.action,
    detail: params.detail ?? null,
  });
}

function extractPrompt(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  const value = record["prompt"] ?? record["topic"];
  return typeof value === "string" ? value : null;
}

async function withGenerationPrompts<T extends { generationId: string }>(assets: T[]) {
  const generationIds = [...new Set(assets.map((a) => a.generationId))];
  if (generationIds.length === 0) return assets.map((a) => ({ ...a, prompt: null as string | null }));
  const generations = await db
    .select({ id: aiGenerations.id, input: aiGenerations.input })
    .from(aiGenerations)
    .where(inArray(aiGenerations.id, generationIds));
  const promptById = new Map(generations.map((g) => [g.id, extractPrompt(g.input)]));
  return assets.map((a) => ({ ...a, prompt: promptById.get(a.generationId) ?? null }));
}

const projectIdSchema = z.object({ projectId: z.string().min(1) });

// ---- Linked content (already associated with the project) ----

export const listProjectScripts = createServerFn({ method: "GET" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const rows = await db
      .select()
      .from(aiGenerations)
      .where(
        and(
          eq(aiGenerations.userId, userId),
          eq(aiGenerations.projectId, data.projectId),
          eq(aiGenerations.operation, "script.generate"),
        ),
      )
      .orderBy(desc(aiGenerations.createdAt));
    return rows.map(toSerializableGeneration);
  });

async function listProjectAssetsByType(userId: string, projectId: string, assetType: "image" | "thumbnail") {
  const rows = await db
    .select()
    .from(aiAssets)
    .where(and(eq(aiAssets.userId, userId), eq(aiAssets.projectId, projectId), eq(aiAssets.assetType, assetType)))
    .orderBy(desc(aiAssets.createdAt));
  return (await withGenerationPrompts(rows)).map(toSerializableAsset);
}

export const listProjectImages = createServerFn({ method: "GET" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    return listProjectAssetsByType(userId, data.projectId, "image");
  });

export const listProjectThumbnails = createServerFn({ method: "GET" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    return listProjectAssetsByType(userId, data.projectId, "thumbnail");
  });

export const listProjectFiles = createServerFn({ method: "GET" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    return db
      .select()
      .from(files)
      .where(and(eq(files.userId, userId), eq(files.projectId, data.projectId)))
      .orderBy(desc(files.createdAt));
  });

export const listProjectChats = createServerFn({ method: "GET" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    return db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.userId, userId), eq(aiConversations.projectId, data.projectId)))
      .orderBy(desc(aiConversations.updatedAt));
  });

// ---- Linkable content (the user's own, not yet attached to any project) ----

export const listLinkableScripts = createServerFn({ method: "GET" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await assertOwnedProject(userId, data.projectId);
    const rows = await db
      .select()
      .from(aiGenerations)
      .where(
        and(
          eq(aiGenerations.userId, userId),
          isNull(aiGenerations.projectId),
          eq(aiGenerations.operation, "script.generate"),
          eq(aiGenerations.status, "completed"),
        ),
      )
      .orderBy(desc(aiGenerations.createdAt))
      .limit(LINKABLE_LIMIT);
    return rows.map(toSerializableGeneration);
  });

async function listLinkableAssetsByType(userId: string, assetType: "image" | "thumbnail") {
  const rows = await db
    .select()
    .from(aiAssets)
    .where(and(eq(aiAssets.userId, userId), isNull(aiAssets.projectId), eq(aiAssets.assetType, assetType)))
    .orderBy(desc(aiAssets.createdAt))
    .limit(LINKABLE_LIMIT);
  return (await withGenerationPrompts(rows)).map(toSerializableAsset);
}

export const listLinkableImages = createServerFn({ method: "GET" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await assertOwnedProject(userId, data.projectId);
    return listLinkableAssetsByType(userId, "image");
  });

export const listLinkableThumbnails = createServerFn({ method: "GET" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await assertOwnedProject(userId, data.projectId);
    return listLinkableAssetsByType(userId, "thumbnail");
  });

export const listLinkableFiles = createServerFn({ method: "GET" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await assertOwnedProject(userId, data.projectId);
    return db
      .select()
      .from(files)
      .where(and(eq(files.userId, userId), isNull(files.projectId)))
      .orderBy(desc(files.createdAt))
      .limit(LINKABLE_LIMIT);
  });

export const listLinkableChats = createServerFn({ method: "GET" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await assertOwnedProject(userId, data.projectId);
    return db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.userId, userId), isNull(aiConversations.projectId)))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(LINKABLE_LIMIT);
  });

// ---- Link / unlink mutations ----

const linkScriptSchema = z.object({ generationId: z.string().min(1), projectId: z.string().min(1) });
const unlinkScriptSchema = z.object({ generationId: z.string().min(1), projectId: z.string().min(1) });

export const linkScriptToProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => linkScriptSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await assertOwnedProject(userId, data.projectId);
    await db
      .update(aiGenerations)
      .set({ projectId: data.projectId })
      .where(and(eq(aiGenerations.id, data.generationId), eq(aiGenerations.userId, userId)));
    await recordActivity({ projectId: data.projectId, userId, action: "Script linked" });
    return { id: data.generationId };
  });

export const unlinkScriptFromProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => unlinkScriptSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await db
      .update(aiGenerations)
      .set({ projectId: null })
      .where(and(eq(aiGenerations.id, data.generationId), eq(aiGenerations.userId, userId)));
    await recordActivity({ projectId: data.projectId, userId, action: "Script unlinked" });
    return { id: data.generationId };
  });

const linkAssetSchema = z.object({ assetId: z.string().min(1), projectId: z.string().min(1) });
const unlinkAssetSchema = z.object({ assetId: z.string().min(1), projectId: z.string().min(1) });

export const linkAssetToProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => linkAssetSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await assertOwnedProject(userId, data.projectId);
    const [updated] = await db
      .update(aiAssets)
      .set({ projectId: data.projectId })
      .where(and(eq(aiAssets.id, data.assetId), eq(aiAssets.userId, userId)))
      .returning({ assetType: aiAssets.assetType });
    await recordActivity({
      projectId: data.projectId,
      userId,
      action: updated?.assetType === "thumbnail" ? "Thumbnail linked" : "Image linked",
    });
    return { id: data.assetId };
  });

export const unlinkAssetFromProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => unlinkAssetSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const [updated] = await db
      .update(aiAssets)
      .set({ projectId: null })
      .where(and(eq(aiAssets.id, data.assetId), eq(aiAssets.userId, userId)))
      .returning({ assetType: aiAssets.assetType });
    await recordActivity({
      projectId: data.projectId,
      userId,
      action: updated?.assetType === "thumbnail" ? "Thumbnail unlinked" : "Image unlinked",
    });
    return { id: data.assetId };
  });

const linkFileSchema = z.object({ fileId: z.string().min(1), projectId: z.string().min(1) });
const unlinkFileSchema = z.object({ fileId: z.string().min(1), projectId: z.string().min(1) });

export const linkFileToProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => linkFileSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await assertOwnedProject(userId, data.projectId);
    await db
      .update(files)
      .set({ projectId: data.projectId })
      .where(and(eq(files.id, data.fileId), eq(files.userId, userId)));
    await recordActivity({ projectId: data.projectId, userId, action: "File linked" });
    return { id: data.fileId };
  });

export const unlinkFileFromProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => unlinkFileSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await db
      .update(files)
      .set({ projectId: null })
      .where(and(eq(files.id, data.fileId), eq(files.userId, userId)));
    await recordActivity({ projectId: data.projectId, userId, action: "File unlinked" });
    return { id: data.fileId };
  });

const linkChatSchema = z.object({ conversationId: z.string().min(1), projectId: z.string().min(1) });
const unlinkChatSchema = z.object({ conversationId: z.string().min(1), projectId: z.string().min(1) });

export const linkChatToProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => linkChatSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await assertOwnedProject(userId, data.projectId);
    await db
      .update(aiConversations)
      .set({ projectId: data.projectId })
      .where(and(eq(aiConversations.id, data.conversationId), eq(aiConversations.userId, userId)));
    await recordActivity({ projectId: data.projectId, userId, action: "Chat linked" });
    return { id: data.conversationId };
  });

export const unlinkChatFromProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => unlinkChatSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await db
      .update(aiConversations)
      .set({ projectId: null })
      .where(and(eq(aiConversations.id, data.conversationId), eq(aiConversations.userId, userId)));
    await recordActivity({ projectId: data.projectId, userId, action: "Chat unlinked" });
    return { id: data.conversationId };
  });

// ---- Activity + overview ----

export const listProjectActivity = createServerFn({ method: "GET" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await assertOwnedProject(userId, data.projectId);
    return db
      .select()
      .from(projectActivity)
      .where(eq(projectActivity.projectId, data.projectId))
      .orderBy(desc(projectActivity.createdAt))
      .limit(50);
  });

export const getProjectOverview = createServerFn({ method: "GET" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await assertOwnedProject(userId, data.projectId);

    const [scripts, assets, filesLinked, upcoming] = await Promise.all([
      db
        .select({ id: aiGenerations.id })
        .from(aiGenerations)
        .where(and(eq(aiGenerations.userId, userId), eq(aiGenerations.projectId, data.projectId))),
      db
        .select({ id: aiAssets.id })
        .from(aiAssets)
        .where(and(eq(aiAssets.userId, userId), eq(aiAssets.projectId, data.projectId))),
      db
        .select({ id: files.id })
        .from(files)
        .where(and(eq(files.userId, userId), eq(files.projectId, data.projectId))),
      db
        .select()
        .from(plannerItems)
        .where(
          and(
            eq(plannerItems.userId, userId),
            eq(plannerItems.projectId, data.projectId),
            gte(plannerItems.scheduledAt, new Date()),
          ),
        )
        .orderBy(plannerItems.scheduledAt)
        .limit(1),
    ]);

    return {
      scriptsCount: scripts.length,
      assetsCount: assets.length,
      filesCount: filesLinked.length,
      nextMilestone: upcoming[0] ?? null,
    };
  });

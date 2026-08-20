import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { plannerItems, projects } from "@/db/schema";

export type PlannerItemRecord = typeof plannerItems.$inferSelect;

const PLATFORM_IDS = ["youtube", "instagram", "tiktok", "linkedin", "x"] as const;
const PLANNER_STAGES = ["Idea", "Draft", "Review", "Ready", "Scheduled", "Published"] as const;

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  if (!session) {
    throw new Error("Not authenticated.");
  }
  return session.user.id;
}

function assertRow<T>(row: T | undefined, message: string): T {
  if (!row) {
    throw new Error(message);
  }
  return row;
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

async function loadOwnedItem(userId: string, itemId: string): Promise<PlannerItemRecord> {
  const [item] = await db
    .select()
    .from(plannerItems)
    .where(and(eq(plannerItems.id, itemId), eq(plannerItems.userId, userId)));
  if (!item) {
    throw new Error("Content item not found.");
  }
  return item;
}

const createPlannerItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  platform: z.enum(PLATFORM_IDS),
  projectId: z.string().min(1).nullable().optional(),
  stage: z.enum(PLANNER_STAGES).optional(),
  coverImage: z.string().trim().url().nullable().optional(),
  day: z.number().int().min(1).max(31),
  scheduledAt: z.coerce.date(),
});

const updatePlannerItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  platform: z.enum(PLATFORM_IDS).optional(),
  projectId: z.string().min(1).nullable().optional(),
  stage: z.enum(PLANNER_STAGES).optional(),
  coverImage: z.string().trim().url().nullable().optional(),
  day: z.number().int().min(1).max(31).optional(),
  scheduledAt: z.coerce.date().optional(),
});

const itemIdSchema = z.object({ id: z.string().min(1) });

export const listPlannerItems = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  return db
    .select()
    .from(plannerItems)
    .where(eq(plannerItems.userId, userId))
    .orderBy(desc(plannerItems.scheduledAt));
});

export const createPlannerItem = createServerFn({ method: "POST" })
  .validator((input: unknown) => createPlannerItemSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    if (data.projectId) {
      await assertOwnedProject(userId, data.projectId);
    }
    const [created] = await db
      .insert(plannerItems)
      .values({
        id: crypto.randomUUID(),
        userId,
        projectId: data.projectId ?? null,
        title: data.title,
        platform: data.platform,
        stage: data.stage ?? "Idea",
        coverImage: data.coverImage ?? null,
        day: data.day,
        scheduledAt: data.scheduledAt,
      })
      .returning();
    return assertRow(created, "Failed to create content item.");
  });

export const updatePlannerItem = createServerFn({ method: "POST" })
  .validator((input: unknown) => updatePlannerItemSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await loadOwnedItem(userId, data.id);
    if (data.projectId) {
      await assertOwnedProject(userId, data.projectId);
    }
    const { id, ...fields } = data;
    const [updated] = await db
      .update(plannerItems)
      .set({ ...fields, updatedAt: new Date() })
      .where(and(eq(plannerItems.id, id), eq(plannerItems.userId, userId)))
      .returning();
    return assertRow(updated, "Failed to update content item.");
  });

export const deletePlannerItem = createServerFn({ method: "POST" })
  .validator((input: unknown) => itemIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await loadOwnedItem(userId, data.id);
    await db
      .delete(plannerItems)
      .where(and(eq(plannerItems.id, data.id), eq(plannerItems.userId, userId)));
    return { id: data.id };
  });

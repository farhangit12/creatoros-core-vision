import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { projectActivity, projectStatusValues, projects } from "@/db/schema";

export type ProjectRecord = typeof projects.$inferSelect;

const visibilityValues = ["private", "team", "public"] as const;

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

async function loadOwnedProject(userId: string, projectId: string): Promise<ProjectRecord> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
  if (!project) {
    throw new Error("Project not found.");
  }
  return project;
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

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  description: z.string().trim().max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  cover: z.string().trim().max(200).optional(),
  coverPattern: z.string().trim().max(60).optional(),
  template: z.string().trim().max(80).optional(),
  visibility: z.enum(visibilityValues).optional(),
});

const updateProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(projectStatusValues).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  favourite: z.boolean().optional(),
  cover: z.string().trim().max(200).optional(),
  coverPattern: z.string().trim().max(60).optional(),
  template: z.string().trim().max(80).optional(),
  visibility: z.enum(visibilityValues).optional(),
});

const projectIdSchema = z.object({ id: z.string().min(1) });
const archiveSchema = z.object({ id: z.string().min(1), archived: z.boolean() });

export const listProjects = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  return db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));
});

export const getProject = createServerFn({ method: "GET" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    return loadOwnedProject(userId, data.id);
  });

export const createProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => createProjectSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const [created] = await db
      .insert(projects)
      .values({
        id: randomUUID(),
        userId,
        name: data.name,
        description: data.description ?? null,
        tags: data.tags ?? [],
        cover: data.cover ?? null,
        coverPattern: data.coverPattern ?? null,
        template: data.template ?? null,
        visibility: data.visibility ?? "private",
      })
      .returning();
    const project = assertRow(created, "Failed to create project.");
    await recordActivity({ projectId: project.id, userId, action: "Project created" });
    return project;
  });

export const updateProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => updateProjectSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await loadOwnedProject(userId, data.id);
    const { id, ...fields } = data;
    const [updated] = await db
      .update(projects)
      .set({ ...fields, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();
    const project = assertRow(updated, "Failed to update project.");
    await recordActivity({ projectId: id, userId, action: "Settings saved" });
    return project;
  });

export const toggleProjectFavourite = createServerFn({ method: "POST" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const existing = await loadOwnedProject(userId, data.id);
    const [updated] = await db
      .update(projects)
      .set({ favourite: !existing.favourite, updatedAt: new Date() })
      .where(and(eq(projects.id, data.id), eq(projects.userId, userId)))
      .returning();
    return assertRow(updated, "Failed to update project.");
  });

export const setProjectArchived = createServerFn({ method: "POST" })
  .validator((input: unknown) => archiveSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await loadOwnedProject(userId, data.id);
    const [updated] = await db
      .update(projects)
      .set({
        archived: data.archived,
        status: data.archived ? "Archived" : "In progress",
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, data.id), eq(projects.userId, userId)))
      .returning();
    const project = assertRow(updated, "Failed to update project.");
    await recordActivity({
      projectId: data.id,
      userId,
      action: data.archived ? "Project archived" : "Project unarchived",
    });
    return project;
  });

export const duplicateProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const source = await loadOwnedProject(userId, data.id);
    const [created] = await db
      .insert(projects)
      .values({
        id: randomUUID(),
        userId,
        name: `${source.name} (copy)`,
        description: source.description,
        status: source.status,
        progress: source.progress,
        tags: source.tags,
        favourite: source.favourite,
        archived: source.archived,
        cover: source.cover,
        coverPattern: source.coverPattern,
        template: source.template,
        visibility: source.visibility,
      })
      .returning();
    const project = assertRow(created, "Failed to duplicate project.");
    await recordActivity({ projectId: project.id, userId, action: "Project duplicated", detail: `from ${source.name}` });
    return project;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .validator((input: unknown) => projectIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await loadOwnedProject(userId, data.id);
    await db.delete(projects).where(and(eq(projects.id, data.id), eq(projects.userId, userId)));
    return { id: data.id };
  });

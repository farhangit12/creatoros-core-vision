import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { files, fileTypeValues, projectActivity, projects } from "@/db/schema";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, classifyMimeType } from "@/lib/files";
import { createUploadSignature, deleteFromCloudinary, type UploadSignature } from "./files-storage";

export type FileRecord = typeof files.$inferSelect;

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

async function loadOwnedFile(userId: string, fileId: string): Promise<FileRecord> {
  const [file] = await db
    .select()
    .from(files)
    .where(and(eq(files.id, fileId), eq(files.userId, userId)));
  if (!file) {
    throw new Error("File not found.");
  }
  return file;
}

export const listFiles = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  return db.select().from(files).where(eq(files.userId, userId)).orderBy(desc(files.createdAt));
});

/**
 * Issues a short-lived, folder-scoped Cloudinary upload signature for the
 * current user. The browser uploads directly to Cloudinary with this --
 * CLOUDINARY_API_SECRET is never sent to the client.
 */
export const getUploadSignature = createServerFn({ method: "POST" }).handler(
  async (): Promise<UploadSignature> => {
    const userId = await requireUserId();
    return createUploadSignature(userId);
  },
);

const createFileSchema = z.object({
  name: z.string().trim().min(1).max(300),
  mimeType: z.string().trim().min(1).max(120),
  size: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  url: z.string().trim().url(),
  storageKey: z.string().trim().min(1).max(300),
  /** Cloudinary's own real, server-side-detected resource_type ("image",
   * "video", "raw") -- see files-upload-client.ts. Cross-checked below
   * against what the claimed mimeType implies, since the browser-reported
   * mimeType alone (derived from the filename, not content) can be spoofed. */
  cloudinaryResourceType: z.string().trim().max(20).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  projectId: z.string().min(1).optional(),
});

/** Persists the metadata for a file the browser already uploaded directly to Cloudinary. */
export const createFileRecord = createServerFn({ method: "POST" })
  .validator((input: unknown) => createFileSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const classification = classifyMimeType(data.mimeType);
    if (!classification) {
      throw new Error(`Unsupported file type: ${data.mimeType}`);
    }
    // Real security check, not cosmetic: the claimed mimeType is
    // browser-reported (spoofable -- an attacker can rename a disguised
    // file so the browser reports whatever extension-derived MIME type they
    // want). cloudinaryResourceType comes from Cloudinary's own real content
    // inspection at upload time, so a mismatch here is a genuine signal the
    // upload isn't what it claims to be -- reject and delete the asset
    // rather than leave a suspicious file sitting in storage.
    if (data.cloudinaryResourceType && data.cloudinaryResourceType !== classification.resourceType) {
      await deleteFromCloudinary(data.storageKey, data.cloudinaryResourceType).catch(() => {
        // Best-effort cleanup -- the rejection below is what matters.
      });
      throw new Error(
        `File content doesn't match its claimed type (expected ${classification.resourceType}, got ${data.cloudinaryResourceType}).`,
      );
    }
    if (data.projectId) {
      const [project] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, data.projectId), eq(projects.userId, userId)));
      if (!project) {
        throw new Error("Project not found.");
      }
    }
    const [created] = await db
      .insert(files)
      .values({
        id: crypto.randomUUID(),
        userId,
        projectId: data.projectId ?? null,
        name: data.name,
        mimeType: data.mimeType,
        fileType: classification.fileType,
        size: data.size,
        url: data.url,
        storageKey: data.storageKey,
        resourceType: classification.resourceType,
        width: data.width ?? null,
        height: data.height ?? null,
      })
      .returning();
    const file = assertRow(created, "Failed to save file.");
    if (data.projectId) {
      await db.insert(projectActivity).values({
        id: crypto.randomUUID(),
        projectId: data.projectId,
        userId,
        action: "File uploaded",
        detail: data.name,
      });
    }
    return file;
  });

const fileIdSchema = z.object({ id: z.string().min(1) });

const renameFileSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Name is required.").max(300),
});

export const renameFile = createServerFn({ method: "POST" })
  .validator((input: unknown) => renameFileSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await loadOwnedFile(userId, data.id);
    const [updated] = await db
      .update(files)
      .set({ name: data.name, updatedAt: new Date() })
      .where(and(eq(files.id, data.id), eq(files.userId, userId)))
      .returning();
    return assertRow(updated, "Failed to rename file.");
  });

export const toggleFileFavourite = createServerFn({ method: "POST" })
  .validator((input: unknown) => fileIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const existing = await loadOwnedFile(userId, data.id);
    const [updated] = await db
      .update(files)
      .set({ favourite: !existing.favourite, updatedAt: new Date() })
      .where(and(eq(files.id, data.id), eq(files.userId, userId)))
      .returning();
    return assertRow(updated, "Failed to update file.");
  });

export const deleteFile = createServerFn({ method: "POST" })
  .validator((input: unknown) => fileIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const file = await loadOwnedFile(userId, data.id);
    await deleteFromCloudinary(file.storageKey, file.resourceType);
    await db.delete(files).where(and(eq(files.id, data.id), eq(files.userId, userId)));
    return { id: data.id };
  });

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES, fileTypeValues };

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { user, userSettings } from "@/db/schema";
import { tones } from "@/lib/creator-data";
import { createUploadSignature, deleteFromCloudinaryByUrl, isOwnCloudinaryUrl, type UploadSignature } from "@/lib/server/files-storage";

export type UserProfileRecord = typeof user.$inferSelect;
export type UserSettingsRecord = typeof userSettings.$inferSelect;

function assertRow<T>(row: T | undefined, message: string): T {
  if (!row) {
    throw new Error(message);
  }
  return row;
}

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  if (!session) {
    throw new Error("Not authenticated.");
  }
  return session.user.id;
}

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  role: z.string().trim().max(200).optional(),
  website: z.string().trim().max(300).optional(),
  bio: z.string().trim().max(2000).optional(),
});

const updateSettingsSchema = z.object({
  notifyProductUpdates: z.boolean().optional(),
  notifyAiUpdates: z.boolean().optional(),
  notifyCreditWarnings: z.boolean().optional(),
  notifyPlannerReminders: z.boolean().optional(),
  defaultAiTone: z.enum(tones as [string, ...string[]]).optional(),
  autosaveDrafts: z.boolean().optional(),
  keyboardFirstMode: z.boolean().optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
});

async function loadOrCreateSettings(userId: string): Promise<UserSettingsRecord> {
  const [existing] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  if (existing) {
    return existing;
  }
  const [created] = await db.insert(userSettings).values({ userId }).returning();
  if (!created) {
    throw new Error("Failed to initialize settings.");
  }
  return created;
}

export const getUserProfile = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const [profile] = await db.select().from(user).where(eq(user.id, userId));
  if (!profile) {
    throw new Error("Account not found.");
  }
  return profile;
});

export const updateUserProfile = createServerFn({ method: "POST" })
  .validator((input: unknown) => updateProfileSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const [updated] = await db
      .update(user)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning();
    return assertRow(updated, "Failed to update profile.");
  });

const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/**
 * Signs a direct browser-to-Cloudinary upload for the current user's avatar
 * folder, reusing the same signed-upload pattern already used for files,
 * reference images and project files.
 */
export const getAvatarUploadSignature = createServerFn({ method: "POST" }).handler(
  async (): Promise<UploadSignature> => {
    const userId = await requireUserId();
    return createUploadSignature(userId, `creatoros-avatars/${userId}`);
  },
);

const updateAvatarSchema = z.object({
  url: z.string().trim().url(),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive(),
});

export const updateUserAvatar = createServerFn({ method: "POST" })
  .validator((input: unknown) => updateAvatarSchema.parse(input))
  .handler(async ({ data }) => {
    if (!ALLOWED_AVATAR_MIME_TYPES.has(data.mimeType)) {
      throw new Error("Unsupported image type.");
    }
    if (data.size > MAX_AVATAR_BYTES) {
      throw new Error("Avatar image must be 5MB or smaller.");
    }
    const userId = await requireUserId();
    const [updated] = await db
      .update(user)
      .set({ image: data.url, updatedAt: new Date() })
      .where(eq(user.id, userId))
      .returning();
    return assertRow(updated, "Failed to update avatar.");
  });

/**
 * Clears the user's avatar entirely -- e.g. someone who signed up with
 * Google and doesn't want their Google profile picture used here either.
 * Only ever attempts a Cloudinary delete for a URL that's actually ours
 * (isOwnCloudinaryUrl) -- user.image can also be a Google-hosted OAuth
 * picture, which must never be sent to our Cloudinary destroy endpoint.
 * Same guard already used for this exact reason during account deletion
 * (see auth.ts's cleanupAvatar).
 */
export const removeUserAvatar = createServerFn({ method: "POST" }).handler(async () => {
  const userId = await requireUserId();
  const [current] = await db.select({ image: user.image }).from(user).where(eq(user.id, userId));
  if (current?.image && isOwnCloudinaryUrl(current.image)) {
    try {
      await deleteFromCloudinaryByUrl(current.image, "image");
    } catch {
      // Best-effort -- an orphaned Cloudinary asset must never block removing the avatar.
    }
  }
  const [updated] = await db
    .update(user)
    .set({ image: null, updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning();
  return assertRow(updated, "Failed to remove avatar.");
});

export const getUserSettings = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  return loadOrCreateSettings(userId);
});

export const updateUserSettings = createServerFn({ method: "POST" })
  .validator((input: unknown) => updateSettingsSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await loadOrCreateSettings(userId);
    const [updated] = await db
      .update(userSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();
    return assertRow(updated, "Failed to update settings.");
  });

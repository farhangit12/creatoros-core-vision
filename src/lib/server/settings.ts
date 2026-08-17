import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { user, userSettings } from "@/db/schema";
import { tones } from "@/lib/creator-data";

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

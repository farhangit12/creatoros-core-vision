import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendChangeEmailVerification, sendPasswordResetEmail } from "@/lib/server/email";
import { deleteFromCloudinary } from "@/lib/server/files-storage";

/**
 * Best-effort cleanup of the user's uploaded files on Cloudinary before the
 * account row (and everything FK-cascaded from it) is deleted. Deliberately
 * scoped to user-uploaded files only -- AI-generated images/thumbnails and
 * the avatar have no delete-from-Cloudinary path built anywhere in the app
 * yet, so those become orphaned assets on account deletion (a known,
 * reported limitation, not silently skipped).
 */
async function cleanupUserFiles(userId: string): Promise<void> {
  const rows = await db
    .select({ storageKey: schema.files.storageKey, resourceType: schema.files.resourceType })
    .from(schema.files)
    .where(eq(schema.files.userId, userId));
  for (const row of rows) {
    try {
      await deleteFromCloudinary(row.storageKey, row.resourceType);
    } catch {
      // Best-effort -- an orphaned Cloudinary asset must never block account deletion.
    }
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ to: user.email, name: user.name, url });
    },
  },
  // Only used by the change-email flow today (accounts here are never
  // verified at signup) -- confirms control of the new address before the
  // email actually changes. See update-user.mjs's /change-email endpoint:
  // since emailVerified is always false for this app's users, this is the
  // single confirmation step (no separate "confirm from old email" step).
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendChangeEmailVerification({ to: user.email, name: user.name, url });
    },
  },
  user: {
    changeEmail: {
      enabled: true,
    },
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        await cleanupUserFiles(user.id);
      },
    },
  },
  secret: process.env["BETTER_AUTH_SECRET"],
  baseURL: process.env["BETTER_AUTH_URL"],
  plugins: [tanstackStartCookies()],
});

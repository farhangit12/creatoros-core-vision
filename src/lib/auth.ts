import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { checkout, polar, portal, webhooks } from "@polar-sh/better-auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendChangeEmailVerification, sendPasswordResetEmail } from "@/lib/server/email";
import { deleteFromCloudinary, deleteFromCloudinaryByUrl, isOwnCloudinaryUrl } from "@/lib/server/files-storage";
import { destroyImageFromCloudinary } from "@/lib/ai/providers/image/cloudinary-upload";
import { initCreditAccountForNewUser } from "@/lib/server/credits";
import { polarClient } from "@/lib/server/polar-client";
import { syncPolarSubscriptionState } from "@/lib/server/polar-sync";
import { recordAuditEvent } from "@/lib/server/audit-log";

/** Best-effort cleanup of the user's uploaded files on Cloudinary before the
 * account row (and everything FK-cascaded from it) is deleted. */
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

/** Best-effort cleanup of the user's AI-generated images/thumbnails on
 * Cloudinary before account deletion -- previously left as orphaned,
 * indefinitely-billed assets (a known, reported gap). Reuses the AI image
 * pipeline's own delete-by-URL helper, same one already used for per-
 * generation deletes (see src/lib/server/ai/ai-usage.ts). */
async function cleanupAiAssets(userId: string): Promise<void> {
  const rows = await db
    .select({ url: schema.aiAssets.url })
    .from(schema.aiAssets)
    .where(eq(schema.aiAssets.userId, userId));
  await Promise.all(
    rows.map(async (row) => {
      try {
        await destroyImageFromCloudinary(row.url);
      } catch {
        // Best-effort -- an orphaned Cloudinary asset must never block account deletion.
      }
    }),
  );
}

/** Best-effort cleanup of the user's avatar on Cloudinary before account
 * deletion. Only ever attempts deletion for a URL that actually belongs to
 * this account's Cloudinary cloud name -- `user.image` can also be a
 * Google-hosted OAuth profile picture, which must never be mistaken for our
 * own asset and sent to our Cloudinary destroy endpoint. */
async function cleanupAvatar(image: string | null | undefined): Promise<void> {
  if (!image || !isOwnCloudinaryUrl(image)) return;
  try {
    await deleteFromCloudinaryByUrl(image, "image");
  } catch {
    // Best-effort -- an orphaned Cloudinary asset must never block account deletion.
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
        await recordAuditEvent({ userId: user.id, event: "account_deleted" });
        await cleanupUserFiles(user.id);
        await cleanupAiAssets(user.id);
        await cleanupAvatar(user.image);
      },
    },
  },
  socialProviders: {
    google: {
      clientId: process.env["GOOGLE_CLIENT_ID"] as string,
      clientSecret: process.env["GOOGLE_CLIENT_SECRET"] as string,
    },
  },
  // Without this, better-auth blocks Google sign-in with "account_not_linked"
  // for every existing email/password user (traced to
  // node_modules/better-auth/dist/oauth2/link-account.mjs's
  // requireLocalEmailVerified check, which defaults to true and compares
  // against the LOCAL account's emailVerified) -- this app never verifies
  // email at signup for any account (see the emailVerification comment
  // above), so that check fails unconditionally. Trade-off, accepted for now
  // per user decision: this reopens the standard email/password-then-OAuth
  // account-linking attack (attacker pre-registers your email, you later
  // "Sign in with Google" and get silently linked to their account) -- low
  // stakes today since there are no real users/payments yet. Revisit once
  // there are (e.g. by turning on real email verification and removing this
  // override, rather than leaving it permanently disabled).
  account: {
    accountLinking: {
      requireLocalEmailVerified: false,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Covers both email/password and Google OAuth signups -- both
          // create a `user` row through this same hook.
          await initCreditAccountForNewUser(user.id);
        },
      },
    },
  },
  secret: process.env["BETTER_AUTH_SECRET"],
  baseURL: process.env["BETTER_AUTH_URL"],
  // Explicit instead of relying on the implicit baseURL-only default --
  // hardens origin/CSRF checking for cookie-based auth.
  trustedOrigins: process.env["BETTER_AUTH_URL"] ? [process.env["BETTER_AUTH_URL"]] : undefined,
  // better-auth's default in-memory rate-limit storage doesn't enforce
  // correctly across Cloudflare Workers' distributed isolates (each isolate
  // has its own memory) -- "database" uses the new `rateLimit` table
  // instead (drizzle/0008_rate_limit.sql), so the limit is actually shared
  // and enforced. `enabled: true` makes this explicit rather than relying
  // on better-auth's own `isProduction`-derived default. Built-in special
  // rules already cover /sign-in, /sign-up, /change-password, /change-email
  // (3 req/10s) and password-reset endpoints (3 req/60s) -- see
  // node_modules/better-auth/node_modules/@better-auth/core/.../rate-limiter.
  rateLimit: {
    enabled: true,
    storage: "database",
  },
  // Best-effort audit trail for the two sensitive self-service account
  // changes that don't go through the databaseHooks below (password/email
  // change). Wrapped so a logging failure can never break the real change
  // it's describing -- recordAuditEvent already swallows its own errors.
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/change-password" && ctx.path !== "/change-email") return;
      const userId = ctx.context.session?.user?.id ?? ctx.context.newSession?.user?.id;
      if (!userId) return;
      await recordAuditEvent({
        userId,
        event: ctx.path === "/change-password" ? "password_changed" : "email_change_requested",
        ...(ctx.request ? { request: ctx.request } : {}),
      });
    }),
  },
  plugins: [
    tanstackStartCookies(),
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            { productId: process.env["POLAR_PRO_PRODUCT_ID"] as string, slug: "pro" },
            { productId: process.env["POLAR_SCALE_PRODUCT_ID"] as string, slug: "scale" },
          ],
          successUrl: "/billing?checkout=success",
        }),
        portal(),
        // Only wired once a webhook is actually registered in Polar's
        // dashboard and POLAR_WEBHOOK_SECRET is set -- webhooks() requires a
        // real secret string, and there's nothing to receive from Polar
        // until an endpoint is registered anyway, so omit rather than risk
        // passing an empty/undefined secret.
        ...(process.env["POLAR_WEBHOOK_SECRET"]
          ? [
              webhooks({
                secret: process.env["POLAR_WEBHOOK_SECRET"],
                onCustomerStateChanged: async (payload) => {
                  if (payload.data.externalId) {
                    await syncPolarSubscriptionState(payload.data.externalId);
                  }
                },
                onOrderPaid: async (payload) => {
                  const externalId = payload.data.customer.externalId;
                  if (externalId) {
                    await syncPolarSubscriptionState(externalId);
                  }
                },
              }),
            ]
          : []),
      ],
    }),
  ],
});

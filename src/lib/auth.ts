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
import { executionContextStorage } from "@/lib/server/execution-context";

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

/** Bounds a best-effort Polar SDK call so it can never hang the request it's
 * attached to -- these hooks are explicitly meant to be "never blocking",
 * but a bare `await` on a third-party API call has no such guarantee on its
 * own. Short timeout: these are fire-and-forget sync operations, not
 * something a real user is ever waiting on directly. */
async function withPolarTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after 8000ms`)), 8_000),
    ),
  ]);
}

/** Best-effort Polar customer creation, run from our own `after` hook
 * instead of the `@polar-sh/better-auth` plugin's `createCustomerOnSignUp`
 * option -- that option runs as a `before`-create hook that THROWS a raw
 * `APIError` (with Polar's internal error text forwarded verbatim) on any
 * failure, which better-auth surfaces as an unhandled 500 to the client and
 * blocks the entire signup, even for a transient Polar-side issue or an
 * edge-case email address Polar's validator rejects. Not required for
 * correctness: `checkout()`/`portal()` both pass `externalCustomerId` and
 * Polar lazily creates the customer at checkout time if one doesn't exist
 * yet (confirmed by reading node_modules/@polar-sh/better-auth's checkout/
 * portal source -- same `externalCustomerId` pattern used here), so a user
 * without a Polar customer row yet can still upgrade normally. This mirrors
 * the plugin's own proven list-then-create-or-update logic, just as a
 * swallow-and-log step that can never block account creation -- same
 * best-effort posture as cleanupUserFiles/cleanupAiAssets/cleanupAvatar
 * above. */
async function createPolarCustomerBestEffort(user: { id: string; email: string; name: string }): Promise<void> {
  try {
    await withPolarTimeout(
      (async () => {
        const { result } = await polarClient.customers.list({ email: user.email });
        const existing = result.items[0];
        if (!existing) {
          await polarClient.customers.create({ email: user.email, name: user.name, externalId: user.id });
        } else if (existing.externalId !== user.id) {
          await polarClient.customers.update({ id: existing.id, customerUpdate: { externalId: user.id } });
        }
      })(),
      "Polar customer creation",
    );
  } catch (error) {
    console.error("Polar customer creation failed (non-blocking):", error);
  }
}

/** Best-effort Polar customer email/name sync on user update (e.g. the
 * change-email flow) -- replaces the plugin's own `update.after` hook, which
 * is gated behind the same `createCustomerOnSignUp` flag we've turned off
 * above (confirmed by reading the plugin source: all four of its hooks share
 * that one option), so disabling it silently would have desynced Polar's
 * customer record from real account changes going forward. */
async function updatePolarCustomerBestEffort(user: { id: string; email: string; name: string }): Promise<void> {
  try {
    await withPolarTimeout(
      polarClient.customers.updateExternal({
        externalId: user.id,
        customerUpdateExternalID: { email: user.email, name: user.name },
      }),
      "Polar customer update",
    );
  } catch (error) {
    console.error("Polar customer update failed (non-blocking):", error);
  }
}

/** Best-effort Polar customer deletion on account deletion -- replaces the
 * plugin's own `delete.after` hook (same reasoning as
 * updatePolarCustomerBestEffort above). Without this, deleting a CreatorOS
 * account would leave an orphaned Polar customer record behind -- the same
 * class of gap the Cloudinary asset cleanup in cleanupAiAssets/cleanupAvatar
 * was written to close for storage, just for billing data instead. */
async function deletePolarCustomerBestEffort(userId: string): Promise<void> {
  try {
    await withPolarTimeout(
      polarClient.customers.deleteExternal({ externalId: userId }),
      "Polar customer delete",
    );
  } catch (error) {
    console.error("Polar customer delete failed (non-blocking):", error);
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
        await deletePolarCustomerBestEffort(user.id);
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
          await createPolarCustomerBestEffort(user);
        },
      },
      update: {
        after: async (user) => {
          await updatePolarCustomerBestEffort(user);
        },
      },
    },
  },
  // Without this, any better-auth-level failure (e.g. the OAuth-callback DB
  // stall documented in server.ts's /api/auth branch) redirects to
  // better-auth's own default `/api/auth/error` -- which, in production,
  // itself immediately redirects again to the bare homepage (`/`) with the
  // error silently sitting in the URL's query string, never shown to the
  // user (confirmed live: `src/routes/index.tsx` never reads it). Pointing
  // this at `/login` instead means the failure lands back where the "sign
  // in with Google" button actually is, and `login.tsx` now reads the
  // `error`/`error_description` params to show a real, visible message
  // instead of a silent dead end.
  onAPIError: {
    errorURL: "/login",
  },
  secret: process.env["BETTER_AUTH_SECRET"],
  baseURL: process.env["BETTER_AUTH_URL"],
  // Explicit instead of relying on the implicit baseURL-only default --
  // hardens origin/CSRF checking for cookie-based auth.
  trustedOrigins: process.env["BETTER_AUTH_URL"] ? [process.env["BETTER_AUTH_URL"]] : undefined,
  // better-auth's default in-memory rate-limit storage doesn't enforce
  // correctly across multiple serverless instances (each has its own
  // memory) -- "database" storage (the `rateLimit` table,
  // drizzle/0008_rate_limit.sql) shares/enforces the limit correctly via
  // Postgres instead. (On Cloudflare Workers this table's own reads had
  // been the dominant trigger of a `cloudflare:sockets`-specific connection
  // stall -- see CLAUDE.md's "Final Handover Push" section -- which was
  // this app's whole reason for moving off Cloudflare; that failure mode is
  // specific to that runtime and doesn't apply on Vercel's plain Node.js
  // functions, so the Postgres-backed storage is used directly here.)
  // `enabled: true` makes rate-limiting explicit rather than relying on
  // better-auth's own `isProduction`-derived default. Built-in special
  // rules already cover /sign-in, /sign-up, /change-password, /change-email
  // (3 req/10s) and password-reset endpoints (3 req/60s) -- see
  // node_modules/better-auth/node_modules/@better-auth/core/.../rate-limiter.
  rateLimit: {
    enabled: true,
    storage: "database",
  },
  // Without this, better-auth can't determine the real client IP behind
  // Vercel's proxy -- its own default only checks `x-forwarded-for`
  // (node_modules/better-auth/node_modules/@better-auth/core/src/utils/
  // ip.ts), not Vercel's own `x-real-ip` header.
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-real-ip", "x-forwarded-for"],
    },
    // Without this, better-auth's internal `runInBackgroundOrAwait` (used
    // by, among other things, the database rate limiter's periodic
    // expired-rows cleanup -- node_modules/better-auth/dist/api/
    // rate-limiter/index.mjs) has no real background-task mechanism to
    // call, so it silently falls through to a plain `await` -- turning a
    // "background" cleanup into something that blocks the actual response.
    // executionContextStorage (execution-context.ts) makes the current
    // request's real Vercel `waitUntil` available here via
    // AsyncLocalStorage, since this handler has no direct access to it.
    // Falls back to a plain `await` (better-auth's own default) wherever no
    // such runtime property exists -- same as before this was wired up.
    backgroundTasks: {
      handler: (promise: Promise<unknown>) => {
        const waitUntil = executionContextStorage.getStore();
        if (waitUntil) {
          waitUntil(promise);
        } else {
          void promise;
        }
      },
    },
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
      // false, not true: see createPolarCustomerBestEffort above for why --
      // the plugin's own createCustomerOnSignUp throws a raw, signup-
      // blocking 500 on any Polar-side failure. We create the customer
      // ourselves, best-effort, from our own after-create hook instead.
      createCustomerOnSignUp: false,
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

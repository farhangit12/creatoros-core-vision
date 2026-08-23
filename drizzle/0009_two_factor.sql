-- Additive only: one new column on the existing "user" table, plus one new
-- table -- better-auth's own two-factor plugin storage contract (see
-- node_modules/better-auth/dist/plugins/two-factor/schema.mjs). No existing
-- table structure changed, nothing removed.
ALTER TABLE "user" ADD COLUMN "twoFactorEnabled" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE TABLE "twoFactor" (
  "id" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "secret" text NOT NULL,
  "backupCodes" text NOT NULL,
  "verified" boolean NOT NULL DEFAULT true,
  "failedVerificationCount" integer NOT NULL DEFAULT 0,
  "lockedUntil" timestamp
);
--> statement-breakpoint
CREATE INDEX "twoFactor_userId_idx" ON "twoFactor" ("userId");
--> statement-breakpoint
CREATE INDEX "twoFactor_secret_idx" ON "twoFactor" ("secret");

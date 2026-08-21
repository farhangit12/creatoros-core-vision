-- Additive only: one new table, better-auth's own rate-limit storage
-- contract (id/key/count/lastRequest). No existing table touched.
CREATE TABLE "rateLimit" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "count" integer NOT NULL,
  "lastRequest" bigint NOT NULL
);

CREATE INDEX "rateLimit_key_idx" ON "rateLimit" ("key");

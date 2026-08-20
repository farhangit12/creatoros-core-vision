-- Billing & Credits system: additive-only migration.
-- Creates two new tables: user_credits (one row per user, current plan +
-- balance + monthly renewal date -- mirrors the user_settings one-row-per-
-- user pattern) and credit_ledger (an auditable append-only history of every
-- balance change: signup bonus, monthly reset, AI-generation debit, or a
-- future admin adjustment). Does NOT create, alter, or drop any existing
-- table or column.

CREATE TABLE "user_credits" (
	"userId" text PRIMARY KEY NOT NULL,
	"planId" text DEFAULT 'free' NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"renewsAt" timestamp NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_userId_user_id_fk"
	FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE TABLE "credit_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"generationId" text,
	"balanceAfter" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_userId_user_id_fk"
	FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_generationId_ai_generations_id_fk"
	FOREIGN KEY ("generationId") REFERENCES "public"."ai_generations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "credit_ledger_userId_idx" ON "credit_ledger" USING btree ("userId");

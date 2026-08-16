-- Phase 3B: additive-only migration.
-- Creates 4 new application tables: ai_conversations, ai_messages, ai_generations, ai_assets.
-- All FKs reference the existing "user" table (Better Auth managed) or the new tables themselves.
-- Does NOT create, alter, or drop "user", "session", "account", "verification", "audit_log",
-- "projects", "planner_items", or "user_settings".

CREATE TABLE "ai_conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"feature" text NOT NULL,
	"title" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "ai_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversationId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "ai_generations" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"conversationId" text,
	"feature" text NOT NULL,
	"operation" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"errorMessage" text,
	"promptTokens" integer,
	"completionTokens" integer,
	"totalTokens" integer,
	"costCents" integer,
	"durationMs" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint

CREATE TABLE "ai_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"generationId" text NOT NULL,
	"assetType" text NOT NULL,
	"url" text NOT NULL,
	"variantIndex" integer DEFAULT 0 NOT NULL,
	"width" integer,
	"height" integer,
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_user_id_fk"
	FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversationId_ai_conversations_id_fk"
	FOREIGN KEY ("conversationId") REFERENCES "public"."ai_conversations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_userId_user_id_fk"
	FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_userId_user_id_fk"
	FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_conversationId_ai_conversations_id_fk"
	FOREIGN KEY ("conversationId") REFERENCES "public"."ai_conversations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ai_assets" ADD CONSTRAINT "ai_assets_userId_user_id_fk"
	FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ai_assets" ADD CONSTRAINT "ai_assets_generationId_ai_generations_id_fk"
	FOREIGN KEY ("generationId") REFERENCES "public"."ai_generations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "ai_conversations_userId_idx" ON "ai_conversations" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX "ai_conversations_createdAt_idx" ON "ai_conversations" USING btree ("createdAt");
--> statement-breakpoint

CREATE INDEX "ai_messages_conversationId_idx" ON "ai_messages" USING btree ("conversationId");
--> statement-breakpoint
CREATE INDEX "ai_messages_userId_idx" ON "ai_messages" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX "ai_messages_createdAt_idx" ON "ai_messages" USING btree ("createdAt");
--> statement-breakpoint

CREATE INDEX "ai_generations_userId_idx" ON "ai_generations" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX "ai_generations_conversationId_idx" ON "ai_generations" USING btree ("conversationId");
--> statement-breakpoint
CREATE INDEX "ai_generations_status_idx" ON "ai_generations" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "ai_generations_createdAt_idx" ON "ai_generations" USING btree ("createdAt");
--> statement-breakpoint

CREATE INDEX "ai_assets_userId_idx" ON "ai_assets" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX "ai_assets_generationId_idx" ON "ai_assets" USING btree ("generationId");
--> statement-breakpoint
CREATE INDEX "ai_assets_createdAt_idx" ON "ai_assets" USING btree ("createdAt");

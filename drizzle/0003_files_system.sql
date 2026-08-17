-- Files checkpoint: additive-only migration.
-- Creates 1 new table: files. Does NOT create, alter, or drop any existing
-- table ("user", "session", "account", "verification", "audit_log",
-- "projects", "planner_items", "ai_conversations", "ai_messages",
-- "ai_generations", "ai_assets", "user_settings").

CREATE TABLE "files" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"mimeType" text NOT NULL,
	"fileType" text NOT NULL,
	"size" integer NOT NULL,
	"url" text NOT NULL,
	"storageKey" text NOT NULL,
	"resourceType" text NOT NULL,
	"width" integer,
	"height" integer,
	"favourite" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "files" ADD CONSTRAINT "files_userId_user_id_fk"
	FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "files_userId_idx" ON "files" USING btree ("userId");
--> statement-breakpoint
CREATE INDEX "files_createdAt_idx" ON "files" USING btree ("createdAt");

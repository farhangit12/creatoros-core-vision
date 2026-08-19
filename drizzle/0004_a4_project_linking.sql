-- ASCEND A4 Projects: additive-only migration.
-- Adds nullable "projectId" link columns to ai_generations, ai_assets,
-- ai_conversations, and files (so Scripts/Images/Thumbnails/Chats/Files can
-- be linked to a project from the Project detail page). Adds "coverPattern"
-- and "template" columns to projects (persists the Create-project dialog's
-- existing selectors, which were previously collected in the UI but
-- silently discarded — never sent to the server). Creates one new table,
-- project_activity, for a real per-project activity feed.
-- Does NOT create, alter, or drop any existing table's existing columns,
-- and does not touch "user", "session", "account", "verification",
-- "audit_log", "planner_items", "ai_messages", "user_settings".

ALTER TABLE "ai_generations" ADD COLUMN "projectId" text;
--> statement-breakpoint

ALTER TABLE "ai_generations" ADD CONSTRAINT "ai_generations_projectId_projects_id_fk"
	FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "ai_generations_projectId_idx" ON "ai_generations" USING btree ("projectId");
--> statement-breakpoint

ALTER TABLE "ai_assets" ADD COLUMN "projectId" text;
--> statement-breakpoint

ALTER TABLE "ai_assets" ADD CONSTRAINT "ai_assets_projectId_projects_id_fk"
	FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "ai_assets_projectId_idx" ON "ai_assets" USING btree ("projectId");
--> statement-breakpoint

ALTER TABLE "ai_conversations" ADD COLUMN "projectId" text;
--> statement-breakpoint

ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_projectId_projects_id_fk"
	FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "ai_conversations_projectId_idx" ON "ai_conversations" USING btree ("projectId");
--> statement-breakpoint

ALTER TABLE "files" ADD COLUMN "projectId" text;
--> statement-breakpoint

ALTER TABLE "files" ADD CONSTRAINT "files_projectId_projects_id_fk"
	FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "files_projectId_idx" ON "files" USING btree ("projectId");
--> statement-breakpoint

ALTER TABLE "projects" ADD COLUMN "coverPattern" text;
--> statement-breakpoint

ALTER TABLE "projects" ADD COLUMN "template" text;
--> statement-breakpoint

CREATE TABLE "project_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"userId" text NOT NULL,
	"action" text NOT NULL,
	"detail" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "project_activity" ADD CONSTRAINT "project_activity_projectId_projects_id_fk"
	FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "project_activity" ADD CONSTRAINT "project_activity_userId_user_id_fk"
	FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "project_activity_projectId_idx" ON "project_activity" USING btree ("projectId");
--> statement-breakpoint

CREATE INDEX "project_activity_createdAt_idx" ON "project_activity" USING btree ("createdAt");

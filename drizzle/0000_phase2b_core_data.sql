-- Phase 2B: additive-only migration.
-- Adds 3 nullable columns to the existing "user" table (Better Auth managed).
-- Creates 3 new application tables: projects, planner_items, user_settings.
-- Does NOT create, alter, or drop "account", "session", "verification", or "audit_log".

ALTER TABLE "user" ADD COLUMN "role" text;
ALTER TABLE "user" ADD COLUMN "website" text;
ALTER TABLE "user" ADD COLUMN "bio" text;
--> statement-breakpoint

CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'Idea' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"favourite" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"cover" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "planner_items" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"projectId" text,
	"title" text NOT NULL,
	"platform" text NOT NULL,
	"stage" text DEFAULT 'Idea' NOT NULL,
	"day" integer NOT NULL,
	"scheduledAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "user_settings" (
	"userId" text PRIMARY KEY NOT NULL,
	"notifyProductUpdates" boolean DEFAULT true NOT NULL,
	"notifyAiUpdates" boolean DEFAULT true NOT NULL,
	"notifyCreditWarnings" boolean DEFAULT true NOT NULL,
	"notifyPlannerReminders" boolean DEFAULT true NOT NULL,
	"defaultAiTone" text DEFAULT 'Direct, dry' NOT NULL,
	"autosaveDrafts" boolean DEFAULT true NOT NULL,
	"keyboardFirstMode" boolean DEFAULT true NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_user_id_fk"
	FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "planner_items" ADD CONSTRAINT "planner_items_userId_user_id_fk"
	FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "planner_items" ADD CONSTRAINT "planner_items_projectId_projects_id_fk"
	FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_userId_user_id_fk"
	FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

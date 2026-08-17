-- Phase 2B: additive-only migration.
-- Adds a single "theme" column to the existing "user_settings" table to support
-- the Dark / Light / System appearance preference. Does NOT create, alter, or
-- drop any other table or column.

ALTER TABLE "user_settings" ADD COLUMN "theme" text DEFAULT 'dark' NOT NULL;

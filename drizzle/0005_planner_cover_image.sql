-- Content Planner cover image: additive-only migration.
-- Adds one nullable "coverImage" text column to planner_items, so a content
-- item can carry a real image URL (e.g. handed off from Thumbnail Studio's
-- "Add to planner" action, or Image Studio) instead of no image at all.
-- Does NOT create, alter, or drop any other column or table.

ALTER TABLE "planner_items" ADD COLUMN "coverImage" text;

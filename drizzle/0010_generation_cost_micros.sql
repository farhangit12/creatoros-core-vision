-- Additive only: one new column on the existing "ai_generations" table.
-- The existing "costCents" column (whole integer cents) can't actually
-- represent real per-request AI costs -- a typical chat reply or image
-- costs well under one cent, which would always round to 0. costMicros
-- stores cost in millionths of a dollar (1,000,000 = $1.00), giving enough
-- precision to show a real non-zero number. costCents is left in place,
-- untouched, still null (no data loss, no type change).
ALTER TABLE "ai_generations" ADD COLUMN "costMicros" bigint;

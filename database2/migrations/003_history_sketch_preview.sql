-- Realize Me — persist combined sketch preview PNG on history rows
-- Run against fyp_clothing_db (same DB as 002_drafts_history_search_results.sql):
--   psql -U postgres -d fyp_clothing_db -f database2/migrations/003_history_sketch_preview.sql

BEGIN;

ALTER TABLE history
    ADD COLUMN IF NOT EXISTS sketch_preview_url TEXT NOT NULL DEFAULT '';

COMMIT;

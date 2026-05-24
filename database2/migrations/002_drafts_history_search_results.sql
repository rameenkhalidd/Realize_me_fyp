-- Realize Me — drafts, generation history, and CLIP search persistence
-- Run against fyp_clothing_db (same DB as products / embeddings).
--   psql -U postgres -d fyp_clothing_db -f database/migrations/002_drafts_history_search_results.sql

BEGIN;

-- One in-progress canvas per Firebase user (upsert on auto-save)
CREATE TABLE IF NOT EXISTS drafts (
    id                  SERIAL PRIMARY KEY,
    firebase_uid        VARCHAR(128) NOT NULL UNIQUE,
    sketch_json         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    generated_image_url TEXT,
    pix2pix_model_version VARCHAR(64) NOT NULL DEFAULT 'scribbler-v2',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    is_saved            BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_drafts_firebase_uid ON drafts (firebase_uid);

-- Completed generations (one row per successful /api/generate)
CREATE TABLE IF NOT EXISTS history (
    id                    SERIAL PRIMARY KEY,
    firebase_uid          VARCHAR(128) NOT NULL,
    sketch_json           JSONB        NOT NULL DEFAULT '{}'::jsonb,
    generated_image_url   TEXT         NOT NULL DEFAULT '',
    generation_timestamp  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    session_id            VARCHAR(64),
    pix2pix_model_version VARCHAR(64)  NOT NULL DEFAULT 'scribbler-v2'
);

CREATE INDEX IF NOT EXISTS idx_history_firebase_uid ON history (firebase_uid);
CREATE INDEX IF NOT EXISTS idx_history_generation_ts ON history (generation_timestamp DESC);

-- Top-k similar products for a history row (FashionCLIP + pgvector snapshot)
CREATE TABLE IF NOT EXISTS search_results (
    id               SERIAL PRIMARY KEY,
    firebase_uid     VARCHAR(128) NOT NULL,
    history_id       INTEGER      NOT NULL REFERENCES history (id) ON DELETE CASCADE,
    product_id       BIGINT       NOT NULL REFERENCES products (product_id) ON DELETE CASCADE,
    similarity_score DOUBLE PRECISION NOT NULL,
    rank_position    INTEGER      NOT NULL,
    searched_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    category         VARCHAR(256)
);

CREATE INDEX IF NOT EXISTS idx_search_results_firebase_uid ON search_results (firebase_uid);
CREATE INDEX IF NOT EXISTS idx_search_results_history_id ON search_results (history_id);

COMMIT;

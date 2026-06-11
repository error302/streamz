-- ============================================
-- StreamZ - Phase 4 Schema Additions
-- Migration: 006_phase4
-- ============================================
-- Adds: scene_change_score, prompt_feedback table,
--        rejection_reason, approval_feedback columns

-- ---- Add scene_change_score to highlights ----
ALTER TABLE highlights
  ADD COLUMN IF NOT EXISTS scene_change_score DOUBLE PRECISION NOT NULL DEFAULT 0
  CHECK (scene_change_score >= 0 AND scene_change_score <= 1);

-- ---- Add rejection_reason column to ai_content ----
ALTER TABLE ai_content
  ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500);

-- ---- Add approval_feedback JSONB column to ai_content ----
ALTER TABLE ai_content
  ADD COLUMN IF NOT EXISTS approval_feedback JSONB;

-- ---- Add index on prompt_version for ai_content (for A/B test lookups) ----
CREATE INDEX IF NOT EXISTS idx_ai_content_prompt_version ON ai_content (prompt_version);

-- ---- Prompt Feedback Table (A/B Test Results) ----
-- Tracks which prompt versions lead to approved vs rejected content
CREATE TABLE IF NOT EXISTS prompt_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_version VARCHAR(50) NOT NULL,
  platform target_platform NOT NULL,
  approved BOOLEAN NOT NULL,
  rejection_reason VARCHAR(500),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying by prompt version + platform (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_prompt_feedback_version_platform ON prompt_feedback (prompt_version, platform);

-- Index for time-based analysis
CREATE INDEX IF NOT EXISTS idx_prompt_feedback_created_at ON prompt_feedback (created_at DESC);

-- Index for approval rate calculations
CREATE INDEX IF NOT EXISTS idx_prompt_feedback_approved ON prompt_feedback (approved);

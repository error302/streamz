-- ============================================
-- StreamZ - Initial Database Schema
-- Migration: 001_initial
-- ============================================

-- ---- Custom Enum Types ----
CREATE TYPE platform_type AS ENUM ('twitch', 'youtube');
CREATE TYPE stream_status AS ENUM ('detected', 'capturing', 'captured', 'processing', 'processed', 'completed', 'failed');
CREATE TYPE clip_type AS ENUM ('short', 'medium', 'full');
CREATE TYPE target_platform AS ENUM ('youtube_vod', 'youtube_shorts', 'instagram_reels', 'instagram_stories', 'tiktok');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'edited');
CREATE TYPE publish_status AS ENUM ('queued', 'publishing', 'published', 'failed');

-- ---- Streams Table ----
-- Tracks live stream sessions from Twitch/YouTube
CREATE TABLE streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform platform_type NOT NULL,
  platform_stream_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  game_category VARCHAR(255),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  vod_r2_key VARCHAR(500),
  chat_log_r2_key VARCHAR(500),
  status stream_status NOT NULL DEFAULT 'detected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_stream_platform_id UNIQUE (platform, platform_stream_id)
);

CREATE INDEX idx_streams_platform ON streams (platform);
CREATE INDEX idx_streams_status ON streams (status);
CREATE INDEX idx_streams_started_at ON streams (started_at DESC);

-- ---- Highlights Table ----
-- Detected highlight moments within a stream
CREATE TABLE highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  start_time DOUBLE PRECISION NOT NULL CHECK (start_time >= 0),
  end_time DOUBLE PRECISION NOT NULL CHECK (end_time > start_time),
  highlight_score DOUBLE PRECISION NOT NULL CHECK (highlight_score >= 0 AND highlight_score <= 1),
  chat_spike_intensity DOUBLE PRECISION NOT NULL DEFAULT 0,
  audio_energy_score DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (audio_energy_score >= 0 AND audio_energy_score <= 1),
  clip_r2_key VARCHAR(500),
  clip_duration DOUBLE PRECISION NOT NULL CHECK (clip_duration > 0),
  clip_type clip_type NOT NULL DEFAULT 'medium',
  status VARCHAR(50) NOT NULL DEFAULT 'detected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_highlights_stream_id ON highlights (stream_id);
CREATE INDEX idx_highlights_score ON highlights (highlight_score DESC);
CREATE INDEX idx_highlights_type ON highlights (clip_type);

-- ---- AI Content Table ----
-- AI-generated content for each highlight + target platform combo
CREATE TABLE ai_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id UUID NOT NULL REFERENCES highlights(id) ON DELETE CASCADE,
  target_platform target_platform NOT NULL,
  title VARCHAR(500) NOT NULL,
  description VARCHAR(5000) NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  suggested_post_time TIMESTAMPTZ,
  prompt_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  review_status review_status NOT NULL DEFAULT 'pending',
  edited BOOLEAN NOT NULL DEFAULT false,
  original_content JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_highlight_platform UNIQUE (highlight_id, target_platform)
);

CREATE INDEX idx_ai_content_highlight_id ON ai_content (highlight_id);
CREATE INDEX idx_ai_content_target_platform ON ai_content (target_platform);
CREATE INDEX idx_ai_content_review_status ON ai_content (review_status);

-- ---- Publish Queue Table ----
-- Tracks content publishing to external platforms
CREATE TABLE publish_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_content_id UUID NOT NULL REFERENCES ai_content(id) ON DELETE CASCADE,
  bullmq_job_id VARCHAR(255),
  platform target_platform NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  platform_content_id VARCHAR(500),
  status publish_status NOT NULL DEFAULT 'queued',
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_publish_queue_ai_content_id ON publish_queue (ai_content_id);
CREATE INDEX idx_publish_queue_status ON publish_queue (status);
CREATE INDEX idx_publish_queue_scheduled_at ON publish_queue (scheduled_at);
CREATE INDEX idx_publish_queue_platform ON publish_queue (platform);

-- ---- Analytics Table ----
-- Performance metrics pulled from published content
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_queue_id UUID NOT NULL REFERENCES publish_queue(id) ON DELETE CASCADE,
  platform target_platform NOT NULL,
  views BIGINT NOT NULL DEFAULT 0,
  likes BIGINT NOT NULL DEFAULT 0,
  comments BIGINT NOT NULL DEFAULT 0,
  shares BIGINT NOT NULL DEFAULT 0,
  click_through_rate DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (click_through_rate >= 0 AND click_through_rate <= 1),
  average_watch_time DOUBLE PRECISION NOT NULL DEFAULT 0,
  audience_retention_percent DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (audience_retention_percent >= 0 AND audience_retention_percent <= 100),
  pulled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_publish_queue_id ON analytics (publish_queue_id);
CREATE INDEX idx_analytics_platform ON analytics (platform);
CREATE INDEX idx_analytics_pulled_at ON analytics (pulled_at DESC);

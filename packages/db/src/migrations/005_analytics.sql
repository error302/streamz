-- Analytics table for performance data from platform APIs
-- Feeds back into AI Optimizer and Highlight Engine for continuous improvement

CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_queue_id UUID REFERENCES publish_queue(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  click_through_rate NUMERIC(5,4) DEFAULT 0,
  average_watch_time INTEGER DEFAULT 0, -- seconds
  audience_retention_percent NUMERIC(5,2) DEFAULT 0,
  pulled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_publish_queue ON analytics(publish_queue_id);
CREATE INDEX idx_analytics_platform ON analytics(platform);
CREATE INDEX idx_analytics_pulled_at ON analytics(pulled_at);

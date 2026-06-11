-- ============================================
-- StreamZ - Notifications Schema
-- Migration: 003_notifications
-- ============================================

-- ---- Users Table (synced from Clerk) ----
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(500) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  image_url VARCHAR(1000),
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  clerk_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- ---- Notifications Table ----
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  message VARCHAR(2000) NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_user_read ON notifications (user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC);

-- ---- Notification Preferences Table ----
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stream_detected BOOLEAN NOT NULL DEFAULT true,
  highlight_found BOOLEAN NOT NULL DEFAULT true,
  content_ready BOOLEAN NOT NULL DEFAULT true,
  publish_success BOOLEAN NOT NULL DEFAULT true,
  publish_failed BOOLEAN NOT NULL DEFAULT true,
  weekly_digest BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_notification_preferences_user_id UNIQUE (user_id)
);

-- ---- Connected Accounts Table ----
CREATE TABLE connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  platform_user_id VARCHAR(255) NOT NULL,
  platform_username VARCHAR(255),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_user_platform UNIQUE (user_id, platform)
);

CREATE INDEX idx_connected_accounts_user_id ON connected_accounts (user_id);
CREATE INDEX idx_connected_accounts_platform ON connected_accounts (platform);

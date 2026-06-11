// ============================================
// StreamZ - Constants & Configuration
// ============================================

import type { Platform, StreamStatus, ClipType, TargetPlatform, ReviewStatus, PublishStatus } from './types.js';

// ---- BullMQ Queue Names ----
// NOTE: QUEUES and QueueName are now defined in ./queue.ts
// They are re-exported from the main index for backward compatibility.

// ---- Platform Constants ----
export const PLATFORMS: Platform[] = ['twitch', 'youtube'];

export const STREAM_STATUSES: StreamStatus[] = [
  'detected',
  'capturing',
  'captured',
  'processing',
  'processed',
  'completed',
  'failed',
];

export const CLIP_TYPES: ClipType[] = ['short', 'medium', 'full'];

export const TARGET_PLATFORMS: TargetPlatform[] = [
  'youtube_vod',
  'youtube_shorts',
  'instagram_reels',
  'instagram_stories',
  'tiktok',
];

export const REVIEW_STATUSES: ReviewStatus[] = ['pending', 'approved', 'rejected', 'edited'];

export const PUBLISH_STATUSES: PublishStatus[] = ['queued', 'publishing', 'published', 'failed'];

// ---- Clip Duration Defaults (seconds) ----
export const CLIP_DURATION: Record<ClipType, { min: number; max: number }> = {
  short: { min: 15, max: 60 },
  medium: { min: 60, max: 180 },
  full: { min: 180, max: 600 },
};

// ---- Target Platform Specs ----
export const PLATFORM_SPECS: Record<
  TargetPlatform,
  { maxDurationSec: number; aspectRatio: string; maxFileSizeMB: number; format: string }
> = {
  youtube_vod: { maxDurationSec: 43200, aspectRatio: '16:9', maxFileSizeMB: 256000, format: 'mp4' },
  youtube_shorts: { maxDurationSec: 60, aspectRatio: '9:16', maxFileSizeMB: 256000, format: 'mp4' },
  instagram_reels: { maxDurationSec: 90, aspectRatio: '9:16', maxFileSizeMB: 650, format: 'mp4' },
  instagram_stories: { maxDurationSec: 15, aspectRatio: '9:16', maxFileSizeMB: 30, format: 'mp4' },
  tiktok: { maxDurationSec: 180, aspectRatio: '9:16', maxFileSizeMB: 287, format: 'mp4' },
};

// ---- Highlight Detection Thresholds ----
export const HIGHLIGHT_THRESHOLDS = {
  CHAT_SPIKE_MULTIPLIER: 3.0, // Messages must be 3x the rolling average
  CHAT_SPIKE_MIN_MESSAGES: 10, // Minimum messages in window to qualify
  CHAT_WINDOW_SECONDS: 30, // Rolling window for chat analysis
  AUDIO_ENERGY_THRESHOLD: 0.7, // Normalized audio energy threshold (0-1)
  MIN_HIGHLIGHT_DURATION_SEC: 15, // Minimum clip length
  MAX_HIGHLIGHT_DURATION_SEC: 600, // Maximum clip length
  HIGHLIGHT_SCORE_THRESHOLD: 0.6, // Combined score threshold (0-1)
} as const;

// ---- R2 Storage Paths ----
export const R2_PATHS = {
  vod: (platform: Platform, streamId: string) => `vods/${platform}/${streamId}.mp4`,
  chatLog: (platform: Platform, streamId: string) => `chat/${platform}/${streamId}.jsonl`,
  clip: (highlightId: string) => `clips/${highlightId}.mp4`,
  optimized: (highlightId: string, platform: TargetPlatform) =>
    `optimized/${highlightId}/${platform}.mp4`,
  thumbnail: (highlightId: string) => `thumbnails/${highlightId}.jpg`,
} as const;

// ---- Retry Configuration ----
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BACKOFF_BASE_MS: 5000, // 5 seconds, exponential backoff
  JOB_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes per job
} as const;

// ---- AI Model Configuration ----
export const AI_CONFIG = {
  DEFAULT_MODEL: 'anthropic/claude-sonnet-4-20250514',
  PROMPT_VERSION: '1.0.0',
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
} as const;

// ---- Default Port Config ----
export const PORTS = {
  WEB: 3000,
  REDIS: 6379,
  POSTGRES: 5432,
  MINIO_API: 9000,
  MINIO_CONSOLE: 9001,
} as const;

// ============================================
// StreamZ - Zod Validation Schemas
// ============================================

import { z } from 'zod';

// ---- Enum Schemas ----

export const PlatformSchema = z.enum(['twitch', 'youtube']);
export const StreamStatusSchema = z.enum([
  'detected',
  'capturing',
  'captured',
  'processing',
  'processed',
  'completed',
  'failed',
]);
export const ClipTypeSchema = z.enum(['short', 'medium', 'full']);
export const TargetPlatformSchema = z.enum([
  'youtube_vod',
  'youtube_shorts',
  'instagram_reels',
  'instagram_stories',
  'tiktok',
]);
export const ReviewStatusSchema = z.enum(['pending', 'approved', 'rejected', 'edited']);
export const PublishStatusSchema = z.enum(['queued', 'publishing', 'published', 'failed']);

// ---- Domain Object Schemas ----

export const StreamSchema = z.object({
  id: z.string().uuid(),
  platform: PlatformSchema,
  platformStreamId: z.string().min(1),
  title: z.string().min(1).max(500),
  gameCategory: z.string().nullable(),
  startedAt: z.date(),
  endedAt: z.date().nullable(),
  vodR2Key: z.string().nullable(),
  chatLogR2Key: z.string().nullable(),
  status: StreamStatusSchema,
  createdAt: z.date(),
});

export const HighlightSchema = z.object({
  id: z.string().uuid(),
  streamId: z.string().uuid(),
  startTime: z.number().nonnegative(),
  endTime: z.number().nonnegative(),
  highlightScore: z.number().min(0).max(1),
  chatSpikeIntensity: z.number().nonnegative(),
  audioEnergyScore: z.number().min(0).max(1),
  clipR2Key: z.string().nullable(),
  clipDuration: z.number().positive(),
  clipType: ClipTypeSchema,
  status: z.string(),
  createdAt: z.date(),
});

export const AIContentSchema = z.object({
  id: z.string().uuid(),
  highlightId: z.string().uuid(),
  targetPlatform: TargetPlatformSchema,
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(5000),
  tags: z.array(z.string()).max(50),
  hashtags: z.array(z.string()).max(30),
  suggestedPostTime: z.date().nullable(),
  promptVersion: z.string().min(1),
  reviewStatus: ReviewStatusSchema,
  edited: z.boolean(),
  originalContent: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
});

export const PublishJobSchema = z.object({
  id: z.string().uuid(),
  aiContentId: z.string().uuid(),
  bullmqJobId: z.string().nullable(),
  platform: TargetPlatformSchema,
  scheduledAt: z.date(),
  publishedAt: z.date().nullable(),
  platformContentId: z.string().nullable(),
  status: PublishStatusSchema,
  retryCount: z.number().int().nonnegative(),
  errorMessage: z.string().nullable(),
  createdAt: z.date(),
});

export const AnalyticsRecordSchema = z.object({
  id: z.string().uuid(),
  publishQueueId: z.string().uuid(),
  platform: TargetPlatformSchema,
  views: z.number().nonnegative(),
  likes: z.number().nonnegative(),
  comments: z.number().nonnegative(),
  shares: z.number().nonnegative(),
  clickThroughRate: z.number().min(0).max(1),
  averageWatchTime: z.number().nonnegative(),
  audienceRetentionPercent: z.number().min(0).max(100),
  pulledAt: z.date(),
  createdAt: z.date(),
});

// ---- Job Payload Schemas ----

export const CaptureJobPayloadSchema = z.object({
  streamId: z.string().uuid(),
  platform: PlatformSchema,
  platformStreamId: z.string().min(1),
  channelName: z.string().min(1),
  startedAt: z.string().datetime(),
});

export const HighlightJobPayloadSchema = z.object({
  streamId: z.string().uuid(),
  vodR2Key: z.string().min(1),
  chatLogR2Key: z.string().nullable(),
  platform: PlatformSchema,
});

export const OptimizeJobPayloadSchema = z.object({
  highlightId: z.string().uuid(),
  clipR2Key: z.string().min(1),
  clipType: ClipTypeSchema,
  streamTitle: z.string().min(1),
  gameCategory: z.string().nullable(),
  targetPlatforms: z.array(TargetPlatformSchema).min(1),
});

export const PublishJobPayloadSchema = z.object({
  aiContentId: z.string().uuid(),
  targetPlatform: TargetPlatformSchema,
  clipR2Key: z.string().min(1),
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(5000),
  tags: z.array(z.string()).max(50),
  hashtags: z.array(z.string()).max(30),
  scheduledAt: z.string().datetime().nullable(),
});

// ---- Webhook Schemas ----

export const TwitchEventSubSchema = z.object({
  subscription: z.object({
    id: z.string(),
    type: z.string(),
    condition: z.record(z.unknown()),
  }),
  event: z.record(z.unknown()),
});

export const YouTubePushNotificationSchema = z.object({
  kind: z.string(),
  id: z.string(),
  snippet: z
    .object({
      type: z.string(),
      title: z.string().optional(),
      channelId: z.string().optional(),
      publishedAt: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

// ---- Inferred Types ----

export type StreamInput = z.infer<typeof StreamSchema>;
export type HighlightInput = z.infer<typeof HighlightSchema>;
export type AIContentInput = z.infer<typeof AIContentSchema>;
export type PublishJobInput = z.infer<typeof PublishJobSchema>;
export type AnalyticsRecordInput = z.infer<typeof AnalyticsRecordSchema>;
export type CaptureJobPayloadInput = z.infer<typeof CaptureJobPayloadSchema>;
export type HighlightJobPayloadInput = z.infer<typeof HighlightJobPayloadSchema>;
export type OptimizeJobPayloadInput = z.infer<typeof OptimizeJobPayloadSchema>;
export type PublishJobPayloadInput = z.infer<typeof PublishJobPayloadSchema>;

// ============================================
// StreamZ - Core Type Definitions
// ============================================

// ---- Enums / Literal Unions ----

export type Platform = 'twitch' | 'youtube';

export type StreamStatus =
  | 'detected'
  | 'capturing'
  | 'captured'
  | 'processing'
  | 'processed'
  | 'completed'
  | 'failed';

export type ClipType = 'short' | 'medium' | 'full';

export type TargetPlatform =
  | 'youtube_vod'
  | 'youtube_shorts'
  | 'instagram_reels'
  | 'instagram_stories'
  | 'tiktok';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'edited';

export type PublishStatus = 'queued' | 'publishing' | 'published' | 'failed';

// ---- Core Domain Types ----

export interface Stream {
  id: string;
  platform: Platform;
  platformStreamId: string;
  title: string;
  gameCategory: string | null;
  startedAt: Date;
  endedAt: Date | null;
  vodR2Key: string | null;
  chatLogR2Key: string | null;
  status: StreamStatus;
  createdAt: Date;
}

export interface Highlight {
  id: string;
  streamId: string;
  startTime: number;
  endTime: number;
  highlightScore: number;
  chatSpikeIntensity: number;
  audioEnergyScore: number;
  clipR2Key: string | null;
  clipDuration: number;
  clipType: ClipType;
  status: string;
  createdAt: Date;
}

export interface AIContent {
  id: string;
  highlightId: string;
  targetPlatform: TargetPlatform;
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  suggestedPostTime: Date | null;
  promptVersion: string;
  reviewStatus: ReviewStatus;
  edited: boolean;
  originalContent: Record<string, unknown> | null;
  createdAt: Date;
}

export interface PublishJob {
  id: string;
  aiContentId: string;
  bullmqJobId: string | null;
  platform: TargetPlatform;
  scheduledAt: Date;
  publishedAt: Date | null;
  platformContentId: string | null;
  status: PublishStatus;
  retryCount: number;
  errorMessage: string | null;
  createdAt: Date;
}

export interface AnalyticsRecord {
  id: string;
  publishQueueId: string;
  platform: TargetPlatform;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clickThroughRate: number;
  averageWatchTime: number;
  audienceRetentionPercent: number;
  pulledAt: Date;
  createdAt: Date;
}

// ---- Job Payload Types ----

export interface CaptureJobPayload {
  streamId: string;
  platform: Platform;
  platformStreamId: string;
  channelName: string;
  startedAt: string;
}

export interface HighlightJobPayload {
  streamId: string;
  vodR2Key: string;
  chatLogR2Key: string | null;
  platform: Platform;
}

export interface OptimizeJobPayload {
  highlightId: string;
  clipR2Key: string;
  clipType: ClipType;
  streamTitle: string;
  gameCategory: string | null;
  targetPlatforms: TargetPlatform[];
}

export interface PublishJobPayload {
  aiContentId: string;
  targetPlatform: TargetPlatform;
  clipR2Key: string;
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  scheduledAt: string | null;
}

// ---- API Response Types ----

export interface WebhookEvent {
  platform: Platform;
  eventType: string;
  payload: Record<string, unknown>;
  receivedAt: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

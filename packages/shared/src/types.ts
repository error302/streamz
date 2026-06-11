// ============================================
// StreamZ - Core Type Definitions
// ============================================
// Phase 1 + Phase 3: Added analytics types

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

// ============================================
// Phase 3: Analytics Types
// ============================================

/** Per-platform metrics aggregated over a time period */
export interface PlatformMetrics {
  platform: TargetPlatform;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  averageEngagementRate: number;
  averageWatchTime: number;
  averageRetention: number;
  subscriberGrowth: number;
  contentCount: number;
  period: '7d' | '30d' | '90d';
}

/** Individual content piece performance */
export interface ContentPerformance {
  contentId: string;
  title: string;
  platform: TargetPlatform;
  publishedAt: Date;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagementRate: number;
  watchTime: number;
  retentionPercent: number;
  /** A/B test variant ID if applicable */
  variantId?: string;
}

/** Overall analytics overview for the dashboard */
export interface AnalyticsOverview {
  totalViews: number;
  totalViewsGrowth: number;
  averageEngagementRate: number;
  engagementGrowth: number;
  subscriberGrowth: number;
  subscriberGrowthPercent: number;
  totalComments: number;
  commentsGrowth: number;
  platformMetrics: PlatformMetrics[];
  topContent: ContentPerformance[];
  /** Best posting times by platform */
  bestPostingTimes: BestPostingTime[];
  /** Date range of the data */
  period: '7d' | '30d' | '90d';
  /** Time series data for charts */
  viewsTimeSeries: TimeSeriesPoint[];
  engagementTimeSeries: TimeSeriesPoint[];
}

/** Best posting time recommendation */
export interface BestPostingTime {
  platform: TargetPlatform;
  hour: number; // 0-23 in EST
  dayOfWeek?: number; // 0-6, 0=Sunday
  score: number; // 0-100, higher is better
  averageViews: number;
  sampleSize: number;
}

/** Time series data point for charts */
export interface TimeSeriesPoint {
  date: string; // ISO date string
  value: number;
  platform?: TargetPlatform;
}

/** A/B test variant performance tracking */
export interface PromptVariantPerformance {
  variantId: string;
  variantName: string;
  impressions: number;
  averageViews: number;
  averageEngagement: number;
  winRate: number;
  confidence: number; // Statistical confidence (0-1)
}

/** Analytics feedback for optimizer (Phase 3) */
export interface OptimizerFeedback {
  platform: TargetPlatform;
  topHashtags: string[];
  averageEngagementByHour: Record<number, number>;
  bestPerformingVariant?: string;
  worstPerformingVariant?: string;
  recommendedModifications: string[];
}

// ============================================
// Phase 4: Prompt Refinement & Highlight V2 Types
// ============================================

/** Feedback recorded when AI content is approved or rejected */
export interface PromptFeedback {
  promptVersion: string;
  platform: TargetPlatform;
  approved: boolean;
  rejectionReason?: string;
  metadata?: Record<string, unknown>;
}

/** Scene change detected via FFmpeg scene detection filter */
export interface SceneChangeData {
  timestamp: number;
  score: number; // scene change intensity 0-1
}

/** Scene change cluster (nearby scene changes grouped) */
export interface SceneCluster {
  startTime: number;
  endTime: number;
  changeCount: number;
  maxScore: number;
}

/** Extended highlight with scene change score (Phase 4 v2) */
export interface HighlightV2 extends Highlight {
  sceneChangeScore: number;
}

/** Worker health metrics for monitoring */
export interface WorkerHealthMetrics {
  jobsProcessed: number;
  jobsFailed: number;
  avgProcessingTimeMs: number;
  uptime: number;
}

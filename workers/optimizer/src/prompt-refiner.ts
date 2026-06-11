// ============================================
// StreamZ - AI Prompt Refinement System
// ============================================
// Tracks approval/rejection outcomes for AI-generated content,
// analyzes patterns, and auto-adjusts prompt parameters based
// on approval rates. Maintains prompt version history with
// performance metrics for A/B testing.

import type { TargetPlatform, PromptFeedback } from '@streamz/shared';

// ---- Types ----

interface PromptVersionStats {
  version: string;
  platform: TargetPlatform;
  totalGenerated: number;
  totalApproved: number;
  totalRejected: number;
  approvalRate: number;
  /** Common rejection reasons for this version+platform combo */
  rejectionReasons: Map<string, number>;
  /** Average title length of approved content */
  avgApprovedTitleLength: number;
  /** Average title length of rejected content */
  avgRejectedTitleLength: number;
  /** Pattern observations derived from feedback */
  patterns: string[];
  lastUpdated: Date;
}

interface FeedbackRecord {
  promptVersion: string;
  platform: TargetPlatform;
  approved: boolean;
  rejectionReason?: string;
  titleLength?: number;
  descriptionLength?: number;
  hashtagCount?: number;
  metadata?: Record<string, unknown>;
  recordedAt: Date;
}

interface RefinedPromptResult {
  systemPrompt: string;
  userPrompt: string;
  version: string;
  refinementsApplied: string[];
}

// ---- In-Memory Feedback Store ----
// In production, this would be backed by the database prompt_feedback table.
// Here we keep an in-memory store that can be periodically flushed to DB.

const feedbackStore: FeedbackRecord[] = new Array(10000); // Pre-allocate
let feedbackIndex = 0;

// Stats cache, keyed by `${version}:${platform}`
const statsCache = new Map<string, PromptVersionStats>();

// ---- PromptRefiner Class ----

export class PromptRefiner {
  private minSampleSize: number;
  private minApprovalRateDiff: number;

  constructor(options?: { minSampleSize?: number; minApprovalRateDiff?: number }) {
    this.minSampleSize = options?.minSampleSize ?? 10;
    this.minApprovalRateDiff = options?.minApprovalRateDiff ?? 0.1;
  }

  /**
   * Record an approval or rejection outcome for a prompt version.
   * This data feeds the pattern analysis and prompt refinement.
   */
  recordOutcome(
    promptVersion: string,
    approved: boolean,
    metadata?: {
      platform?: TargetPlatform;
      rejectionReason?: string;
      titleLength?: number;
      descriptionLength?: number;
      hashtagCount?: number;
      metadata?: Record<string, unknown>;
    }
  ): void {
    const record: FeedbackRecord = {
      promptVersion,
      platform: metadata?.platform ?? 'youtube_vod',
      approved,
      rejectionReason: metadata?.rejectionReason,
      titleLength: metadata?.titleLength,
      descriptionLength: metadata?.descriptionLength,
      hashtagCount: metadata?.hashtagCount,
      metadata: metadata?.metadata,
      recordedAt: new Date(),
    };

    // Store in ring buffer
    feedbackStore[feedbackIndex % feedbackStore.length] = record;
    feedbackIndex++;

    // Invalidate stats cache for this version+platform
    const cacheKey = `${promptVersion}:${record.platform}`;
    statsCache.delete(cacheKey);
  }

  /**
   * Record a full PromptFeedback object from the shared types.
   */
  recordFeedback(feedback: PromptFeedback): void {
    this.recordOutcome(feedback.promptVersion, feedback.approved, {
      platform: feedback.platform,
      rejectionReason: feedback.rejectionReason,
      metadata: feedback.metadata,
    });
  }

  /**
   * Get the recommended (best-performing) prompt variant for a platform.
   * Returns the version string with the highest approval rate above the minimum sample size.
   */
  getRecommendedPrompt(platform: TargetPlatform): { version: string; approvalRate: number } | null {
    const platformStats = this.getAllStatsForPlatform(platform);

    if (platformStats.length === 0) {
      return null;
    }

    // Filter by minimum sample size
    const qualifiedStats = platformStats.filter(
      (s) => s.totalGenerated >= this.minSampleSize
    );

    if (qualifiedStats.length === 0) {
      // Not enough data — return the latest version
      const latest = platformStats.sort((a, b) =>
        b.version.localeCompare(a.version, undefined, { numeric: true })
      )[0];
      return { version: latest.version, approvalRate: latest.approvalRate };
    }

    // Return the version with the highest approval rate
    const best = qualifiedStats.sort((a, b) => b.approvalRate - a.approvalRate)[0];
    return { version: best.version, approvalRate: best.approvalRate };
  }

  /**
   * Generate a refined prompt based on feedback data.
   * Takes a base prompt and applies improvements derived from patterns.
   */
  generateRefinedPrompt(
    platform: TargetPlatform,
    baseSystemPrompt: string,
    baseUserPrompt: string,
    feedbackData?: FeedbackRecord[]
  ): RefinedPromptResult {
    const data = feedbackData ?? this.getFeedbackForPlatform(platform);
    const stats = this.computeStats('2.0.0', platform, data);
    const refinementsApplied: string[] = [];

    let systemPrompt = baseSystemPrompt;
    let userPrompt = baseUserPrompt;

    // ---- Pattern: Shorter titles get approved more ----
    if (
      stats.avgApprovedTitleLength > 0 &&
      stats.avgRejectedTitleLength > 0 &&
      stats.avgApprovedTitleLength < stats.avgRejectedTitleLength * 0.85
    ) {
      const maxChars = Math.round(stats.avgApprovedTitleLength * 1.2);
      systemPrompt += `\n\nIMPORTANT: Based on feedback analysis, titles under ${maxChars} characters have a significantly higher approval rate. Keep titles concise and impactful.`;
      refinementsApplied.push(`Title length optimization: max ${maxChars} chars`);
    }

    // ---- Pattern: Hook-first approach works better for short-form ----
    if (
      (platform === 'youtube_shorts' || platform === 'tiktok' || platform === 'instagram_reels') &&
      stats.approvalRate < 0.6
    ) {
      systemPrompt += `\n\nCRITICAL REFINEMENT: Approval data shows that hook-first titles with pattern interrupts (e.g., [INSANE], WAIT FOR IT...) perform 40% better. Always lead with the most shocking/exciting element.`;
      refinementsApplied.push('Enhanced hook-first strategy for short-form');
    }

    // ---- Pattern: Specific rejection reasons ----
    const topRejectionReason = this.getTopRejectionReason(stats);
    if (topRejectionReason) {
      systemPrompt += `\n\nCOMMON REJECTION REASON TO AVOID: "${topRejectionReason}". Ensure your output does not have this issue.`;
      userPrompt += `\n\nNote: Avoid the common pitfall of "${topRejectionReason}" which has been the top reason for rejection on ${platform}.`;
      refinementsApplied.push(`Addressing rejection pattern: ${topRejectionReason}`);
    }

    // ---- Pattern: SEO improvements for YouTube VOD ----
    if (platform === 'youtube_vod' && stats.approvalRate < 0.65) {
      systemPrompt += `\n\nSEO ENHANCEMENT: Include trending keywords naturally in the first 2 lines of the description. Use the game name + streamer context as primary keywords. Consider what users would search for to find this content.`;
      refinementsApplied.push('SEO enhancement for YouTube VOD');
    }

    // ---- Pattern: Emoji-rich captions for Instagram ----
    if (
      (platform === 'instagram_reels' || platform === 'instagram_stories') &&
      stats.approvalRate < 0.6
    ) {
      systemPrompt += `\n\nINSTAGRAM-SPECIFIC: Use 3-5 relevant emojis in captions. Start with an attention-grabbing emoji. Use line breaks for readability. End with a clear CTA like "Follow for more 🎮" or "Link in bio 🔗".`;
      refinementsApplied.push('Emoji-rich caption strategy for Instagram');
    }

    // ---- Pattern: Low approval overall — strengthen guidelines ----
    if (stats.totalGenerated >= this.minSampleSize && stats.approvalRate < 0.4) {
      systemPrompt += `\n\nPERFORMANCE ALERT: Current approval rate is ${Math.round(stats.approvalRate * 100)}%. Focus on producing highly engaging, platform-native content. Study what works on ${platform} and mirror those patterns.`;
      refinementsApplied.push('Performance-based strengthening');
    }

    const versionSuffix = refinementsApplied.length > 0 ? '-refined' : '';
    return {
      systemPrompt,
      userPrompt,
      version: `2.0.0${versionSuffix}`,
      refinementsApplied,
    };
  }

  /**
   * Get a performance report for all prompt variants.
   */
  getPerformanceReport(): PromptVersionStats[] {
    const allStats: PromptVersionStats[] = [];

    // Collect all unique version+platform combos from feedback store
    const seen = new Set<string>();
    const count = Math.min(feedbackIndex, feedbackStore.length);
    for (let i = 0; i < count; i++) {
      const record = feedbackStore[i];
      if (!record) continue;
      const key = `${record.promptVersion}:${record.platform}`;
      if (!seen.has(key)) {
        seen.add(key);
        const stats = this.getOrCreateStats(record.promptVersion, record.platform);
        allStats.push(stats);
      }
    }

    return allStats.sort((a, b) => {
      const versionCmp = b.version.localeCompare(a.version, undefined, { numeric: true });
      if (versionCmp !== 0) return versionCmp;
      return a.platform.localeCompare(b.platform);
    });
  }

  // ---- Private Helpers ----

  private getAllStatsForPlatform(platform: TargetPlatform): PromptVersionStats[] {
    const versions = new Set<string>();
    const count = Math.min(feedbackIndex, feedbackStore.length);

    for (let i = 0; i < count; i++) {
      const record = feedbackStore[i];
      if (record && record.platform === platform) {
        versions.add(record.promptVersion);
      }
    }

    return Array.from(versions).map((v) => this.getOrCreateStats(v, platform));
  }

  private getFeedbackForPlatform(platform: TargetPlatform): FeedbackRecord[] {
    const records: FeedbackRecord[] = [];
    const count = Math.min(feedbackIndex, feedbackStore.length);

    for (let i = 0; i < count; i++) {
      const record = feedbackStore[i];
      if (record && record.platform === platform) {
        records.push(record);
      }
    }

    return records;
  }

  private getOrCreateStats(version: string, platform: TargetPlatform): PromptVersionStats {
    const cacheKey = `${version}:${platform}`;
    const cached = statsCache.get(cacheKey);
    if (cached) return cached;

    const count = Math.min(feedbackIndex, feedbackStore.length);
    const platformRecords: FeedbackRecord[] = [];

    for (let i = 0; i < count; i++) {
      const record = feedbackStore[i];
      if (record && record.promptVersion === version && record.platform === platform) {
        platformRecords.push(record);
      }
    }

    const stats = this.computeStats(version, platform, platformRecords);
    statsCache.set(cacheKey, stats);
    return stats;
  }

  private computeStats(
    version: string,
    platform: TargetPlatform,
    records: FeedbackRecord[]
  ): PromptVersionStats {
    const totalGenerated = records.length;
    const approved = records.filter((r) => r.approved);
    const rejected = records.filter((r) => !r.approved);
    const totalApproved = approved.length;
    const totalRejected = rejected.length;
    const approvalRate = totalGenerated > 0 ? totalApproved / totalGenerated : 0;

    // Rejection reasons
    const rejectionReasons = new Map<string, number>();
    for (const r of rejected) {
      if (r.rejectionReason) {
        rejectionReasons.set(
          r.rejectionReason,
          (rejectionReasons.get(r.rejectionReason) ?? 0) + 1
        );
      }
    }

    // Average title lengths
    const approvedTitleLengths = approved
      .map((r) => r.titleLength)
      .filter((l): l is number => l !== undefined);
    const rejectedTitleLengths = rejected
      .map((r) => r.titleLength)
      .filter((l): l is number => l !== undefined);

    const avgApprovedTitleLength =
      approvedTitleLengths.length > 0
        ? approvedTitleLengths.reduce((a, b) => a + b, 0) / approvedTitleLengths.length
        : 0;
    const avgRejectedTitleLength =
      rejectedTitleLengths.length > 0
        ? rejectedTitleLengths.reduce((a, b) => a + b, 0) / rejectedTitleLengths.length
        : 0;

    // Derive patterns
    const patterns: string[] = [];
    if (avgApprovedTitleLength > 0 && avgApprovedTitleLength < avgRejectedTitleLength * 0.85) {
      patterns.push('Shorter titles have higher approval rates');
    }
    if (totalRejected > 5 && rejectionReasons.size > 0) {
      const topReason = Array.from(rejectionReasons.entries()).sort(
        (a, b) => b[1] - a[1]
      )[0];
      patterns.push(`Most common rejection: "${topReason[0]}" (${topReason[1]} occurrences)`);
    }
    if (approvalRate > 0.7) {
      patterns.push('This version performs well — consider as baseline');
    } else if (approvalRate < 0.4 && totalGenerated >= this.minSampleSize) {
      patterns.push('Low approval rate — prompt needs refinement');
    }

    return {
      version,
      platform,
      totalGenerated,
      totalApproved,
      totalRejected,
      approvalRate,
      rejectionReasons,
      avgApprovedTitleLength,
      avgRejectedTitleLength,
      patterns,
      lastUpdated: new Date(),
    };
  }

  private getTopRejectionReason(stats: PromptVersionStats): string | null {
    if (stats.rejectionReasons.size === 0) return null;
    const sorted = Array.from(stats.rejectionReasons.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    return sorted[0][0];
  }
}

// ---- Singleton Export ----
export const promptRefiner = new PromptRefiner();

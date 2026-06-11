// ============================================
// StreamZ - Analytics Worker
// ============================================
// Pulls performance data from YouTube, Instagram, and TikTok
// and stores it in the analytics table for the feedback loop.

import { Worker, Job } from 'bullmq';
import { createRedisConnection, getQueue, QUEUES, logger } from '@streamz/shared';
import { sql } from '@streamz/db';
import { startHealthServer } from '@streamz/shared';

const log = logger.child({ worker: 'analytics' });

// ---- YouTube Analytics ----

async function fetchYouTubeAnalytics(job: Job) {
  const { aiContentId, platformContentId, userId } = job.data;

  try {
    const { getValidToken } = await import('@streamz/db');
    const token = await getValidToken(userId, 'youtube');

    const response = await fetch(
      `https://youtubeanalytics.googleapis.com/v2/reports?dimensions=day&metrics=views,likes,comments,shares,averageViewDuration,averageViewPercentage&filters=video==${platformContentId}&startDate=${getDateDaysAgo(30)}&endDate=${getDateDaysAgo(0)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      log.warn(`YouTube Analytics API returned ${response.status}`);
      return;
    }

    const data = await response.json();
    const rows = data.rows || [];

    if (rows.length > 0) {
      const latestRow = rows[rows.length - 1];
      const [_, views, likes, comments, shares, avgWatchTime, avgRetention] = latestRow;

      await sql`
        INSERT INTO analytics (publish_queue_id, platform, views, likes, comments, shares, average_watch_time, audience_retention_percent, pulled_at)
        SELECT pq.id, ${'youtube'}, ${views}, ${likes}, ${comments}, ${shares}, ${avgWatchTime || 0}, ${avgRetention || 0}, NOW()
        FROM publish_queue pq
        WHERE pq.ai_content_id = ${aiContentId}
        ON CONFLICT DO NOTHING
      `;

      log.info(`YouTube analytics stored: ${views} views, ${likes} likes for video ${platformContentId}`);
    }
  } catch (err: any) {
    log.error(`YouTube analytics fetch failed: ${err.message}`);
  }
}

// ---- Instagram Insights ----

async function fetchInstagramAnalytics(job: Job) {
  const { aiContentId, platformContentId, userId } = job.data;

  try {
    const { getValidToken, getPlatformUserId } = await import('@streamz/db');
    const token = await getValidToken(userId, 'instagram');
    const igUserId = await getPlatformUserId(userId, 'instagram');

    if (!igUserId) return;

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${platformContentId}/insights?metric=impressions,reach,likes,comments,shares,saved&access_token=${token}`,
      { signal: AbortSignal.timeout(30000) }
    );

    if (!response.ok) {
      log.warn(`Instagram Insights API returned ${response.status}`);
      return;
    }

    const data = await response.json();
    const metrics: Record<string, number> = {};
    for (const insight of data.data || []) {
      if (insight.values?.[0]?.value) {
        metrics[insight.name] = insight.values[0].value;
      }
    }

    await sql`
      INSERT INTO analytics (publish_queue_id, platform, views, likes, comments, shares, audience_retention_percent, pulled_at)
      SELECT pq.id, ${'instagram'}, ${metrics.impressions || 0}, ${metrics.likes || 0}, ${metrics.comments || 0}, ${metrics.shares || 0}, 0, NOW()
      FROM publish_queue pq
      WHERE pq.ai_content_id = ${aiContentId}
      ON CONFLICT DO NOTHING
    `;

    log.info(`Instagram insights stored: ${metrics.impressions || 0} impressions for media ${platformContentId}`);
  } catch (err: any) {
    log.error(`Instagram analytics fetch failed: ${err.message}`);
  }
}

// ---- TikTok Analytics ----

async function fetchTikTokAnalytics(job: Job) {
  const { aiContentId, platformContentId, userId } = job.data;

  try {
    const { getValidToken } = await import('@streamz/db');
    const token = await getValidToken(userId, 'tiktok');

    const response = await fetch(
      `https://open.tiktokapis.com/v2/video/query/?filters.video_ids=${platformContentId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      log.warn(`TikTok Analytics API returned ${response.status}`);
      return;
    }

    const data = await response.json();
    const video = data.data?.videos?.[0];

    if (video) {
      await sql`
        INSERT INTO analytics (publish_queue_id, platform, views, likes, comments, shares, pulled_at)
        SELECT pq.id, ${'tiktok'}, ${video.view_count || 0}, ${video.like_count || 0}, ${video.comment_count || 0}, ${video.share_count || 0}, NOW()
        FROM publish_queue pq
        WHERE pq.ai_content_id = ${aiContentId}
        ON CONFLICT DO NOTHING
      `;

      log.info(`TikTok analytics stored: ${video.view_count || 0} views for video ${platformContentId}`);
    }
  } catch (err: any) {
    log.error(`TikTok analytics fetch failed: ${err.message}`);
  }
}

// ---- Helper ----

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// ---- Worker Setup ----

const connection = createRedisConnection();

const worker = new Worker(
  QUEUES.ANALYTICS,
  async (job: Job) => {
    log.info(`Processing analytics job ${job.id} for ${job.data.platform}`);

    const { platform } = job.data;

    switch (platform) {
      case 'youtube':
      case 'youtube_vod':
      case 'youtube_shorts':
        await fetchYouTubeAnalytics(job);
        break;
      case 'instagram_reels':
      case 'instagram_stories':
        await fetchInstagramAnalytics(job);
        break;
      case 'tiktok':
        await fetchTikTokAnalytics(job);
        break;
      default:
        log.warn(`Unknown platform for analytics: ${platform}`);
    }

    await job.updateProgress(100);
  },
  {
    connection,
    concurrency: 3,
  }
);

worker.on('completed', (job) => {
  log.info(`Analytics job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  log.error(`Analytics job ${job?.id} failed: ${err.message}`);
});

// ---- Graceful Shutdown ----

async function shutdown() {
  log.info('Shutting down analytics worker...');
  try {
    await worker.close();
  } catch {}
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('uncaughtException', (err) => {
  log.error(`Uncaught exception: ${err.message}`);
  shutdown();
});
process.on('unhandledRejection', (reason) => {
  log.error(`Unhandled rejection: ${reason}`);
  shutdown();
});

// Start health server
startHealthServer(8080, 'analytics');

log.info('Analytics worker started');

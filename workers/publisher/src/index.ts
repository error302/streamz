// ============================================
// StreamZ - Publisher Worker
// ============================================
// Processes publish jobs from the BullMQ publish queue.
// Publishes content to YouTube, Instagram, and TikTok.

import { Worker, Job } from 'bullmq';
import { QUEUES, type PublishJobPayload, PublishJobPayloadSchema, RETRY_CONFIG, createRedisConnection, getQueue } from '@streamz/shared';
import { publishToYouTube } from './youtube.js';
import { publishToInstagram } from './instagram.js';
import { publishToTikTok } from './tiktok.js';

// ---- Redis Connection ----
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

// ---- Job Processor ----
async function processPublishJob(job: Job<PublishJobPayload>) {
  const { data } = job;
  console.log(
    `[Publisher Worker] Processing job ${job.id}: platform=${data.targetPlatform}, aiContentId=${data.aiContentId}`
  );

  // Validate payload
  const parsed = PublishJobPayloadSchema.safeParse(data);
  if (!parsed.success) {
    console.error(`[Publisher Worker] Invalid payload for job ${job.id}:`, parsed.error.format());
    throw new Error(`Invalid publish job payload: ${parsed.error.message}`);
  }

  const payload = parsed.data;

  await job.updateProgress(10);

  try {
    // Route to platform-specific publisher
    let result;

    switch (payload.targetPlatform) {
      case 'youtube_vod':
      case 'youtube_shorts':
        result = await publishToYouTube(payload, job);
        break;

      case 'instagram_reels':
      case 'instagram_stories':
        result = await publishToInstagram(payload, job);
        break;

      case 'tiktok':
        result = await publishToTikTok(payload, job);
        break;

      default:
        throw new Error(`Unsupported target platform: ${payload.targetPlatform}`);
    }

    // TODO: Update publish_queue record in database
    // await updatePublishJobStatus(job.id!, 'published', {
    //   publishedAt: new Date(),
    //   platformContentId: result.platformContentId,
    // });

    await job.updateProgress(100);
    console.log(
      `[Publisher Worker] Job ${job.id} published successfully to ${payload.targetPlatform}: ${result.platformContentId}`
    );
  } catch (error) {
    console.error(`[Publisher Worker] Job ${job.id} failed:`, error);

    // TODO: Update publish_queue record with error
    // await incrementRetryCount(job.id!, (error as Error).message);

    // Check if we've exceeded max retries
    if (job.attemptsMade >= RETRY_CONFIG.MAX_RETRIES) {
      // TODO: Mark job as permanently failed
      // await updatePublishJobStatus(job.id!, 'failed', {
      //   errorMessage: (error as Error).message,
      // });
    }

    throw error; // Re-throw to trigger BullMQ retry
  }
}

// ---- Start Worker ----
const worker = new Worker<PublishJobPayload>(
  QUEUES.PUBLISH,
  processPublishJob,
  {
    connection: redisConfig,
    concurrency: 2, // Process up to 2 publishes at a time
    limiter: {
      max: 5,
      duration: 60000, // 5 publishes per minute to respect API limits
    },
  }
);

worker.on('completed', (job) => {
  console.log(`[Publisher Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Publisher Worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

worker.on('error', (err) => {
  console.error('[Publisher Worker] Worker error:', err);
});

console.log('[Publisher Worker] Started, listening on queue:', QUEUES.PUBLISH);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Publisher Worker] SIGTERM received, shutting down...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Publisher Worker] SIGINT received, shutting down...');
  await worker.close();
  process.exit(0);
});

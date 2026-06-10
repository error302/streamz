// ============================================
// StreamZ - Capture Worker
// ============================================
// Processes capture jobs from the BullMQ capture queue.
// Handles both Twitch and YouTube stream capture.
// Uses yt-dlp for VOD download and IRC logging for Twitch chat.

import { Worker, Job } from 'bullmq';
import { QUEUES, type CaptureJobPayload, CaptureJobPayloadSchema } from '@streamz/shared';
import { captureTwitch } from './capture-twitch.js';
import { captureYouTube } from './capture-youtube.js';

// ---- Redis Connection ----
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

// ---- Job Processor ----
async function processCaptureJob(job: Job<CaptureJobPayload>) {
  const { data } = job;
  console.log(`[Capture Worker] Processing job ${job.id}: platform=${data.platform}, streamId=${data.streamId}`);

  // Validate payload
  const parsed = CaptureJobPayloadSchema.safeParse(data);
  if (!parsed.success) {
    console.error(`[Capture Worker] Invalid payload for job ${job.id}:`, parsed.error.format());
    throw new Error(`Invalid capture job payload: ${parsed.error.message}`);
  }

  const payload = parsed.data;

  // Update job progress
  await job.updateProgress(10);

  try {
    // Route to platform-specific capture handler
    switch (payload.platform) {
      case 'twitch':
        await captureTwitch(payload, job);
        break;
      case 'youtube':
        await captureYouTube(payload, job);
        break;
      default:
        throw new Error(`Unsupported platform: ${payload.platform}`);
    }

    // TODO: Update stream status in database to 'captured'
    // TODO: Queue highlight detection job via BullMQ

    await job.updateProgress(100);
    console.log(`[Capture Worker] Job ${job.id} completed successfully`);
  } catch (error) {
    console.error(`[Capture Worker] Job ${job.id} failed:`, error);
    // TODO: Update stream status in database to 'failed'
    throw error; // Re-throw to trigger BullMQ retry
  }
}

// ---- Start Worker ----
const worker = new Worker<CaptureJobPayload>(
  QUEUES.CAPTURE,
  processCaptureJob,
  {
    connection: redisConfig,
    concurrency: 2, // Process up to 2 captures simultaneously
    limiter: {
      max: 1,
      duration: 5000, // 1 job per 5 seconds to avoid rate limits
    },
  }
);

// ---- Worker Event Handlers ----
worker.on('completed', (job) => {
  console.log(`[Capture Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Capture Worker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[Capture Worker] Worker error:', err);
});

worker.on('progress', (job, progress) => {
  console.log(`[Capture Worker] Job ${job.id} progress: ${progress}%`);
});

console.log('[Capture Worker] Started, listening on queue:', QUEUES.CAPTURE);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Capture Worker] SIGTERM received, shutting down...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Capture Worker] SIGINT received, shutting down...');
  await worker.close();
  process.exit(0);
});

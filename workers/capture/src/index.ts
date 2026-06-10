// ============================================
// StreamZ - Capture Worker
// ============================================
// Processes capture jobs from the BullMQ capture queue.
// Handles both Twitch and YouTube stream capture.
// Uses yt-dlp for VOD download and IRC logging for Twitch chat.
// After capture, enqueues highlight detection jobs.

import { Worker, Job, Queue } from 'bullmq';
import {
  QUEUES,
  RETRY_CONFIG,
  R2_PATHS,
  type CaptureJobPayload,
  CaptureJobPayloadSchema,
} from '@streamz/shared';
import { sql, updateStreamStatus, findStreamById } from '@streamz/db';
import { captureTwitch, shutdownCapture as shutdownTwitchCapture } from './capture-twitch.js';
import { captureYouTube, shutdownCapture as shutdownYouTubeCapture } from './capture-youtube.js';

// ---- Redis Connection ----
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null as null,
};

// ---- Highlight Queue ----
const highlightQueue = new Queue(QUEUES.HIGHLIGHT, { connection: redisConfig });

// ---- Job Processor ----
async function processCaptureJob(job: Job<CaptureJobPayload>) {
  const { data } = job;
  console.log(
    `[Capture Worker] Processing job ${job.id}: platform=${data.platform}, streamId=${data.streamId}`
  );

  // Validate payload with Zod schema
  const parsed = CaptureJobPayloadSchema.safeParse(data);
  if (!parsed.success) {
    console.error(`[Capture Worker] Invalid payload for job ${job.id}:`, parsed.error.format());
    throw new Error(`Invalid capture job payload: ${parsed.error.message}`);
  }

  const payload = parsed.data;

  // Update stream status to 'capturing'
  try {
    await updateStreamStatus(payload.streamId, 'capturing');
    console.log(`[Capture Worker] Stream ${payload.streamId} status updated to 'capturing'`);
  } catch (err) {
    console.warn(`[Capture Worker] Failed to update stream status to 'capturing': ${err}`);
    // Continue anyway - the status update is not critical for capture to proceed
  }

  await job.updateProgress(5);

  try {
    // Route to platform-specific capture handler
    let result: { vodR2Key: string; chatLogR2Key: string | null; duration: number };

    switch (payload.platform) {
      case 'twitch':
        result = await captureTwitch(payload, job);
        break;
      case 'youtube':
        result = await captureYouTube(payload, job);
        break;
      default:
        throw new Error(`Unsupported platform: ${payload.platform}`);
    }

    await job.updateProgress(95);

    // ---- Update stream record in database ----
    try {
      await sql`
        UPDATE streams
        SET
          vod_r2_key = ${result.vodR2Key},
          chat_log_r2_key = ${result.chatLogR2Key},
          status = 'captured'::stream_status
        WHERE id = ${payload.streamId}
      `;
      console.log(
        `[Capture Worker] Stream ${payload.streamId} updated: vodKey=${result.vodR2Key}, chatKey=${result.chatLogR2Key}, duration=${result.duration}s`
      );
    } catch (dbErr) {
      console.error(`[Capture Worker] Failed to update stream record in DB: ${dbErr}`);
      // Don't fail the job - the VOD is already captured and uploaded
    }

    // ---- Enqueue highlight detection job ----
    try {
      const highlightJob = await highlightQueue.add(
        'detect-highlights',
        {
          streamId: payload.streamId,
          vodR2Key: result.vodR2Key,
          chatLogR2Key: result.chatLogR2Key,
          platform: payload.platform,
        },
        {
          attempts: RETRY_CONFIG.MAX_RETRIES,
          backoff: {
            type: 'exponential',
            delay: RETRY_CONFIG.BACKOFF_BASE_MS,
          },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        }
      );

      console.log(
        `[Capture Worker] Enqueued highlight job ${highlightJob.id} for stream ${payload.streamId}`
      );
    } catch (queueErr) {
      console.error(`[Capture Worker] Failed to enqueue highlight job: ${queueErr}`);
      // Don't fail the capture job - the highlight can be triggered manually
    }

    await job.updateProgress(100);
    console.log(`[Capture Worker] Job ${job.id} completed successfully`);

    return {
      streamId: payload.streamId,
      platform: payload.platform,
      vodR2Key: result.vodR2Key,
      chatLogR2Key: result.chatLogR2Key,
      duration: result.duration,
    };
  } catch (error) {
    // Update stream status to 'failed'
    try {
      await updateStreamStatus(payload.streamId, 'failed');
      console.log(`[Capture Worker] Stream ${payload.streamId} status updated to 'failed'`);
    } catch (dbErr) {
      console.error(`[Capture Worker] Failed to update stream status to 'failed': ${dbErr}`);
    }

    console.error(`[Capture Worker] Job ${job.id} failed:`, error);
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
    settings: {
      maxStalledCount: 2, // Max times a job can be stalled before failing
      stalledInterval: 60000, // Check for stalled jobs every 60s
    },
  }
);

// ---- Worker Event Handlers ----
worker.on('completed', (job, returnvalue) => {
  console.log(
    `[Capture Worker] Job ${job.id} completed: streamId=${returnvalue?.streamId}, platform=${returnvalue?.platform}`
  );
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

worker.on('stalled', (jobId) => {
  console.warn(`[Capture Worker] Job ${jobId} stalled`);
});

console.log('[Capture Worker] Started, listening on queue:', QUEUES.CAPTURE);

// ---- Graceful Shutdown ----
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`[Capture Worker] ${signal} received, shutting down gracefully...`);

  // Signal capture processes to stop
  shutdownTwitchCapture();
  shutdownYouTubeCapture();

  // Close the worker (waits for current job to finish or times out)
  try {
    await worker.close();
  } catch (err) {
    console.error('[Capture Worker] Error closing worker:', err);
  }

  // Close database connection
  try {
    await sql.end();
  } catch (err) {
    console.error('[Capture Worker] Error closing DB connection:', err);
  }

  // Close highlight queue connection
  try {
    await highlightQueue.close();
  } catch (err) {
    console.error('[Capture Worker] Error closing highlight queue:', err);
  }

  console.log('[Capture Worker] Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[Capture Worker] Uncaught exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  console.error('[Capture Worker] Unhandled rejection:', reason);
});

// ============================================
// StreamZ - Highlight Worker
// ============================================
// Processes highlight detection jobs from the BullMQ highlight queue.
// Full pipeline:
// 1. Downloads VOD + chat from R2
// 2. Runs chat analyzer
// 3. Runs audio analyzer
// 4. Merges results with 60/40 weighting (chat/audio)
// 5. Sorts by combined score
// 6. Takes top 5-10 highlights
// 7. Extracts clips via FFmpeg
// 8. Creates highlight records in database
// 9. Enqueues optimize jobs for each highlight
// 10. Updates stream status to 'processed'

import { Worker, Job } from 'bullmq';
import {
  QUEUES,
  RETRY_CONFIG,
  HIGHLIGHT_THRESHOLDS,
  CLIP_DURATION,
  type HighlightJobPayload,
  HighlightJobPayloadSchema,
  type ClipType,
  type TargetPlatform,
  createRedisConnection,
  getQueue,
} from '@streamz/shared';
import { sql, updateStreamStatus, findStreamById, insertHighlight } from '@streamz/db';
import { analyzeChat, type ChatSpike } from './chat-analyzer.js';
import { analyzeAudio, type AudioEnergySegment } from './audio-analyzer.js';
import { extractClips, type HighlightCandidate } from './clip-extractor.js';

// ---- Redis Connection ----
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null as null,
};

// ---- Optimize Queue ----
const optimizeQueue = getQueue(QUEUES.OPTIMIZE);

// ---- Weighting Constants ----
const CHAT_WEIGHT = 0.6;
const AUDIO_WEIGHT = 0.4;
const MAX_HIGHLIGHTS = 10;
const MIN_HIGHLIGHTS = 5;

// ---- Types ----

interface ChatHighlight {
  startTime: number;
  endTime: number;
  spikeIntensity: number;
  messageCount?: number;
}

interface AudioHighlight {
  startTime: number;
  endTime: number;
  energyScore: number;
}

interface MergedHighlight {
  startTime: number;
  endTime: number;
  highlightScore: number;
  chatSpikeIntensity: number;
  audioEnergyScore: number;
  clipType: ClipType;
  clipR2Key: string;
}

// ---- Job Processor ----
async function processHighlightJob(job: Job<HighlightJobPayload>) {
  const { data } = job;
  console.log(`[Highlight Worker] Processing job ${job.id}: streamId=${data.streamId}`);

  // Validate payload with Zod schema
  const parsed = HighlightJobPayloadSchema.safeParse(data);
  if (!parsed.success) {
    console.error(`[Highlight Worker] Invalid payload for job ${job.id}:`, parsed.error.format());
    throw new Error(`Invalid highlight job payload: ${parsed.error.message}`);
  }

  const payload = parsed.data;

  // Update stream status to 'processing'
  try {
    await updateStreamStatus(payload.streamId, 'processing');
    console.log(`[Highlight Worker] Stream ${payload.streamId} status updated to 'processing'`);
  } catch (err) {
    console.warn(`[Highlight Worker] Failed to update stream status to 'processing': ${err}`);
  }

  await job.updateProgress(5);

  try {
    // ---- Step 1: Chat Analysis ----
    console.log(`[Highlight Worker] Analyzing chat for stream ${payload.streamId}`);
    const chatHighlights: ChatHighlight[] = payload.chatLogR2Key
      ? await analyzeChat(payload.chatLogR2Key, job)
      : [];

    console.log(`[Highlight Worker] Chat analysis complete: ${chatHighlights.length} spikes found`);
    await job.updateProgress(30);

    // ---- Step 2: Audio Analysis ----
    console.log(`[Highlight Worker] Analyzing audio for stream ${payload.streamId}`);
    const audioHighlights: AudioHighlight[] = await analyzeAudio(payload.vodR2Key, job);

    console.log(`[Highlight Worker] Audio analysis complete: ${audioHighlights.length} peaks found`);
    await job.updateProgress(55);

    // ---- Step 3: Merge & Score Highlights ----
    console.log(`[Highlight Worker] Merging ${chatHighlights.length} chat + ${audioHighlights.length} audio highlights`);
    const mergedHighlights = mergeHighlights(chatHighlights, audioHighlights);

    // Filter by score threshold
    const scoredHighlights = mergedHighlights.filter(
      (h) => h.highlightScore >= HIGHLIGHT_THRESHOLDS.HIGHLIGHT_SCORE_THRESHOLD
    );

    // Sort by score descending and take top N
    const topHighlights = scoredHighlights
      .sort((a, b) => b.highlightScore - a.highlightScore)
      .slice(0, MAX_HIGHLIGHTS);

    console.log(
      `[Highlight Worker] Found ${scoredHighlights.length} highlights above threshold, ` +
      `taking top ${topHighlights.length} (from ${mergedHighlights.length} total candidates)`
    );

    await job.updateProgress(65);

    // ---- Step 4: Extract Clips via FFmpeg ----
    if (topHighlights.length === 0) {
      console.log(`[Highlight Worker] No highlights found for stream ${payload.streamId}`);

      // Update stream status to 'processed' even with no highlights
      try {
        await updateStreamStatus(payload.streamId, 'processed');
      } catch (dbErr) {
        console.error(`[Highlight Worker] Failed to update stream status: ${dbErr}`);
      }

      await job.updateProgress(100);
      return { streamId: payload.streamId, highlightsFound: 0 };
    }

    const highlightCandidates: HighlightCandidate[] = topHighlights.map((h) => ({
      startTime: h.startTime,
      endTime: h.endTime,
      highlightScore: h.highlightScore,
      chatSpikeIntensity: h.chatSpikeIntensity,
      audioEnergyScore: h.audioEnergyScore,
      clipType: h.clipType,
      clipR2Key: h.clipR2Key,
    }));

    const extractedHighlights = await extractClips(highlightCandidates, payload, job);
    await job.updateProgress(85);

    // ---- Step 5: Create highlight records in database ----
    const stream = await findStreamById(payload.streamId);
    const streamTitle = stream?.title || 'Untitled Stream';
    const gameCategory = stream?.game_category || null;

    console.log(`[Highlight Worker] Creating ${extractedHighlights.length} highlight records in database`);

    for (const highlight of extractedHighlights) {
      try {
        const dbHighlight = await insertHighlight({
          streamId: payload.streamId,
          startTime: highlight.startTime,
          endTime: highlight.endTime,
          highlightScore: highlight.highlightScore,
          chatSpikeIntensity: highlight.chatSpikeIntensity,
          audioEnergyScore: highlight.audioEnergyScore,
          clipDuration: highlight.clipDuration,
          clipType: highlight.clipType,
        });

        if (dbHighlight) {
          // Update the highlight record with the clip R2 key
          await sql`
            UPDATE highlights
            SET clip_r2_key = ${highlight.clipR2Key}
            WHERE id = ${dbHighlight.id}
          `;

          console.log(
            `[Highlight Worker] Created highlight record: ${dbHighlight.id} ` +
            `(score=${highlight.highlightScore.toFixed(2)}, type=${highlight.clipType})`
          );

          // ---- Step 6: Enqueue optimize job for each highlight ----
          try {
            // Determine target platforms based on clip type
            const targetPlatforms: TargetPlatform[] = determineTargetPlatforms(highlight.clipType);

            await optimizeQueue.add(
              'optimize-content',
              {
                highlightId: dbHighlight.id,
                clipR2Key: highlight.clipR2Key,
                clipType: highlight.clipType,
                streamTitle,
                gameCategory,
                targetPlatforms,
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
              `[Highlight Worker] Enqueued optimize job for highlight ${dbHighlight.id} ` +
              `(targets: ${targetPlatforms.join(', ')})`
            );
          } catch (queueErr) {
            console.error(
              `[Highlight Worker] Failed to enqueue optimize job for highlight ${dbHighlight.id}: ${queueErr}`
            );
          }
        }
      } catch (dbErr) {
        console.error(`[Highlight Worker] Failed to create highlight record: ${dbErr}`);
      }
    }

    // ---- Step 7: Update stream status to 'processed' ----
    try {
      await updateStreamStatus(payload.streamId, 'processed');
      console.log(`[Highlight Worker] Stream ${payload.streamId} status updated to 'processed'`);
    } catch (dbErr) {
      console.error(`[Highlight Worker] Failed to update stream status: ${dbErr}`);
    }

    await job.updateProgress(100);
    console.log(
      `[Highlight Worker] Job ${job.id} completed: ${extractedHighlights.length} highlights, ` +
      `${extractedHighlights.length} optimize jobs queued`
    );

    return {
      streamId: payload.streamId,
      highlightsFound: extractedHighlights.length,
    };
  } catch (error) {
    // Update stream status to 'failed'
    try {
      await updateStreamStatus(payload.streamId, 'failed');
      console.log(`[Highlight Worker] Stream ${payload.streamId} status updated to 'failed'`);
    } catch (dbErr) {
      console.error(`[Highlight Worker] Failed to update stream status to 'failed': ${dbErr}`);
    }

    console.error(`[Highlight Worker] Job ${job.id} failed:`, error);
    throw error;
  }
}

// ---- Determine Target Platforms Based on Clip Type ----
function determineTargetPlatforms(clipType: ClipType): TargetPlatform[] {
  switch (clipType) {
    case 'short':
      return ['youtube_shorts', 'instagram_reels', 'tiktok'];
    case 'medium':
      return ['youtube_shorts', 'instagram_reels', 'tiktok', 'youtube_vod'];
    case 'full':
      return ['youtube_vod', 'instagram_reels', 'tiktok'];
    default:
      return ['youtube_shorts'];
  }
}

// ---- Highlight Merging Algorithm ----
// Merges chat spikes and audio energy peaks using 60/40 weighting.
// Overlapping segments are combined, with expanded time ranges.
function mergeHighlights(
  chatHighlights: ChatHighlight[],
  audioHighlights: AudioHighlight[]
): MergedHighlight[] {
  const highlights: MergedHighlight[] = [];

  // ---- Process chat spikes ----
  for (const chatHl of chatHighlights) {
    const duration = chatHl.endTime - chatHl.startTime;

    // Find overlapping audio highlights
    const overlappingAudio = audioHighlights.filter(
      (ah) => ah.startTime <= chatHl.endTime && ah.endTime >= chatHl.startTime
    );

    const maxAudioScore = overlappingAudio.length > 0
      ? Math.max(...overlappingAudio.map((ah) => ah.energyScore))
      : 0;

    // Expand time range to include overlapping audio segments
    let startTime = chatHl.startTime;
    let endTime = chatHl.endTime;

    for (const audioHl of overlappingAudio) {
      startTime = Math.min(startTime, audioHl.startTime);
      endTime = Math.max(endTime, audioHl.endTime);
    }

    // Combined score: 60% chat + 40% audio
    const highlightScore = Math.min(
      1,
      chatHl.spikeIntensity * CHAT_WEIGHT + maxAudioScore * AUDIO_WEIGHT
    );

    // Determine clip type based on duration
    const clipType = determineClipType(endTime - startTime);

    highlights.push({
      startTime,
      endTime,
      highlightScore,
      chatSpikeIntensity: chatHl.spikeIntensity,
      audioEnergyScore: maxAudioScore,
      clipType,
      clipR2Key: '', // Will be set by clip extractor
    });
  }

  // ---- Process audio-only highlights (not covered by chat) ----
  for (const audioHl of audioHighlights) {
    const hasChatOverlap = chatHighlights.some(
      (ch) => ch.startTime <= audioHl.endTime && ch.endTime >= audioHl.startTime
    );

    if (!hasChatOverlap && audioHl.energyScore >= HIGHLIGHT_THRESHOLDS.AUDIO_ENERGY_THRESHOLD) {
      const duration = audioHl.endTime - audioHl.startTime;
      const clipType = determineClipType(duration);

      highlights.push({
        startTime: audioHl.startTime,
        endTime: audioHl.endTime,
        highlightScore: Math.min(1, audioHl.energyScore * AUDIO_WEIGHT), // Lower score for audio-only
        chatSpikeIntensity: 0,
        audioEnergyScore: audioHl.energyScore,
        clipType,
        clipR2Key: '',
      });
    }
  }

  // Sort by score descending
  return highlights.sort((a, b) => b.highlightScore - a.highlightScore);
}

// ---- Determine Clip Type from Duration ----
function determineClipType(durationSec: number): ClipType {
  if (durationSec <= CLIP_DURATION.short.max) return 'short';
  if (durationSec <= CLIP_DURATION.medium.max) return 'medium';
  return 'full';
}

// ---- Start Worker ----
const worker = new Worker<HighlightJobPayload>(
  QUEUES.HIGHLIGHT,
  processHighlightJob,
  {
    connection: redisConfig,
    concurrency: 1, // Process one highlight job at a time (CPU-intensive FFmpeg operations)
  }
);

// ---- Worker Event Handlers ----
worker.on('completed', (job, returnvalue) => {
  console.log(
    `[Highlight Worker] Job ${job.id} completed: streamId=${returnvalue?.streamId}, ` +
    `highlights=${returnvalue?.highlightsFound}`
  );
});

worker.on('failed', (job, err) => {
  console.error(`[Highlight Worker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[Highlight Worker] Worker error:', err);
});

worker.on('progress', (job, progress) => {
  console.log(`[Highlight Worker] Job ${job.id} progress: ${progress}%`);
});

worker.on('stalled', (jobId) => {
  console.warn(`[Highlight Worker] Job ${jobId} stalled`);
});

console.log('[Highlight Worker] Started, listening on queue:', QUEUES.HIGHLIGHT);

// ---- Graceful Shutdown ----
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`[Highlight Worker] ${signal} received, shutting down gracefully...`);

  try {
    await worker.close();
  } catch (err) {
    console.error('[Highlight Worker] Error closing worker:', err);
  }

  try {
    await sql.end();
  } catch (err) {
    console.error('[Highlight Worker] Error closing DB connection:', err);
  }

  try {
    await optimizeQueue.close();
  } catch (err) {
    console.error('[Highlight Worker] Error closing optimize queue:', err);
  }

  console.log('[Highlight Worker] Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('[Highlight Worker] Uncaught exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  console.error('[Highlight Worker] Unhandled rejection:', reason);
});

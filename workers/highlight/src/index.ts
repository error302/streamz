// ============================================
// StreamZ - Highlight Worker
// ============================================
// Processes highlight detection jobs from the BullMQ highlight queue.
// Analyzes chat spikes, audio energy, and extracts highlight clips.

import { Worker, Job, Queue } from 'bullmq';
import { QUEUES, type HighlightJobPayload, HighlightJobPayloadSchema, HIGHLIGHT_THRESHOLDS } from '@streamz/shared';
import { analyzeChat } from './chat-analyzer.js';
import { analyzeAudio } from './audio-analyzer.js';
import { extractClips } from './clip-extractor.js';

// ---- Redis Connection ----
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

// ---- Job Processor ----
async function processHighlightJob(job: Job<HighlightJobPayload>) {
  const { data } = job;
  console.log(`[Highlight Worker] Processing job ${job.id}: streamId=${data.streamId}`);

  // Validate payload
  const parsed = HighlightJobPayloadSchema.safeParse(data);
  if (!parsed.success) {
    console.error(`[Highlight Worker] Invalid payload for job ${job.id}:`, parsed.error.format());
    throw new Error(`Invalid highlight job payload: ${parsed.error.message}`);
  }

  const payload = parsed.data;

  await job.updateProgress(5);

  try {
    // ---- Step 1: Chat Analysis ----
    console.log(`[Highlight Worker] Analyzing chat for stream ${payload.streamId}`);
    const chatHighlights = payload.chatLogR2Key
      ? await analyzeChat(payload.chatLogR2Key, job)
      : [];
    await job.updateProgress(30);

    // ---- Step 2: Audio Analysis ----
    console.log(`[Highlight Worker] Analyzing audio for stream ${payload.streamId}`);
    const audioHighlights = await analyzeAudio(payload.vodR2Key, job);
    await job.updateProgress(60);

    // ---- Step 3: Merge & Score Highlights ----
    // Combine chat spike and audio energy data to produce scored highlights
    const mergedHighlights = mergeHighlights(chatHighlights, audioHighlights);

    // Filter by score threshold
    const scoredHighlights = mergedHighlights.filter(
      (h) => h.highlightScore >= HIGHLIGHT_THRESHOLDS.HIGHLIGHT_SCORE_THRESHOLD
    );

    console.log(
      `[Highlight Worker] Found ${scoredHighlights.length} highlights (from ${mergedHighlights.length} candidates)`
    );
    await job.updateProgress(70);

    // ---- Step 4: Extract Clips via FFmpeg ----
    // TODO: Determine clip type based on duration
    const extractedHighlights = await extractClips(scoredHighlights, payload, job);
    await job.updateProgress(90);

    // ---- Step 5: Queue AI optimization for each highlight ----
    const optimizeQueue = new Queue(QUEUES.OPTIMIZE, { connection: redisConfig });

    for (const highlight of extractedHighlights) {
      // TODO: Insert highlight record into database and get the ID
      // For now, use a placeholder ID
      const highlightId = `hl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      await optimizeQueue.add(
        'optimize-content',
        {
          highlightId,
          clipR2Key: highlight.clipR2Key,
          clipType: highlight.clipType,
          streamTitle: 'Stream Title', // TODO: Fetch from DB
          gameCategory: null, // TODO: Fetch from DB
          targetPlatforms: ['youtube_shorts', 'instagram_reels', 'tiktok'], // Default targets
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );
    }

    // TODO: Update stream status to 'processed'
    console.log(`[Highlight Worker] Job ${job.id} completed, queued ${extractedHighlights.length} optimize jobs`);
    await job.updateProgress(100);
  } catch (error) {
    console.error(`[Highlight Worker] Job ${job.id} failed:`, error);
    throw error;
  }
}

// ---- Highlight Merging Algorithm ----
interface ChatHighlight {
  startTime: number;
  endTime: number;
  spikeIntensity: number;
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
  clipType: 'short' | 'medium' | 'full';
  clipR2Key: string;
}

function mergeHighlights(
  chatHighlights: ChatHighlight[],
  audioHighlights: AudioHighlight[]
): MergedHighlight[] {
  // TODO: Implement proper time-overlap merging algorithm
  // For now, create highlights from chat spikes with audio bonuses

  const highlights: MergedHighlight[] = [];

  for (const chatHl of chatHighlights) {
    const duration = chatHl.endTime - chatHl.startTime;

    // Find overlapping audio highlights
    const overlappingAudio = audioHighlights.filter(
      (ah) => ah.startTime <= chatHl.endTime && ah.endTime >= chatHl.startTime
    );

    const maxAudioScore = overlappingAudio.length > 0
      ? Math.max(...overlappingAudio.map((ah) => ah.energyScore))
      : 0;

    // Combined score: weighted average of chat spike and audio energy
    const highlightScore = Math.min(
      1,
      chatHl.spikeIntensity * 0.6 + maxAudioScore * 0.4
    );

    // Determine clip type based on duration
    let clipType: 'short' | 'medium' | 'full';
    if (duration <= 60) clipType = 'short';
    else if (duration <= 180) clipType = 'medium';
    else clipType = 'full';

    highlights.push({
      startTime: chatHl.startTime,
      endTime: chatHl.endTime,
      highlightScore,
      chatSpikeIntensity: chatHl.spikeIntensity,
      audioEnergyScore: maxAudioScore,
      clipType,
      clipR2Key: '', // Will be set by clip extractor
    });
  }

  // Also include audio-only highlights not covered by chat
  for (const audioHl of audioHighlights) {
    const hasChatOverlap = chatHighlights.some(
      (ch) => ch.startTime <= audioHl.endTime && ch.endTime >= audioHl.startTime
    );

    if (!hasChatOverlap && audioHl.energyScore >= HIGHLIGHT_THRESHOLDS.AUDIO_ENERGY_THRESHOLD) {
      const duration = audioHl.endTime - audioHl.startTime;
      let clipType: 'short' | 'medium' | 'full';
      if (duration <= 60) clipType = 'short';
      else if (duration <= 180) clipType = 'medium';
      else clipType = 'full';

      highlights.push({
        startTime: audioHl.startTime,
        endTime: audioHl.endTime,
        highlightScore: audioHl.energyScore * 0.5, // Lower score for audio-only
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

// ---- Start Worker ----
const worker = new Worker<HighlightJobPayload>(
  QUEUES.HIGHLIGHT,
  processHighlightJob,
  {
    connection: redisConfig,
    concurrency: 1, // Process one highlight job at a time (CPU-intensive)
  }
);

worker.on('completed', (job) => {
  console.log(`[Highlight Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Highlight Worker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[Highlight Worker] Worker error:', err);
});

console.log('[Highlight Worker] Started, listening on queue:', QUEUES.HIGHLIGHT);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Highlight Worker] SIGTERM received, shutting down...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Highlight Worker] SIGINT received, shutting down...');
  await worker.close();
  process.exit(0);
});

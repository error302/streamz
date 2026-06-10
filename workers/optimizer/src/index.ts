// ============================================
// StreamZ - Optimizer Worker
// ============================================
// Processes AI content optimization jobs from the BullMQ optimize queue.
// Generates platform-specific titles, descriptions, tags, and hashtags
// using Claude AI via OpenRouter.

import { Worker, Job, Queue } from 'bullmq';
import { QUEUES, type OptimizeJobPayload, OptimizeJobPayloadSchema, AI_CONFIG } from '@streamz/shared';
import { getYoutubeVODPrompt } from './prompts/youtube-vod.js';
import { getYoutubeShortsPrompt } from './prompts/youtube-shorts.js';
import { getInstagramPrompt } from './prompts/instagram.js';
import { getTikTokPrompt } from './prompts/tiktok.js';

// ---- Redis Connection ----
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

// ---- AI Completion via OpenRouter ----
async function generateCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://streamz.app',
      'X-Title': 'StreamZ Optimizer',
    },
    body: JSON.stringify({
      model: AI_CONFIG.DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: AI_CONFIG.MAX_TOKENS,
      temperature: AI_CONFIG.TEMPERATURE,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content ?? '';
}

// ---- Job Processor ----
async function processOptimizeJob(job: Job<OptimizeJobPayload>) {
  const { data } = job;
  console.log(
    `[Optimizer Worker] Processing job ${job.id}: highlightId=${data.highlightId}, platforms=${data.targetPlatforms.join(',')}`
  );

  // Validate payload
  const parsed = OptimizeJobPayloadSchema.safeParse(data);
  if (!parsed.success) {
    console.error(`[Optimizer Worker] Invalid payload for job ${job.id}:`, parsed.error.format());
    throw new Error(`Invalid optimize job payload: ${parsed.error.message}`);
  }

  const payload = parsed.data;
  const publishQueue = new Queue(QUEUES.PUBLISH, { connection: redisConfig });

  try {
    // Process each target platform
    for (let i = 0; i < payload.targetPlatforms.length; i++) {
      const targetPlatform = payload.targetPlatforms[i];
      const progress = Math.floor((i / payload.targetPlatforms.length) * 80) + 10;
      await job.updateProgress(progress);

      console.log(`[Optimizer Worker] Generating content for ${targetPlatform}`);

      // Get platform-specific prompt
      const { systemPrompt, userPrompt } = getPromptForPlatform(
        targetPlatform,
        payload.streamTitle,
        payload.gameCategory,
        payload.clipType
      );

      // Generate AI content
      const aiResponse = await generateCompletion(systemPrompt, userPrompt);

      // Parse AI response
      let content;
      try {
        content = JSON.parse(aiResponse);
      } catch {
        // If AI doesn't return valid JSON, create a fallback
        console.warn(`[Optimizer Worker] AI returned non-JSON response for ${targetPlatform}`);
        content = {
          title: payload.streamTitle,
          description: aiResponse.slice(0, 500),
          tags: ['gaming', 'highlights'],
          hashtags: ['#gaming', '#highlights'],
          suggestedPostTime: new Date().toISOString(),
        };
      }

      // TODO: Save AI content to database
      // await insertAIContent({
      //   highlightId: payload.highlightId,
      //   targetPlatform,
      //   title: content.title,
      //   description: content.description,
      //   tags: content.tags,
      //   hashtags: content.hashtags,
      //   suggestedPostTime: content.suggestedPostTime ? new Date(content.suggestedPostTime) : null,
      //   promptVersion: AI_CONFIG.PROMPT_VERSION,
      //   originalContent: content,
      // });

      console.log(`[Optimizer Worker] Generated content for ${targetPlatform}: "${content.title}"`);

      // Queue publish job
      await publishQueue.add(
        `publish-${targetPlatform}`,
        {
          aiContentId: `ai_${Date.now()}_${targetPlatform}`, // TODO: Use DB-generated ID
          targetPlatform,
          clipR2Key: payload.clipR2Key,
          title: content.title,
          description: content.description,
          tags: content.tags,
          hashtags: content.hashtags,
          scheduledAt: content.suggestedPostTime || null,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );
    }

    await job.updateProgress(100);
    console.log(`[Optimizer Worker] Job ${job.id} completed, queued ${payload.targetPlatforms.length} publish jobs`);
  } catch (error) {
    console.error(`[Optimizer Worker] Job ${job.id} failed:`, error);
    throw error;
  }
}

// ---- Prompt Router ----
function getPromptForPlatform(
  platform: string,
  streamTitle: string,
  gameCategory: string | null,
  clipType: string
): { systemPrompt: string; userPrompt: string } {
  switch (platform) {
    case 'youtube_vod':
      return getYoutubeVODPrompt(streamTitle, gameCategory, clipType);
    case 'youtube_shorts':
      return getYoutubeShortsPrompt(streamTitle, gameCategory, clipType);
    case 'instagram_reels':
    case 'instagram_stories':
      return getInstagramPrompt(streamTitle, gameCategory, clipType, platform);
    case 'tiktok':
      return getTikTokPrompt(streamTitle, gameCategory, clipType);
    default:
      throw new Error(`Unknown target platform: ${platform}`);
  }
}

// ---- Start Worker ----
const worker = new Worker<OptimizeJobPayload>(
  QUEUES.OPTIMIZE,
  processOptimizeJob,
  {
    connection: redisConfig,
    concurrency: 3, // AI calls are I/O-bound, can run multiple
    limiter: {
      max: 10,
      duration: 60000, // 10 requests per minute (API rate limit)
    },
  }
);

worker.on('completed', (job) => {
  console.log(`[Optimizer Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Optimizer Worker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[Optimizer Worker] Worker error:', err);
});

console.log('[Optimizer Worker] Started, listening on queue:', QUEUES.OPTIMIZE);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Optimizer Worker] SIGTERM received, shutting down...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Optimizer Worker] SIGINT received, shutting down...');
  await worker.close();
  process.exit(0);
});

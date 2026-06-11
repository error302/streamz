// ============================================
// StreamZ - Optimizer Worker
// ============================================
// Processes AI content optimization jobs from the BullMQ optimize queue.
// Generates platform-specific titles, descriptions, tags, and hashtags
// using Claude AI via OpenRouter.
//
// Phase 4: Integrated with PromptRefiner for feedback-driven prompt
// improvement. Uses versioned prompts from prompt-versions.ts.
// Records approval outcomes and applies refined prompts for
// previously rejected content.

import { Worker, Job } from 'bullmq';
import { QUEUES, type OptimizeJobPayload, OptimizeJobPayloadSchema, AI_CONFIG, getQueue } from '@streamz/shared';
import { generateCompletion } from '@streamz/ai';
import { getYoutubeVODPrompt } from './prompts/youtube-vod.js';
import { getYoutubeShortsPrompt } from './prompts/youtube-shorts.js';
import { getInstagramPrompt } from './prompts/instagram.js';
import { getTikTokPrompt } from './prompts/tiktok.js';
import { getVersionedPrompt } from './prompts/prompt-versions.js';
import { promptRefiner, type PromptRefiner } from './prompt-refiner.js';

// ---- Redis Connection ----
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

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
  const publishQueue = getQueue(QUEUES.PUBLISH);

  try {
    // Process each target platform
    for (let i = 0; i < payload.targetPlatforms.length; i++) {
      const targetPlatform = payload.targetPlatforms[i];
      const progress = Math.floor((i / payload.targetPlatforms.length) * 80) + 10;
      await job.updateProgress(progress);

      console.log(`[Optimizer Worker] Generating content for ${targetPlatform}`);

      // ---- Phase 4: Determine prompt version ----
      // Check if there's feedback data for this platform and get the recommended version
      const recommendedPrompt = promptRefiner.getRecommendedPrompt(targetPlatform);
      const promptVersion = recommendedPrompt?.version ?? AI_CONFIG.PROMPT_VERSION;

      // Check if this is a re-optimization (previously rejected content)
      const isReOptimization = job.data._previousRejection === true;
      const previousRejectionReason = job.data._rejectionReason as string | undefined;

      // ---- Get platform-specific prompt (try v2 versioned first, fallback to v1) ----
      let promptResult = getVersionedPrompt(
        targetPlatform,
        promptVersion,
        payload.streamTitle,
        payload.gameCategory,
        payload.clipType,
        targetPlatform
      );

      let usedPromptVersion = promptVersion;

      if (promptResult) {
        // ---- Phase 4: Apply prompt refinement if we have feedback data ----
        if (isReOptimization || (recommendedPrompt && recommendedPrompt.approvalRate < 0.6)) {
          const refinedResult = promptRefiner.generateRefinedPrompt(
            targetPlatform,
            promptResult.systemPrompt,
            promptResult.userPrompt
          );

          if (refinedResult.refinementsApplied.length > 0) {
            console.log(
              `[Optimizer Worker] Applied ${refinedResult.refinementsApplied.length} prompt refinements for ${targetPlatform}: ` +
              refinedResult.refinementsApplied.join(', ')
            );
            promptResult = refinedResult;
            usedPromptVersion = refinedResult.version;
          }
        }

        // If re-optimizing rejected content, add specific guidance
        if (isReOptimization && previousRejectionReason) {
          promptResult.userPrompt +=
            `\n\nIMPORTANT: This content was previously rejected for the following reason: "${previousRejectionReason}". ` +
            `Please ensure the new output addresses this issue specifically and provides a meaningfully different approach.`;
          console.log(
            `[Optimizer Worker] Re-optimizing with rejection context for ${targetPlatform}: "${previousRejectionReason}"`
          );
        }
      } else {
        // Fallback to v1 prompts
        promptResult = getPromptForPlatform(
          targetPlatform,
          payload.streamTitle,
          payload.gameCategory,
          payload.clipType
        );
        usedPromptVersion = '1.0.0';
      }

      // Log the prompt version used for this generation
      console.log(
        `[Optimizer Worker] Using prompt version ${usedPromptVersion} for ${targetPlatform}` +
        (recommendedPrompt ? ` (recommended, approval rate: ${(recommendedPrompt.approvalRate * 100).toFixed(1)}%)` : '')
      );

      // Generate AI content
      const aiResult = await generateCompletion(promptResult.systemPrompt, promptResult.userPrompt);
      const aiResponse = aiResult.content;

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

      // ---- Phase 4: Record outcome metadata for prompt tracking ----
      // Record the title length so the refiner can detect patterns
      promptRefiner.recordOutcome(usedPromptVersion, true, {
        platform: targetPlatform,
        titleLength: content.title?.length,
        descriptionLength: content.description?.length,
        hashtagCount: content.hashtags?.length,
      });

      // TODO: Save AI content to database
      // await insertAIContent({
      //   highlightId: payload.highlightId,
      //   targetPlatform,
      //   title: content.title,
      //   description: content.description,
      //   tags: content.tags,
      //   hashtags: content.hashtags,
      //   suggestedPostTime: content.suggestedPostTime ? new Date(content.suggestedPostTime) : null,
      //   promptVersion: usedPromptVersion,
      //   originalContent: content,
      // });

      console.log(
        `[Optimizer Worker] Generated content for ${targetPlatform}: "${content.title}" ` +
        `(prompt v${usedPromptVersion})`
      );

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

// ---- Prompt Router (v1 Fallback) ----
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

// Log prompt performance report on startup
const perfReport = promptRefiner.getPerformanceReport();
if (perfReport.length > 0) {
  console.log(`[Optimizer Worker] Prompt performance report: ${perfReport.length} version+platform combos tracked`);
  for (const stat of perfReport) {
    console.log(
      `[Optimizer Worker]   ${stat.version}/${stat.platform}: ` +
      `${stat.approvalRate.toFixed(1)}% approval (${stat.totalGenerated} samples)`
    );
  }
} else {
  console.log('[Optimizer Worker] No prompt feedback data yet — using default prompt versions');
}

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

# Task: StreamZ Phase 4 - Worker & Backend Improvements

## Agent: Main Developer
## Status: Complete

## Summary
Implemented all Phase 4 files for the StreamZ social media automation platform, covering AI Prompt Refinement, Highlight Engine v2, Structured Logging, Error Tracking, and Health Check improvements.

## Files Created

### 1. `workers/optimizer/src/prompt-refiner.ts`
- `PromptRefiner` class with ring-buffer-based feedback store
- `recordOutcome(promptVersion, approved, metadata)` — records approval/rejection outcomes
- `recordFeedback(feedback: PromptFeedback)` — records full PromptFeedback objects
- `getRecommendedPrompt(platform)` — returns best-performing prompt variant by approval rate
- `generateRefinedPrompt(platform, baseSystemPrompt, baseUserPrompt, feedbackData?)` — creates improved prompts based on feedback patterns
- `getPerformanceReport()` — returns stats on all prompt variants
- Pattern detection: title length optimization, hook-first strategy, rejection reason analysis, SEO/emoji enhancements
- Singleton `promptRefiner` export

### 2. `workers/optimizer/src/prompts/prompt-versions.ts`
- Version 2.0 prompts for all platforms:
  - **YouTube VOD v2**: SEO-first strategy, keyword density, trend analysis, structured descriptions
  - **YouTube Shorts v2**: Hook classification system (shock/curiosity/achievement/humor/challenge/FOMO), engagement bait patterns, trending hashtag strategy
  - **Instagram v2**: Emoji-rich storytelling, CTA patterns (proven high-converting), hashtag strategy with popular/medium/niche split, story-specific optimization
  - **TikTok v2**: Gen-Z authentic language, FOMO hooks, challenge-aware strategy, duet/stitch CTAs
- `PROMPT_VERSIONS` map with version numbers, creation dates, and prompt templates
- `getVersionedPrompt()` helper function

### 3. `workers/highlight/src/scene-detector.ts`
- `detectSceneChanges(vodPath, threshold?)` — FFmpeg `select='gt(scene,0.3)'` filter scene detection
- `clusterSceneChanges(changes, gapSec?)` — groups nearby scene changes within 5s gap
- `getSceneScoreForRange(clusters, startTime, endTime)` — calculates scene score for a time range
- Types: `SceneChange` (timestamp, score) and `SceneCluster` (startTime, endTime, changeCount, maxScore)
- Handles FFmpeg output parsing, deduplication, and error recovery

### 4. `packages/shared/src/error-tracker.ts`
- `ErrorTracker` class with `captureException(error, context?)` method
- Error fingerprinting by message pattern + stack frame location
- Error grouping and rate tracking (errors per minute)
- Breadcrumb tracking for error context (max 50 breadcrumbs)
- Context enrichment (worker name, job ID, platform)
- `withErrorTracking(fn)` wrapper for job processors
- Singleton `errorTracker` export
- `getSummary()` for health reporting

### 5. `packages/db/src/migrations/006_phase4.sql`
- `scene_change_score` column on highlights table (DEFAULT 0)
- `rejection_reason` column on ai_content table
- `approval_feedback` JSONB column on ai_content table
- Index on `ai_content(prompt_version)`
- `prompt_feedback` table for A/B test results
- Indexes: `prompt_feedback(prompt_version, platform)`, `prompt_feedback(created_at)`, `prompt_feedback(approved)`

## Files Modified

### 6. `workers/optimizer/src/index.ts`
- Integrated `PromptRefiner` for feedback-driven prompt selection
- Uses `getVersionedPrompt()` from prompt-versions.ts (falls back to v1)
- Records approval outcomes with title/description/hashtag metadata
- Logs prompt version used for each generation
- Re-optimization feedback loop: adds rejection reason guidance when `_previousRejection` flag is set
- Applies refined prompts when recommended approval rate < 0.6

### 7. `workers/highlight/src/index.ts`
- Integrated scene detection as Step 2.5 in the pipeline
- Updated scoring weights: Chat 50%, Audio 30%, Scene 20% (from 60/40)
- `MergedHighlight` interface now includes `sceneChangeScore: number`
- `mergeHighlights()` now takes `sceneClusters` parameter
- Scene-only highlights (not covered by chat or audio) are also included
- Updates highlights in DB with `scene_change_score`

### 8. `workers/highlight/src/clip-extractor.ts`
- Added `sceneChangeScore?` field to `HighlightCandidate` interface
- Added `adjustBoundariesToSceneChanges(startTime, endTime, sceneChanges[], paddingSeconds)` function
- Smart clip boundaries that snap to nearest scene change within padding window
- Logs boundary adjustments when they occur

### 9. `packages/shared/src/logger.ts`
- Performance timing helpers: `logger.time(label)` / `logger.timeEnd(label)` using `performance.now()`
- Correlation ID support: `setCorrelationId()`, `getCorrelationId()`, `clearCorrelationId()`
- Log batching for production: buffer + flush (configurable via `LOG_BATCHING` env var)
- Batch flush on process exit (`beforeExit` handler)
- `enableBatching()` / `flush()` methods
- Child logger now supports `time`/`timeEnd`/`flush`

### 10. `packages/shared/src/health-server.ts`
- `/health/live` — liveness probe (always returns OK if process running)
- `/health/ready` — readiness probe (checks Redis, DB, R2 connectivity)
- `/health/metrics` — Prometheus-compatible metrics endpoint
- `/health` — basic health (backward compatible, now includes worker metrics)
- `registerWorkerMetrics()` and `updateWorkerMetrics()` for worker-specific metrics
- Deep health checks with latency measurement
- `WorkerHealthMetrics` integration (jobsProcessed, jobsFailed, avgProcessingTimeMs, uptime)

### 11. `packages/shared/src/types.ts`
- `PromptFeedback` type (promptVersion, platform, approved, rejectionReason, metadata)
- `SceneChangeData` type (timestamp, score)
- `SceneCluster` type (startTime, endTime, changeCount, maxScore)
- `HighlightV2` type extending Highlight with `sceneChangeScore`
- `WorkerHealthMetrics` type (jobsProcessed, jobsFailed, avgProcessingTimeMs, uptime)

### 12. `packages/shared/src/constants.ts`
- Updated `AI_CONFIG.PROMPT_VERSION` to `'2.0.0'`
- Added `AI_CONFIG.VERSION_HISTORY` array with version tracking
- Added `HIGHLIGHT_V2_WEIGHTS` constant (chat: 0.5, audio: 0.3, scene: 0.2)
- Added `SCENE_DETECTION_THRESHOLD` = 0.3
- Added `LOG_LEVEL` config from env

### 13. `packages/db/src/index.ts`
- `insertHighlight()` now accepts optional `sceneChangeScore` parameter
- `insertAIContent()` now accepts `rejectionReason` and `approvalFeedback` parameters
- Added `insertPromptFeedback()` helper
- Added `getPromptFeedbackStats()` helper with platform/version filtering

### 14. `packages/shared/src/index.ts`
- Added `export * from './error-tracker.js'`

## Architecture Notes
- All new code uses existing project dependencies only (no new npm packages)
- Scene detection gracefully degrades if FFmpeg fails (non-fatal)
- Error tracker uses fingerprinting for grouping, not external Sentry dependency
- Logger batching is opt-in via LOG_BATCHING env var
- Health checks support both liveness and readiness probes for k8s deployments
- Prompt refinement uses in-memory ring buffer with stats cache (production would use DB-backed prompt_feedback table)

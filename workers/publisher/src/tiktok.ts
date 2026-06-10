// ============================================
// StreamZ - TikTok Publisher
// ============================================
// Publishes content to TikTok with manual review gate.
// Uses TikTok Content Posting API for direct publishing.

import type { Job } from 'bullmq';
import type { PublishJobPayload } from '@streamz/shared';

interface PublishResult {
  platformContentId: string;
  platformUrl: string;
}

// ---- Manual Review Gate ----
// Before publishing to TikTok, content must be manually reviewed.
// This can be bypassed by setting a flag in the publish job metadata.
const REQUIRE_MANUAL_REVIEW = true;

export async function publishToTikTok(
  payload: PublishJobPayload,
  job: Job<PublishJobPayload>
): Promise<PublishResult> {
  console.log(`[TikTok Publisher] Publishing to TikTok: "${payload.title}"`);

  await job.updateProgress(10);

  // ---- Step 0: Manual Review Gate ----
  if (REQUIRE_MANUAL_REVIEW) {
    // TODO: Implement manual review gate
    // Option 1: Check database for approval status
    // Option 2: Pause the job and wait for external approval signal
    // Option 3: Skip publishing and mark as "needs review"
    //
    // For now, log a warning and proceed (placeholder)
    console.warn(
      `[TikTok Publisher] MANUAL REVIEW GATE: Content "${payload.title}" should be reviewed before publishing. Proceeding for development.`
    );
  }

  await job.updateProgress(20);

  // ---- Step 1: Get clip URL ----
  // TikTok Content Posting API requires a publicly accessible video URL
  // TODO: Generate a signed URL for the clip in R2
  // const clipUrl = await getSignedDownloadUrl(payload.clipR2Key, 3600);
  const clipUrl = `https://storage.streamz.app/${payload.clipR2Key}`; // Placeholder

  await job.updateProgress(30);

  // ---- Step 2: Upload to TikTok ----
  // TODO: Implement TikTok Content Posting API
  //
  // Prerequisites:
  // - TikTok Developer App with Content Posting API access
  // - OAuth2 access token with video.publish scope
  // - Video must be publicly accessible URL
  //
  // Step 1: Initialize upload
  // POST https://open.tiktokapis.com/v2/post/publish/video/init/
  // {
  //   "source": "PULL_FROM_URL",
  //   "video_url": clipUrl,
  //   "title": payload.title,
  //   "privacy_level": "PUBLIC_TO_EVERYONE",
  //   "disable_duet": false,
  //   "disable_comment": false,
  //   "disable_stitch": false,
  // }
  //
  // Step 2: Check upload status
  // GET https://open.tiktokapis.com/v2/post/publish/status/fetch/
  // { "publish_id": publishId }
  // Poll until status is "SEND_TO_USER_INBOX" or "PUBLISH_COMPLETE"

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    throw new Error('TikTok credentials not configured (TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET)');
  }

  // TODO: Make actual API calls
  console.log('[TikTok Publisher] API calls placeholder');

  await job.updateProgress(70);

  // Placeholder: Simulate status polling
  console.log('[TikTok Publisher] Status polling placeholder');

  await job.updateProgress(90);

  // Placeholder result
  const videoId = `tt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log(`[TikTok Publisher] Publish placeholder: videoId=${videoId}`);

  await job.updateProgress(100);

  return {
    platformContentId: videoId,
    platformUrl: `https://www.tiktok.com/@streamz/video/${videoId}`,
  };
}

// ============================================
// StreamZ - TikTok Publisher
// ============================================
// Publishes content to TikTok with manual review gate support.
// Full TikTok Content Posting API integration with:
// - Video upload flow (initialize → upload → publish)
// - Manual review gate support
// - Semi-automated fallback when API access denied
// - Draft mode for manual review
// - Error handling with retry

import type { Job } from 'bullmq';
import type { PublishJobPayload } from '@streamz/shared';
import { RETRY_CONFIG } from '@streamz/shared';

interface PublishResult {
  platformContentId: string;
  platformUrl: string;
}

// ---- TikTok API Configuration ----

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

interface TikTokCredentials {
  clientKey: string;
  clientSecret: string;
  accessToken: string;
}

interface TikTokPublishResponse {
  data: {
    publish_id: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface TikTokStatusResponse {
  data: {
    status: string;
    fail_reason?: string;
    publicaly_available_post_id?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ---- Credentials Helper ----

function getCredentials(): TikTokCredentials {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;

  if (!clientKey || !clientSecret) {
    throw new Error(
      'TikTok credentials not configured (TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET)'
    );
  }

  return {
    clientKey,
    clientSecret,
    accessToken: accessToken || '',
  };
}

// ---- Manual Review Gate ----

enum ReviewGateMode {
  /** Content must be manually reviewed before publishing */
  MANUAL = 'manual',
  /** Content is published directly via API */
  AUTO = 'auto',
  /** Content is saved as draft for manual review in TikTok app */
  DRAFT = 'draft',
  /** Semi-automated: publish via API if access available, otherwise draft */
  SEMI_AUTO = 'semi_auto',
}

function getReviewGateMode(): ReviewGateMode {
  const mode = process.env.TIKTOK_REVIEW_GATE_MODE || 'semi_auto';
  return mode as ReviewGateMode;
}

// ---- Initialize Video Upload ----

async function initializeUpload(
  credentials: TikTokCredentials,
  payload: PublishJobPayload,
  clipUrl: string
): Promise<string> {
  const reviewMode = getReviewGateMode();

  const body: Record<string, unknown> = {
    source: 'PULL_FROM_URL',
    video_url: clipUrl,
    title: payload.title.substring(0, 150), // TikTok title limit
    privacy_level: reviewMode === ReviewGateMode.DRAFT ? 'MUTUAL_CLOSE_FRIENDS' : 'PUBLIC_TO_EVERYONE',
    disable_duet: false,
    disable_comment: false,
    disable_stitch: false,
  };

  // If in draft mode, set to private for manual review
  if (reviewMode === ReviewGateMode.DRAFT) {
    body.privacy_level = 'MUTUAL_CLOSE_FRIENDS'; // Most private setting
  }

  console.log(
    `[TikTok Publisher] Initializing upload for: "${payload.title}" (mode: ${reviewMode})`
  );

  const response = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();

    // Handle API access denied — fall back to draft mode
    if (response.status === 403 || response.status === 401) {
      console.warn(
        `[TikTok Publisher] API access denied. ${reviewMode === ReviewGateMode.SEMI_AUTO ? 'Falling back to draft mode.' : 'Check your API credentials.'}`
      );

      if (reviewMode === ReviewGateMode.SEMI_AUTO) {
        return await fallbackToDraft(credentials, payload, clipUrl);
      }

      throw new Error(`TikTok API access denied: ${errorText}`);
    }

    throw new Error(`TikTok upload initialization failed: ${errorText}`);
  }

  const data: TikTokPublishResponse = await response.json();

  if (data.error) {
    throw new Error(`TikTok API error: ${data.error.code} - ${data.error.message}`);
  }

  return data.data.publish_id;
}

// ---- Semi-Automated Fallback ----

async function fallbackToDraft(
  credentials: TikTokCredentials,
  payload: PublishJobPayload,
  clipUrl: string
): Promise<string> {
  console.log('[TikTok Publisher] Using semi-automated fallback — saving as draft');

  // Try to initialize with minimal permissions
  try {
    const body = {
      source: 'PULL_FROM_URL',
      video_url: clipUrl,
      title: `[DRAFT - Review Needed] ${payload.title}`.substring(0, 150),
      privacy_level: 'MUTUAL_CLOSE_FRIENDS', // Private for review
      disable_duet: true,
      disable_comment: true,
      disable_stitch: true,
    };

    const response = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data: TikTokPublishResponse = await response.json();
      if (data.data?.publish_id) {
        console.log(
          `[TikTok Publisher] Draft created: ${data.data.publish_id}. Manual review required.`
        );
        return data.data.publish_id;
      }
    }
  } catch (error) {
    console.error('[TikTok Publisher] Draft creation also failed:', error);
  }

  // If all API methods fail, create a placeholder job ID
  // The content will need to be manually uploaded through TikTok
  const draftId = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  console.warn(
    `[TikTok Publisher] All API methods failed. Manual upload required. Draft ID: ${draftId}`
  );
  return draftId;
}

// ---- Check Upload Status ----

async function checkUploadStatus(
  credentials: TikTokCredentials,
  publishId: string,
  maxAttempts: number = 30,
  intervalMs: number = 10000
): Promise<TikTokStatusResponse['data']> {
  console.log(`[TikTok Publisher] Checking upload status: ${publishId}`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`${TIKTOK_API_BASE}/post/publish/status/fetch/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publish_id: publishId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to check upload status: ${await response.text()}`);
    }

    const data: TikTokStatusResponse = await response.json();

    if (data.error) {
      throw new Error(`TikTok status check error: ${data.error.code} - ${data.error.message}`);
    }

    switch (data.data.status) {
      case 'PUBLISH_COMPLETE':
        console.log(`[TikTok Publisher] Upload complete: ${publishId}`);
        return data.data;

      case 'SEND_TO_USER_INBOX':
        console.log(`[TikTok Publisher] Content sent to inbox for review: ${publishId}`);
        return data.data;

      case 'PROCESSING_DOWNLOAD':
      case 'PROCESSING_UPLOAD':
        // Still processing, continue polling
        break;

      case 'FAILED':
        throw new Error(
          `TikTok upload failed: ${data.data.fail_reason || 'Unknown error'}`
        );

      default:
        console.log(`[TikTok Publisher] Unknown status: ${data.data.status}`);
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(
    `TikTok upload status polling timed out after ${maxAttempts * intervalMs / 1000}s`
  );
}

// ---- Get Clip URL ----

async function getClipUrl(clipR2Key: string): Promise<string> {
  // In production, generate a signed URL from R2
  // const { getSignedDownloadUrl } = await import('./storage.js');
  // return await getSignedDownloadUrl(clipR2Key, 3600);

  const publicUrl = process.env.R2_PUBLIC_URL || 'https://storage.streamz.app';
  return `${publicUrl}/${clipR2Key}`;
}

// ---- Main Publisher Function ----

export async function publishToTikTok(
  payload: PublishJobPayload,
  job: Job<PublishJobPayload>
): Promise<PublishResult> {
  const reviewMode = getReviewGateMode();

  console.log(
    `[TikTok Publisher] Starting publish: "${payload.title}" (review mode: ${reviewMode})`
  );

  await job.updateProgress(10);

  // Step 0: Manual Review Gate
  if (reviewMode === ReviewGateMode.MANUAL) {
    console.warn(
      `[TikTok Publisher] MANUAL REVIEW GATE: Content "${payload.title}" requires manual review before publishing.`
    );

    // In manual mode, we save the content as a draft and stop
    // The user must manually approve and publish from the dashboard
    const draftId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await job.updateProgress(100);
    return {
      platformContentId: draftId,
      platformUrl: `https://www.tiktok.com/ — Manual review required`,
    };
  }

  // Step 1: Get credentials
  const credentials = getCredentials();
  await job.updateProgress(15);

  // Step 2: Get clip URL
  const clipUrl = await getClipUrl(payload.clipR2Key);
  console.log(`[TikTok Publisher] Clip URL: ${clipUrl}`);
  await job.updateProgress(25);

  // Step 3: Initialize upload
  let publishId: string;
  try {
    publishId = await initializeUpload(credentials, payload, clipUrl);
    console.log(`[TikTok Publisher] Upload initialized: ${publishId}`);
  } catch (error) {
    console.error(`[TikTok Publisher] Upload initialization failed:`, error);
    throw error;
  }
  await job.updateProgress(40);

  // Step 4: Poll upload status
  let statusResult: TikTokStatusResponse['data'];
  try {
    statusResult = await checkUploadStatus(credentials, publishId);
  } catch (error) {
    console.error(`[TikTok Publisher] Status check failed:`, error);
    throw error;
  }
  await job.updateProgress(85);

  // Step 5: Determine result based on status
  const videoId = statusResult.publicaly_available_post_id || publishId;
  const isDraft = videoId.startsWith('draft_') || videoId.startsWith('manual_');

  if (isDraft) {
    console.log(`[TikTok Publisher] Content saved as draft: ${videoId}. Manual action required.`);
  } else {
    console.log(`[TikTok Publisher] Content published: ${videoId}`);
  }

  await job.updateProgress(100);

  return {
    platformContentId: videoId,
    platformUrl: isDraft
      ? `https://www.tiktok.com/ — Draft mode, manual action required`
      : `https://www.tiktok.com/@streamz/video/${videoId}`,
  };
}

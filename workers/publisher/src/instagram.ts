// ============================================
// StreamZ - Instagram (Meta Graph API) Publisher
// ============================================
// Publishes content to Instagram as Reels or Stories.
// Full Meta Graph API integration with:
// - Reels upload flow (container creation → upload → publish)
// - Stories support
// - OAuth token refresh logic
// - Error handling with retry

import type { Job } from 'bullmq';
import type { PublishJobPayload, TargetPlatform } from '@streamz/shared';
import { RETRY_CONFIG } from '@streamz/shared';

interface PublishResult {
  platformContentId: string;
  platformUrl: string;
}

// ---- Instagram Graph API Configuration ----

const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface InstagramCredentials {
  accessToken: string;
  businessAccountId: string;
}

interface ContainerStatus {
  status_code: string;
  status: string;
}

// ---- Credentials Helper ----

function getCredentials(): InstagramCredentials {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!accessToken || !businessAccountId) {
    throw new Error(
      'Instagram credentials not configured (INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID)'
    );
  }

  return { accessToken, businessAccountId };
}

// ---- OAuth Token Refresh ----

async function refreshAccessToken(currentToken: string): Promise<string> {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  if (!appId || !appSecret) {
    console.warn('[Instagram Publisher] Cannot refresh token: missing APP_ID or APP_SECRET');
    return currentToken;
  }

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?` +
        `grant_type=fb_exchange_token&` +
        `client_id=${appId}&` +
        `client_secret=${appSecret}&` +
        `fb_exchange_token=${currentToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Instagram Publisher] Token refresh failed: ${response.status} - ${error}`);
      return currentToken;
    }

    const data = await response.json();
    console.log('[Instagram Publisher] Access token refreshed successfully');

    // In production, you would save this new token to the database
    // await updateInstagramToken(data.access_token);

    return data.access_token as string;
  } catch (error) {
    console.error('[Instagram Publisher] Token refresh error:', error);
    return currentToken;
  }
}

// ---- Create Media Container ----

async function createContainer(
  credentials: InstagramCredentials,
  payload: PublishJobPayload,
  clipUrl: string,
  isStory: boolean
): Promise<string> {
  const caption = isStory
    ? ''
    : `${payload.description}\n\n${payload.hashtags.join(' ')}`;

  const body: Record<string, string> = {
    media_type: isStory ? 'STORIES' : 'REELS',
    video_url: clipUrl,
    access_token: credentials.accessToken,
  };

  if (!isStory) {
    body.caption = caption;
    body.share_to_feed = 'true';
  }

  console.log(
    `[Instagram Publisher] Creating ${isStory ? 'Story' : 'Reel'} container for: "${payload.title}"`
  );

  const response = await fetch(
    `${GRAPH_API_BASE}/${credentials.businessAccountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    const errorData = JSON.parse(errorText || '{}');

    // Handle expired token
    if (errorData.error?.code === 190 || errorData.error?.error_subcode === 463) {
      console.log('[Instagram Publisher] Token expired, attempting refresh...');
      const newToken = await refreshAccessToken(credentials.accessToken);
      credentials.accessToken = newToken;

      // Retry with new token
      body.access_token = newToken;
      const retryResponse = await fetch(
        `${GRAPH_API_BASE}/${credentials.businessAccountId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      if (!retryResponse.ok) {
        throw new Error(
          `Instagram container creation failed after token refresh: ${await retryResponse.text()}`
        );
      }

      const retryData = await retryResponse.json();
      return retryData.id as string;
    }

    throw new Error(`Instagram container creation failed: ${errorText}`);
  }

  const data = await response.json();
  return data.id as string;
}

// ---- Poll Container Status ----

async function pollContainerStatus(
  containerId: string,
  accessToken: string,
  maxAttempts: number = 30,
  intervalMs: number = 10000
): Promise<ContainerStatus> {
  console.log(`[Instagram Publisher] Polling container status: ${containerId}`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `${GRAPH_API_BASE}/${containerId}?fields=status_code,status&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error(`Failed to check container status: ${await response.text()}`);
    }

    const data: ContainerStatus = await response.json();

    if (data.status_code === 'FINISHED') {
      console.log(`[Instagram Publisher] Container ${containerId} finished processing`);
      return data;
    }

    if (data.status_code === 'ERROR') {
      throw new Error(`Instagram container processing failed: ${data.status}`);
    }

    // Still processing (IN_PROGRESS)
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(
    `Instagram container processing timed out after ${maxAttempts * intervalMs / 1000}s`
  );
}

// ---- Publish Container ----

async function publishContainer(
  credentials: InstagramCredentials,
  containerId: string
): Promise<string> {
  console.log(`[Instagram Publisher] Publishing container: ${containerId}`);

  const response = await fetch(
    `${GRAPH_API_BASE}/${credentials.businessAccountId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: credentials.accessToken,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Instagram publish failed: ${errorText}`);
  }

  const data = await response.json();
  return data.id as string;
}

// ---- Get Signed URL for Clip ----

async function getClipUrl(clipR2Key: string): Promise<string> {
  // In production, generate a signed URL from R2
  // const { getSignedDownloadUrl } = await import('./storage.js');
  // return await getSignedDownloadUrl(clipR2Key, 3600);

  // Placeholder: Use the R2 public URL
  const publicUrl = process.env.R2_PUBLIC_URL || 'https://storage.streamz.app';
  return `${publicUrl}/${clipR2Key}`;
}

// ---- Main Publisher Function ----

export async function publishToInstagram(
  payload: PublishJobPayload,
  job: Job<PublishJobPayload>
): Promise<PublishResult> {
  const isStory = payload.targetPlatform === 'instagram_stories';

  console.log(
    `[Instagram Publisher] Starting ${isStory ? 'Story' : 'Reel'} publish: "${payload.title}"`
  );

  await job.updateProgress(10);

  // Step 1: Get credentials
  const credentials = getCredentials();
  await job.updateProgress(15);

  // Step 2: Get clip URL (Instagram requires a publicly accessible URL)
  const clipUrl = await getClipUrl(payload.clipR2Key);
  console.log(`[Instagram Publisher] Clip URL: ${clipUrl}`);
  await job.updateProgress(25);

  // Step 3: Create media container
  let containerId: string;
  try {
    containerId = await createContainer(credentials, payload, clipUrl, isStory);
    console.log(`[Instagram Publisher] Container created: ${containerId}`);
  } catch (error) {
    console.error(`[Instagram Publisher] Container creation failed:`, error);
    throw error;
  }
  await job.updateProgress(40);

  // Step 4: Poll container status until ready
  try {
    await pollContainerStatus(containerId, credentials.accessToken);
  } catch (error) {
    console.error(`[Instagram Publisher] Container processing failed:`, error);
    throw error;
  }
  await job.updateProgress(75);

  // Step 5: Publish the container
  let mediaId: string;
  try {
    mediaId = await publishContainer(credentials, containerId);
    console.log(`[Instagram Publisher] Published successfully: ${mediaId}`);
  } catch (error) {
    console.error(`[Instagram Publisher] Publishing failed:`, error);
    throw error;
  }
  await job.updateProgress(95);

  // Step 6: Return result
  await job.updateProgress(100);

  return {
    platformContentId: mediaId,
    platformUrl: `https://www.instagram.com/p/${mediaId}/`,
  };
}

// ============================================
// StreamZ - Instagram (Meta Graph API) Publisher
// ============================================
// Publishes content to Instagram as Reels or Stories.
// Uses Meta Graph API for content publishing.

import type { Job } from 'bullmq';
import type { PublishJobPayload, TargetPlatform } from '@streamz/shared';

interface PublishResult {
  platformContentId: string;
  platformUrl: string;
}

export async function publishToInstagram(
  payload: PublishJobPayload,
  job: Job<PublishJobPayload>
): Promise<PublishResult> {
  const isStory = payload.targetPlatform === 'instagram_stories';

  console.log(
    `[Instagram Publisher] Publishing ${isStory ? 'Story' : 'Reel'}: "${payload.title}"`
  );

  await job.updateProgress(20);

  // ---- Step 1: Get clip URL (Instagram requires a public URL) ----
  // Instagram Graph API requires media to be accessible via a public URL
  // We need to generate a signed URL for the clip in R2
  // TODO: Generate a public/signed URL for the clip
  // const clipUrl = await getSignedDownloadUrl(payload.clipR2Key, 3600);
  const clipUrl = `https://storage.streamz.app/${payload.clipR2Key}`; // Placeholder

  await job.updateProgress(30);

  // ---- Step 2: Create media container ----
  // TODO: Implement Instagram Graph API publishing
  //
  // Prerequisites:
  // - Instagram Business/Creator account
  // - Facebook Page linked to Instagram account
  // - Access token with instagram_basic, instagram_content_publish permissions
  //
  // Step 1: Create container
  // POST /{ig-user-id}/media
  // {
  //   media_type: "REELS" | "STORIES",
  //   video_url: clipUrl,
  //   caption: payload.description + "\n\n" + payload.hashtags.join(" "),
  //   share_to_feed: true (for Reels),
  // }
  //
  // Step 2: Poll container status
  // GET /{container-id}?fields=status_code,status
  // Wait until status_code is "FINISHED"
  //
  // Step 3: Publish
  // POST /{ig-user-id}/media_publish
  // { creation_id: containerId }

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!accessToken || !businessAccountId) {
    throw new Error('Instagram credentials not configured (INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID)');
  }

  // TODO: Make actual API calls
  // const containerResponse = await fetch(
  //   `https://graph.facebook.com/v18.0/${businessAccountId}/media`,
  //   {
  //     method: 'POST',
  //     body: JSON.stringify({
  //       media_type: isStory ? 'STORIES' : 'REELS',
  //       video_url: clipUrl,
  //       caption: isStory ? '' : `${payload.description}\n\n${payload.hashtags.join(' ')}`,
  //       share_to_feed: !isStory,
  //       access_token: accessToken,
  //     }),
  //   }
  // );

  await job.updateProgress(70);

  // Placeholder: Simulate polling
  // const containerId = containerResponse.data.id;
  // await pollContainerStatus(containerId, accessToken);
  console.log('[Instagram Publisher] Container creation + polling placeholder');

  await job.updateProgress(90);

  // Placeholder: Simulate publish
  // const publishResponse = await fetch(
  //   `https://graph.facebook.com/v18.0/${businessAccountId}/media_publish`,
  //   {
  //     method: 'POST',
  //     body: JSON.stringify({
  //       creation_id: containerId,
  //       access_token: accessToken,
  //     }),
  //   }
  // );
  // const mediaId = publishResponse.data.id;

  const mediaId = `ig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log(`[Instagram Publisher] Publish placeholder: mediaId=${mediaId}`);

  await job.updateProgress(100);

  return {
    platformContentId: mediaId,
    platformUrl: `https://www.instagram.com/p/${mediaId}/`,
  };
}

// ============================================
// StreamZ - YouTube Data API v3 Publisher
// ============================================
// Publishes content to YouTube as VOD or Shorts.
// Uses YouTube Data API v3 for video upload.

import type { Job } from 'bullmq';
import type { PublishJobPayload, TargetPlatform } from '@streamz/shared';

interface PublishResult {
  platformContentId: string;
  platformUrl: string;
}

export async function publishToYouTube(
  payload: PublishJobPayload,
  job: Job<PublishJobPayload>
): Promise<PublishResult> {
  const isShorts = payload.targetPlatform === 'youtube_shorts';

  console.log(
    `[YouTube Publisher] Publishing ${isShorts ? 'Short' : 'VOD'}: "${payload.title}"`
  );

  await job.updateProgress(20);

  // ---- Step 1: Download clip from S3 ----
  // TODO: Download the clip file from R2/MinIO
  // const clipBuffer = await downloadFile(payload.clipR2Key);
  console.log(`[YouTube Publisher] Clip download placeholder: ${payload.clipR2Key}`);

  await job.updateProgress(30);

  // ---- Step 2: Upload to YouTube ----
  // TODO: Implement YouTube Data API v3 upload
  //
  // Prerequisites:
  // - OAuth2 access token with youtube.upload scope
  // - YouTube Data API v3 enabled
  // - Video file downloaded from R2
  //
  // API endpoint: POST https://www.googleapis.com/upload/youtube/v3/videos
  // - Upload video file (resumable upload for large files)
  // - Set snippet: title, description, tags, categoryId
  // - Set status: privacyStatus, embeddable, etc.
  //
  // For Shorts:
  // - Set snippet.title with #Shorts in the title or description
  // - Ensure video is vertical (9:16 aspect ratio)
  //
  // const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  // const response = await youtube.videos.insert({
  //   part: ['snippet', 'status'],
  //   requestBody: {
  //     snippet: {
  //       title: payload.title,
  //       description: payload.description + '\n\n' + payload.hashtags.join(' '),
  //       tags: payload.tags,
  //       categoryId: '20', // Gaming
  //     },
  //     status: {
  //       privacyStatus: 'public',
  //       selfDeclaredMadeForKids: false,
  //       embeddable: true,
  //     },
  //   },
  //   media: {
  //     body: Readable.from(clipBuffer),
  //   },
  // });
  //
  // const videoId = response.data.id;

  await job.updateProgress(80);

  // Placeholder result
  const videoId = `yt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  console.log(`[YouTube Publisher] Upload placeholder: videoId=${videoId}`);

  await job.updateProgress(100);

  return {
    platformContentId: videoId,
    platformUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

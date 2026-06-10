// ============================================
// StreamZ - YouTube Stream Capture
// ============================================
// Captures YouTube live stream VOD using yt-dlp.
// Uploads to S3-compatible storage (R2/MinIO).

import type { Job } from 'bullmq';
import type { CaptureJobPayload } from '@streamz/shared';
import { R2_PATHS } from '@streamz/shared';

// TODO: Import storage and DB clients when dependencies are wired
// import { uploadFile } from '@streamz/storage';
// import sql from '@streamz/db';

interface CaptureResult {
  vodR2Key: string;
  chatLogR2Key: string | null;
  duration: number;
}

export async function captureYouTube(
  payload: CaptureJobPayload,
  job: Job<CaptureJobPayload>
): Promise<CaptureResult> {
  const { platformStreamId, channelName, streamId } = payload;

  console.log(`[YouTube Capture] Starting capture for video: ${platformStreamId}`);
  await job.updateProgress(20);

  // ---- VOD Capture via yt-dlp ----
  const vodR2Key = R2_PATHS.vod('youtube', streamId);
  const vodTempPath = `/tmp/youtube_vod_${streamId}.mp4`;

  try {
    // TODO: Execute yt-dlp command to download YouTube video
    // Command: yt-dlp -o {vodTempPath} --format best "https://www.youtube.com/watch?v={platformStreamId}"
    //
    // const { execSync } = await import('child_process');
    // execSync(
    //   `yt-dlp -o "${vodTempPath}" --format best "https://www.youtube.com/watch?v=${platformStreamId}"`,
    //   { timeout: 60 * 60 * 1000 } // 1 hour timeout for long VODs
    // );

    console.log(`[YouTube Capture] VOD download placeholder for ${platformStreamId}`);
    await job.updateProgress(50);

    // TODO: Upload VOD to R2/MinIO
    // const vodBuffer = await fs.readFile(vodTempPath);
    // await uploadFile(vodR2Key, vodBuffer, 'video/mp4');
    console.log(`[YouTube Capture] VOD upload placeholder to ${vodR2Key}`);
  } catch (error) {
    console.error(`[YouTube Capture] VOD capture failed for ${platformStreamId}:`, error);
    throw new Error(`YouTube VOD capture failed: ${error}`);
  }

  await job.updateProgress(70);

  // ---- YouTube Live Chat (Optional) ----
  // YouTube live chat can be captured via yt-dlp's --write-subs or API
  let chatLogR2Key: string | null = null;

  try {
    // TODO: Attempt to download YouTube live chat replay
    // yt-dlp --write-subs --sub-format json1 can sometimes capture live chat
    // Alternatively, use YouTube Data API to fetch live chat messages
    //
    // const chatLogPath = `/tmp/youtube_chat_${streamId}.jsonl`;
    // ... capture and format chat messages ...

    console.log(`[YouTube Capture] Chat logging not yet implemented for YouTube`);
  } catch (error) {
    console.warn(`[YouTube Capture] Chat logging failed (non-fatal): ${error}`);
  }

  await job.updateProgress(80);

  // ---- Update Database ----
  // TODO: Update stream record with VOD key
  // await sql`
  //   UPDATE streams
  //   SET vod_r2_key = ${vodR2Key}, chat_log_r2_key = ${chatLogR2Key}, status = 'captured'
  //   WHERE id = ${streamId}
  // `;

  console.log(`[YouTube Capture] Capture complete for stream ${streamId}`);
  await job.updateProgress(100);

  return {
    vodR2Key,
    chatLogR2Key,
    duration: 0, // TODO: Extract actual duration from yt-dlp output
  };
}

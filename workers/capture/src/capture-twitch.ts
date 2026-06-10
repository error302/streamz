// ============================================
// StreamZ - Twitch Stream Capture
// ============================================
// Captures Twitch VOD using yt-dlp and logs IRC chat.
// Uploads both to S3-compatible storage (R2/MinIO).

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

export async function captureTwitch(
  payload: CaptureJobPayload,
  job: Job<CaptureJobPayload>
): Promise<CaptureResult> {
  const { platformStreamId, channelName, streamId } = payload;

  console.log(`[Twitch Capture] Starting capture for channel: ${channelName}, stream: ${platformStreamId}`);
  await job.updateProgress(20);

  // ---- VOD Capture via yt-dlp ----
  const vodR2Key = R2_PATHS.vod('twitch', streamId);
  const vodTempPath = `/tmp/twitch_vod_${streamId}.mp4`;

  try {
    // TODO: Execute yt-dlp command to download Twitch VOD
    // Command: yt-dlp -o {vodTempPath} --format best "https://www.twitch.tv/videos/{platformStreamId}"
    //
    // const { execSync } = await import('child_process');
    // execSync(
    //   `yt-dlp -o "${vodTempPath}" --format best "https://www.twitch.tv/videos/${platformStreamId}"`,
    //   { timeout: 30 * 60 * 1000 } // 30 min timeout
    // );

    console.log(`[Twitch Capture] VOD download placeholder for ${platformStreamId}`);
    await job.updateProgress(50);

    // TODO: Upload VOD to R2/MinIO
    // const vodBuffer = await fs.readFile(vodTempPath);
    // await uploadFile(vodR2Key, vodBuffer, 'video/mp4');
    console.log(`[Twitch Capture] VOD upload placeholder to ${vodR2Key}`);
  } catch (error) {
    console.error(`[Twitch Capture] VOD capture failed for ${platformStreamId}:`, error);
    throw new Error(`Twitch VOD capture failed: ${error}`);
  }

  await job.updateProgress(60);

  // ---- IRC Chat Logging ----
  let chatLogR2Key: string | null = null;

  try {
    chatLogR2Key = R2_PATHS.chatLog('twitch', streamId);

    // TODO: Implement IRC chat logging
    // Connect to Twitch IRC and log chat messages for the stream duration
    // Format: JSONL with { timestamp, username, message, badges } per line
    //
    // const chatLogPath = `/tmp/twitch_chat_${streamId}.jsonl`;
    // const ircClient = new IRCClient({
    //   server: 'irc.chat.twitch.tv',
    //   port: 6667,
    //   nickname: 'justinfan12345', // Anonymous login
    //   channels: [`#${channelName}`],
    // });
    //
    // ircClient.on('message', (msg) => {
    //   fs.appendFileSync(chatLogPath, JSON.stringify({
    //     timestamp: msg.timestamp,
    //     username: msg.username,
    //     message: msg.text,
    //     badges: msg.badges,
    //   }) + '\n');
    // });
    //
    // await ircClient.connect();
    // // Wait for stream to end or timeout
    // await waitForStreamEnd(platformStreamId);
    // await ircClient.disconnect();

    console.log(`[Twitch Capture] Chat logging placeholder for ${channelName}`);

    // TODO: Upload chat log to R2/MinIO
    // const chatBuffer = await fs.readFile(chatLogPath);
    // await uploadFile(chatLogR2Key, chatBuffer, 'application/x-jsonlines');
  } catch (error) {
    console.warn(`[Twitch Capture] Chat logging failed (non-fatal): ${error}`);
    chatLogR2Key = null; // Chat log is optional
  }

  await job.updateProgress(80);

  // ---- Update Database ----
  // TODO: Update stream record with VOD and chat log keys
  // await sql`
  //   UPDATE streams
  //   SET vod_r2_key = ${vodR2Key}, chat_log_r2_key = ${chatLogR2Key}, status = 'captured'
  //   WHERE id = ${streamId}
  // `;

  console.log(`[Twitch Capture] Capture complete for stream ${streamId}`);
  await job.updateProgress(100);

  return {
    vodR2Key,
    chatLogR2Key,
    duration: 0, // TODO: Extract actual duration from yt-dlp output
  };
}

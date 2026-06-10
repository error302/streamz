// ============================================
// StreamZ - YouTube Stream Capture
// ============================================
// Captures YouTube live stream VOD using yt-dlp.
// Uploads to S3-compatible storage (R2/MinIO).
// Supports YouTube live chat replay extraction.

import { spawn, ChildProcess } from 'child_process';
import { mkdir, readFile, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Job } from 'bullmq';
import type { CaptureJobPayload } from '@streamz/shared';
import { R2_PATHS, RETRY_CONFIG } from '@streamz/shared';
import { uploadFile } from './storage.js';

interface CaptureResult {
  vodR2Key: string;
  chatLogR2Key: string | null;
  duration: number;
}

interface YouTubeMetadata {
  title: string;
  description: string;
  duration: number;
  channelId: string;
}

// Track current process for graceful shutdown
let currentYtDlpProcess: ChildProcess | null = null;

// ---- yt-dlp VOD Capture ----
function captureVodViaYtDlp(
  url: string,
  outputPath: string,
  timeoutMs: number,
  retries: number = 3
): Promise<void> {
  return new Promise((resolve, reject) => {
    const attempt = (retriesLeft: number) => {
      const args = [
        '-o', outputPath,
        '--format', 'best[ext=mp4]/best',
        '--retries', '5',
        '--fragment-retries', '5',
        '--no-part',
        '--continue',
        '--newline',
        // For live streams, wait for the stream to come online
        '--no-wait-for-video',
        url,
      ];

      console.log(`[YouTube Capture] Spawning yt-dlp with args: ${args.join(' ')} (retries left: ${retriesLeft})`);

      const proc = spawn('yt-dlp', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: timeoutMs,
      });

      let stderrOutput = '';

      proc.stdout?.on('data', (data: Buffer) => {
        const output = data.toString('utf-8').trim();
        if (output.includes('[download]') || output.includes('%')) {
          console.log(`[yt-dlp] ${output}`);
        }
      });

      proc.stderr?.on('data', (data: Buffer) => {
        const output = data.toString('utf-8').trim();
        stderrOutput += output + '\n';
        console.warn(`[yt-dlp stderr] ${output}`);
      });

      proc.on('close', (code) => {
        currentYtDlpProcess = null;

        if (code === 0) {
          console.log(`[YouTube Capture] yt-dlp completed successfully`);
          resolve();
        } else if (retriesLeft > 0) {
          const isRetryable = code !== 1 || stderrOutput.includes('HTTP Error 429') ||
            stderrOutput.includes('timed out') || stderrOutput.includes('network');

          if (isRetryable) {
            const delayMs = (3 - retriesLeft + 1) * 5000; // Exponential backoff
            console.warn(
              `[YouTube Capture] yt-dlp failed with code ${code}. Retrying in ${delayMs / 1000}s... (${retriesLeft} retries left)`
            );
            setTimeout(() => attempt(retriesLeft - 1), delayMs);
          } else {
            reject(new Error(`yt-dlp exited with code ${code}: ${stderrOutput.slice(-500)}`));
          }
        } else {
          reject(new Error(`yt-dlp exited with code ${code} (no retries left): ${stderrOutput.slice(-500)}`));
        }
      });

      proc.on('error', (err) => {
        currentYtDlpProcess = null;
        if (retriesLeft > 0) {
          console.warn(`[YouTube Capture] yt-dlp spawn error: ${err.message}. Retrying...`);
          setTimeout(() => attempt(retriesLeft - 1), 5000);
        } else {
          reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
        }
      });

      currentYtDlpProcess = proc;
    };

    attempt(retries);
  });
}

// ---- Extract YouTube Metadata ----
async function extractYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  return new Promise((resolve) => {
    const args = [
      '--dump-json',
      '--no-download',
      url,
    ];

    const proc = spawn('yt-dlp', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60000,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString('utf-8');
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString('utf-8');
    });

    proc.on('close', (code) => {
      if (code === 0 && stdout) {
        try {
          const metadata = JSON.parse(stdout);
          resolve({
            title: metadata.title || 'Untitled Stream',
            description: metadata.description || '',
            duration: metadata.duration || 0,
            channelId: metadata.channel_id || '',
          });
        } catch {
          console.warn('[YouTube Capture] Failed to parse metadata JSON, using defaults');
          resolve({ title: 'Untitled Stream', description: '', duration: 0, channelId: '' });
        }
      } else {
        console.warn(`[YouTube Capture] Metadata extraction failed (code ${code}): ${stderr.slice(-200)}`);
        resolve({ title: 'Untitled Stream', description: '', duration: 0, channelId: '' });
      }
    });

    proc.on('error', () => {
      resolve({ title: 'Untitled Stream', description: '', duration: 0, channelId: '' });
    });
  });
}

// ---- YouTube Live Chat Extraction ----
// Attempts to download YouTube live chat replay using yt-dlp
async function extractYouTubeChat(
  videoId: string,
  chatLogPath: string
): Promise<boolean> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  return new Promise((resolve) => {
    // yt-dlp can sometimes download live chat replay with --write-subs --sub-format json1
    const args = [
      '--write-subs',
      '--sub-format', 'json1',
      '--skip-download',  // Don't download the video again
      '-o', chatLogPath.replace(/\.[^.]+$/, ''), // Output path without extension
      url,
    ];

    console.log(`[YouTube Capture] Attempting chat replay extraction for ${videoId}`);

    const proc = spawn('yt-dlp', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000,
    });

    let stderrOutput = '';

    proc.stderr?.on('data', (data: Buffer) => {
      stderrOutput += data.toString('utf-8');
    });

    proc.on('close', async (code) => {
      if (code === 0) {
        // yt-dlp writes subtitles as .json1 or .live_chat.json
        // Try to find and convert the file
        const possiblePaths = [
          chatLogPath,
          chatLogPath.replace('.log', '.json1'),
          chatLogPath.replace('.log', '.live_chat.json'),
        ];

        for (const p of possiblePaths) {
          if (existsSync(p)) {
            try {
              const chatBuffer = await readFile(p);
              if (chatBuffer.length > 0) {
                // Convert JSON live chat to our text format
                const converted = convertYouTubeChatToText(chatBuffer.toString('utf-8'));
                const { writeFile } = await import('fs/promises');
                await writeFile(chatLogPath, converted);

                // Remove original JSON file if different from our output
                if (p !== chatLogPath) {
                  try { await unlink(p); } catch { /* ignore */ }
                }

                console.log(`[YouTube Capture] Chat replay extracted successfully`);
                resolve(true);
                return;
              }
            } catch (err) {
              console.warn(`[YouTube Capture] Error processing chat file ${p}: ${err}`);
            }
          }
        }

        console.log(`[YouTube Capture] Chat replay file not found after extraction`);
        resolve(false);
      } else {
        console.warn(`[YouTube Capture] Chat extraction failed (code ${code}): ${stderrOutput.slice(-200)}`);
        resolve(false);
      }
    });

    proc.on('error', (err) => {
      console.warn(`[YouTube Capture] Chat extraction spawn error: ${err.message}`);
      resolve(false);
    });
  });
}

// ---- Convert YouTube JSON Chat to Text Format ----
function convertYouTubeChatToText(jsonContent: string): string {
  const lines: string[] = [];

  try {
    // YouTube live chat JSON format from yt-dlp
    // It can be an array of events or JSONL format
    let events: Array<{ replayChatItemAction?: { actions?: Array<{ addChatItemAction?: { item?: { liveChatTextMessageRenderer?: { authorName?: { simpleText?: string }; message?: { runs?: Array<{ text?: string }> }; timestampUsec?: string } } } } } }>;

    try {
      events = JSON.parse(jsonContent);
    } catch {
      // Try JSONL format
      events = jsonContent
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));
    }

    for (const event of events) {
      const actions = event?.replayChatItemAction?.actions;
      if (!actions) continue;

      for (const action of actions) {
        const chatItem = action?.addChatItemAction?.item?.liveChatTextMessageRenderer;
        if (!chatItem) continue;

        const username = chatItem.authorName?.simpleText || 'unknown';
        const message = chatItem.message?.runs?.map((r: { text?: string }) => r.text || '').join('') || '';
        const timestampUsec = chatItem.timestampUsec;
        const timestamp = timestampUsec
          ? new Date(parseInt(timestampUsec) / 1000).toISOString()
          : new Date().toISOString();

        lines.push(`${timestamp} | ${username}: ${message}`);
      }
    }
  } catch (err) {
    console.warn(`[YouTube Capture] Failed to parse chat JSON: ${err}`);
  }

  return lines.join('\n');
}

// ---- Get Duration via ffprobe ----
async function getDurationViaFfprobe(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ], { stdio: ['ignore', 'pipe', 'ignore'] });

    let output = '';
    proc.stdout?.on('data', (data: Buffer) => { output += data.toString(); });
    proc.on('close', (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? 0 : duration);
      } else {
        resolve(0);
      }
    });
    proc.on('error', () => resolve(0));
  });
}

// ---- Main Capture Function ----
export async function captureYouTube(
  payload: CaptureJobPayload,
  job: Job<CaptureJobPayload>
): Promise<CaptureResult> {
  const { platformStreamId, channelName, streamId } = payload;

  console.log(`[YouTube Capture] Starting capture for video: ${platformStreamId}, channel: ${channelName}`);
  await job.updateProgress(5);

  // Create temp directory
  const tempDir = `/tmp/streamz_${streamId}`;
  await mkdir(tempDir, { recursive: true });

  const vodR2Key = R2_PATHS.vod('youtube', streamId);
  const vodTempPath = join(tempDir, `youtube_vod_${streamId}.mp4`);
  const chatLogR2Key = R2_PATHS.chatLog('youtube', streamId);
  const chatLogPath = join(tempDir, `youtube_chat_${streamId}.log`);

  let duration = 0;

  try {
    // ---- Step 1: Extract YouTube Metadata ----
    console.log(`[YouTube Capture] Extracting metadata for ${platformStreamId}`);
    const metadata = await extractYouTubeMetadata(platformStreamId);
    duration = metadata.duration;
    console.log(`[YouTube Capture] Metadata: title="${metadata.title}", duration=${duration}s`);

    await job.updateProgress(10);

    // ---- Step 2: VOD Capture via yt-dlp ----
    const videoUrl = `https://www.youtube.com/watch?v=${platformStreamId}`;

    try {
      await captureVodViaYtDlp(videoUrl, vodTempPath, RETRY_CONFIG.JOB_TIMEOUT_MS);
      console.log(`[YouTube Capture] VOD download completed for ${platformStreamId}`);
    } catch (error) {
      console.error(`[YouTube Capture] VOD capture failed for ${platformStreamId}:`, error);
      throw new Error(`YouTube VOD capture failed: ${error}`);
    }

    await job.updateProgress(60);

    // ---- Step 3: Upload VOD to R2/MinIO ----
    try {
      if (existsSync(vodTempPath)) {
        const vodBuffer = await readFile(vodTempPath);
        console.log(`[YouTube Capture] Uploading VOD (${(vodBuffer.length / 1024 / 1024).toFixed(1)} MB) to ${vodR2Key}`);
        await uploadFile(vodR2Key, vodBuffer, 'video/mp4');
        console.log(`[YouTube Capture] VOD uploaded successfully`);
      } else {
        throw new Error(`VOD file not found at ${vodTempPath}`);
      }
    } catch (error) {
      console.error(`[YouTube Capture] VOD upload failed: ${error}`);
      throw new Error(`YouTube VOD upload failed: ${error}`);
    }

    await job.updateProgress(70);

    // ---- Step 4: Attempt YouTube Chat Extraction ----
    let finalChatLogR2Key: string | null = chatLogR2Key;
    const chatExtracted = await extractYouTubeChat(platformStreamId, chatLogPath);

    if (chatExtracted && existsSync(chatLogPath)) {
      try {
        const chatBuffer = await readFile(chatLogPath);
        if (chatBuffer.length > 0) {
          console.log(`[YouTube Capture] Uploading chat log (${chatBuffer.length} bytes) to ${chatLogR2Key}`);
          await uploadFile(chatLogR2Key, chatBuffer, 'text/plain');
          console.log(`[YouTube Capture] Chat log uploaded successfully`);
        } else {
          console.log(`[YouTube Capture] Chat log is empty, skipping upload`);
          finalChatLogR2Key = null;
        }
      } catch (error) {
        console.warn(`[YouTube Capture] Chat log upload failed (non-fatal): ${error}`);
        finalChatLogR2Key = null;
      }
    } else {
      console.log(`[YouTube Capture] No chat replay available for this video`);
      finalChatLogR2Key = null;
    }

    await job.updateProgress(80);

    // ---- Step 5: Get Duration if Not Known ----
    if (duration === 0 && existsSync(vodTempPath)) {
      duration = await getDurationViaFfprobe(vodTempPath);
      console.log(`[YouTube Capture] Detected duration via ffprobe: ${duration}s`);
    }

    await job.updateProgress(90);

    // ---- Step 6: Cleanup Temp Files ----
    try {
      if (existsSync(vodTempPath)) await unlink(vodTempPath);
      if (existsSync(chatLogPath)) await unlink(chatLogPath);
    } catch (cleanupErr) {
      console.warn(`[YouTube Capture] Temp file cleanup warning: ${cleanupErr}`);
    }

    console.log(`[YouTube Capture] Capture complete for stream ${streamId}`);
    await job.updateProgress(100);

    return {
      vodR2Key,
      chatLogR2Key: finalChatLogR2Key,
      duration,
    };
  } catch (error) {
    // Kill any running yt-dlp process
    if (currentYtDlpProcess && !currentYtDlpProcess.killed) {
      currentYtDlpProcess.kill('SIGKILL');
    }

    // Cleanup temp files on error
    try {
      if (existsSync(vodTempPath)) await unlink(vodTempPath);
      if (existsSync(chatLogPath)) await unlink(chatLogPath);
    } catch { /* ignore */ }

    throw error;
  }
}

// ---- Graceful Shutdown Hook ----
export function shutdownCapture(): void {
  if (currentYtDlpProcess && !currentYtDlpProcess.killed) {
    console.log('[YouTube Capture] Sending SIGTERM to yt-dlp process');
    currentYtDlpProcess.kill('SIGTERM');
  }
}

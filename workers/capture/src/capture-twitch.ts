// ============================================
// StreamZ - Twitch Stream Capture
// ============================================
// Captures Twitch VOD using yt-dlp and logs IRC chat.
// Uploads both to S3-compatible storage (R2/MinIO).

import { spawn, ChildProcess } from 'child_process';
import { mkdir, readFile, unlink, stat, writeFile } from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import { join } from 'path';
import type { Job } from 'bullmq';
import type { CaptureJobPayload } from '@streamz/shared';
import { R2_PATHS, RETRY_CONFIG } from '@streamz/shared';
import { uploadFile } from './storage.js';
import { createConnection, type Socket } from 'net';

interface CaptureResult {
  vodR2Key: string;
  chatLogR2Key: string | null;
  duration: number;
}

interface StreamMetadata {
  title: string;
  gameCategory: string | null;
  duration: number;
}

// ---- Twitch IRC Chat Logger ----
// Connects to Twitch IRC as an anonymous user and logs chat messages
class TwitchChatLogger {
  private socket: Socket | null = null;
  private chatLogPath: string;
  private writeStream: ReturnType<typeof createWriteStream> | null = null;
  private channelName: string;
  private connected = false;
  private messageCount = 0;

  constructor(channelName: string, chatLogPath: string) {
    this.channelName = channelName;
    this.chatLogPath = chatLogPath;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.writeStream = createWriteStream(this.chatLogPath, { flags: 'a' });

      const ircServer = process.env.TWITCH_IRC_SERVER || 'irc.chat.twitch.tv';
      const ircPort = parseInt(process.env.TWITCH_IRC_PORT || '6667', 10);

      this.socket = createConnection({ host: ircServer, port: ircPort }, () => {
        // Anonymous login to Twitch IRC
        const anonName = `justinfan${Math.floor(Math.random() * 90000 + 10000)}`;
        this.socket!.write(`PASS SCHMOOPIIE\r\n`);
        this.socket!.write(`NICK ${anonName}\r\n`);
        this.socket!.write(`USER ${anonName} 8 * :${anonName}\r\n`);
        this.socket!.write(`JOIN #${this.channelName}\r\n`);
        this.socket!.write(`CAP REQ :twitch.tv/tags\r\n`); // Request tags for badges etc.
        this.connected = true;
        console.log(`[Twitch IRC] Connected to #${this.channelName}`);
        resolve();
      });

      this.socket.on('data', (data: Buffer) => {
        const lines = data.toString('utf-8').split('\r\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          // Respond to PING to keep connection alive
          if (line.startsWith('PING')) {
            this.socket!.write('PONG :tmi.twitch.tv\r\n');
            continue;
          }

          // Parse chat messages
          this.handleIRCLine(line);
        }
      });

      this.socket.on('error', (err: Error) => {
        console.error(`[Twitch IRC] Socket error: ${err.message}`);
        if (!this.connected) reject(err);
      });

      this.socket.on('close', () => {
        this.connected = false;
        console.log(`[Twitch IRC] Disconnected from #${this.channelName}`);
      });

      // Connection timeout
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('IRC connection timeout'));
        }
      }, 15000);
    });
  }

  private handleIRCLine(line: string): void {
    // Twitch IRC message format with tags:
    // @badge-info=...;color=...;display-name=... :username!username@username.tmi.twitch.tv PRIVMSG #channel :message
    // Or without tags:
    // :username!username@username.tmi.twitch.tv PRIVMSG #channel :message

    if (!line.includes('PRIVMSG')) return;

    try {
      // Extract username
      const usernameMatch = line.match(/:([^!]+)!/);
      const username = usernameMatch ? usernameMatch[1] : 'unknown';

      // Extract message content (after the channel name and colon)
      const messageMatch = line.match(/PRIVMSG #[^\s]+ :(.+)/);
      const message = messageMatch ? messageMatch[1] : '';

      if (!message && !username) return;

      // Format: {timestamp} | {username}: {message}
      const timestamp = new Date().toISOString();
      const formattedMessage = `${timestamp} | ${username}: ${message}\n`;

      this.writeStream?.write(formattedMessage);
      this.messageCount++;
    } catch (err) {
      // Silently ignore parse errors for individual messages
    }
  }

  getMessageCount(): number {
    return this.messageCount;
  }

  async disconnect(): Promise<void> {
    if (this.socket && this.connected) {
      this.socket.write(`PART #${this.channelName}\r\n`);
      this.socket.write('QUIT\r\n');
      this.socket.destroy();
      this.connected = false;
    }
    this.writeStream?.end();
  }
}

// ---- yt-dlp VOD Capture ----
// Spawns yt-dlp to download Twitch VOD with streaming output
function captureVodViaYtDlp(
  url: string,
  outputPath: string,
  timeoutMs: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-o', outputPath,
      '--format', 'best[ext=mp4]/best',
      '--no-wait-for-video',
      '--retries', '5',
      '--fragment-retries', '5',
      '--no-part',
      '--continue',
      '--newline',  // Progress on new lines for parsing
      url,
    ];

    console.log(`[Twitch Capture] Spawning yt-dlp with args: ${args.join(' ')}`);

    const proc = spawn('yt-dlp', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: timeoutMs,
    });

    let lastProgress = '';
    let stderrOutput = '';

    proc.stdout?.on('data', (data: Buffer) => {
      const output = data.toString('utf-8').trim();
      if (output.includes('[download]') || output.includes('%')) {
        lastProgress = output;
        console.log(`[yt-dlp] ${output}`);
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const output = data.toString('utf-8').trim();
      stderrOutput += output + '\n';
      console.warn(`[yt-dlp stderr] ${output}`);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[Twitch Capture] yt-dlp completed successfully`);
        resolve();
      } else {
        reject(new Error(`yt-dlp exited with code ${code}: ${stderrOutput.slice(-500)}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });

    // Store process for potential cleanup
    currentYtDlpProcess = proc;
  });
}

// Track current process for graceful shutdown
let currentYtDlpProcess: ChildProcess | null = null;

// ---- Extract Metadata via yt-dlp ----
async function extractMetadata(url: string): Promise<StreamMetadata> {
  return new Promise((resolve, reject) => {
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
            gameCategory: metadata.categories?.[0] || metadata.genre || null,
            duration: metadata.duration || 0,
          });
        } catch {
          console.warn('[Twitch Capture] Failed to parse metadata JSON, using defaults');
          resolve({ title: 'Untitled Stream', gameCategory: null, duration: 0 });
        }
      } else {
        console.warn(`[Twitch Capture] Metadata extraction failed (code ${code}): ${stderr.slice(-200)}`);
        resolve({ title: 'Untitled Stream', gameCategory: null, duration: 0 });
      }
    });

    proc.on('error', () => {
      resolve({ title: 'Untitled Stream', gameCategory: null, duration: 0 });
    });
  });
}

// ---- Main Capture Function ----
export async function captureTwitch(
  payload: CaptureJobPayload,
  job: Job<CaptureJobPayload>
): Promise<CaptureResult> {
  const { platformStreamId, channelName, streamId } = payload;

  console.log(`[Twitch Capture] Starting capture for channel: ${channelName}, stream: ${platformStreamId}`);
  await job.updateProgress(5);

  // Create temp directory
  const tempDir = `/tmp/streamz_${streamId}`;
  await mkdir(tempDir, { recursive: true });

  const vodR2Key = R2_PATHS.vod('twitch', streamId);
  const vodTempPath = join(tempDir, `twitch_vod_${streamId}.mp4`);
  const chatLogR2Key = R2_PATHS.chatLog('twitch', streamId);
  const chatLogPath = join(tempDir, `twitch_chat_${streamId}.log`);

  let chatLogger: TwitchChatLogger | null = null;
  let duration = 0;

  try {
    // ---- Step 1: Extract Stream Metadata ----
    console.log(`[Twitch Capture] Extracting metadata for ${platformStreamId}`);
    const vodUrl = `https://www.twitch.tv/videos/${platformStreamId}`;

    let metadata: StreamMetadata;
    try {
      metadata = await extractMetadata(vodUrl);
      duration = metadata.duration;
      console.log(`[Twitch Capture] Metadata: title="${metadata.title}", duration=${duration}s`);
    } catch (err) {
      console.warn(`[Twitch Capture] Metadata extraction failed, continuing: ${err}`);
      metadata = { title: 'Untitled Stream', gameCategory: null, duration: 0 };
    }

    await job.updateProgress(10);

    // ---- Step 2: Start IRC Chat Logging (concurrent with VOD download) ----
    const chatPromise = (async () => {
      try {
        chatLogger = new TwitchChatLogger(channelName, chatLogPath);
        await chatLogger.connect();
        console.log(`[Twitch Capture] IRC chat logging started for #${channelName}`);
        return true;
      } catch (err) {
        console.warn(`[Twitch Capture] IRC chat logging failed (non-fatal): ${err}`);
        return false;
      }
    })();

    const chatConnected = await chatPromise;
    await job.updateProgress(20);

    // ---- Step 3: VOD Capture via yt-dlp ----
    try {
      const timeoutMs = RETRY_CONFIG.JOB_TIMEOUT_MS;
      await captureVodViaYtDlp(vodUrl, vodTempPath, timeoutMs);
      console.log(`[Twitch Capture] VOD download completed for ${platformStreamId}`);
    } catch (error) {
      console.error(`[Twitch Capture] VOD capture failed for ${platformStreamId}:`, error);

      // If VOD download fails, try live stream URL as fallback
      try {
        const liveUrl = `https://www.twitch.tv/${channelName}`;
        console.log(`[Twitch Capture] Trying live stream URL as fallback: ${liveUrl}`);
        await captureVodViaYtDlp(liveUrl, vodTempPath, RETRY_CONFIG.JOB_TIMEOUT_MS);
        console.log(`[Twitch Capture] Live stream capture completed`);
      } catch (fallbackError) {
        throw new Error(
          `Twitch VOD capture failed (both VOD and live attempts): ${error}; Fallback: ${fallbackError}`
        );
      }
    }

    await job.updateProgress(60);

    // ---- Step 4: Stop Chat Logging ----
    const logger = chatLogger as TwitchChatLogger | null;
    if (logger) {
      await logger.disconnect();
      const chatMsgCount = logger.getMessageCount();
      console.log(`[Twitch Capture] Chat logging stopped. ${chatMsgCount} messages captured.`);
    }

    await job.updateProgress(65);

    // ---- Step 5: Upload VOD to R2/MinIO ----
    try {
      if (existsSync(vodTempPath)) {
        const vodBuffer = await readFile(vodTempPath);
        console.log(`[Twitch Capture] Uploading VOD (${(vodBuffer.length / 1024 / 1024).toFixed(1)} MB) to ${vodR2Key}`);
        await uploadFile(vodR2Key, vodBuffer, 'video/mp4');
        console.log(`[Twitch Capture] VOD uploaded successfully`);
      } else {
        throw new Error(`VOD file not found at ${vodTempPath}`);
      }
    } catch (error) {
      console.error(`[Twitch Capture] VOD upload failed: ${error}`);
      throw new Error(`Twitch VOD upload failed: ${error}`);
    }

    await job.updateProgress(80);

    // ---- Step 6: Upload Chat Log to R2/MinIO ----
    let finalChatLogR2Key: string | null = chatLogR2Key;

    try {
      if (existsSync(chatLogPath)) {
        const chatBuffer = await readFile(chatLogPath);
        if (chatBuffer.length > 0) {
          console.log(`[Twitch Capture] Uploading chat log (${chatBuffer.length} bytes) to ${chatLogR2Key}`);
          await uploadFile(chatLogR2Key, chatBuffer, 'text/plain');
          console.log(`[Twitch Capture] Chat log uploaded successfully`);
        } else {
          console.log(`[Twitch Capture] Chat log is empty, skipping upload`);
          finalChatLogR2Key = null;
        }
      } else {
        console.log(`[Twitch Capture] No chat log file found, skipping upload`);
        finalChatLogR2Key = null;
      }
    } catch (error) {
      console.warn(`[Twitch Capture] Chat log upload failed (non-fatal): ${error}`);
      finalChatLogR2Key = null;
    }

    await job.updateProgress(90);

    // ---- Step 7: Extract Duration from Downloaded File ----
    if (duration === 0) {
      try {
        const fileStats = await stat(vodTempPath);
        // Try to get duration via ffprobe
        const ffprobeResult = await new Promise<string>((resolve, reject) => {
          const proc = spawn('ffprobe', [
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            vodTempPath,
          ], { stdio: ['ignore', 'pipe', 'ignore'] });

          let output = '';
          proc.stdout?.on('data', (data: Buffer) => { output += data.toString(); });
          proc.on('close', (code) => {
            if (code === 0) resolve(output.trim());
            else reject(new Error(`ffprobe exited with code ${code}`));
          });
          proc.on('error', reject);
        });

        duration = parseFloat(ffprobeResult) || 0;
        console.log(`[Twitch Capture] Detected duration via ffprobe: ${duration}s`);
      } catch (err) {
        console.warn(`[Twitch Capture] Could not extract duration: ${err}`);
      }
    }

    await job.updateProgress(95);

    // ---- Step 8: Cleanup Temp Files ----
    try {
      if (existsSync(vodTempPath)) await unlink(vodTempPath);
      if (existsSync(chatLogPath)) await unlink(chatLogPath);
    } catch (cleanupErr) {
      console.warn(`[Twitch Capture] Temp file cleanup warning: ${cleanupErr}`);
    }

    console.log(`[Twitch Capture] Capture complete for stream ${streamId}`);
    await job.updateProgress(100);

    return {
      vodR2Key,
      chatLogR2Key: finalChatLogR2Key,
      duration,
    };
  } catch (error) {
    // Cleanup on error
    if (chatLogger) {
      try { await (chatLogger as TwitchChatLogger).disconnect(); } catch { /* ignore */ }
    }

    // Kill any running yt-dlp process
    if (currentYtDlpProcess && !currentYtDlpProcess.killed) {
      currentYtDlpProcess.kill('SIGKILL');
    }

    // Attempt cleanup of temp files
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
    console.log('[Twitch Capture] Sending SIGTERM to yt-dlp process');
    currentYtDlpProcess.kill('SIGTERM');
  }
}

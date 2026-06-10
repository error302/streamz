// ============================================
// StreamZ - Chat Spike Detection Algorithm
// ============================================
// Analyzes IRC chat logs to detect message spikes that indicate
// exciting moments during a live stream.
//
// Algorithm:
// 1. Load chat log from R2/MinIO
// 2. Parse timestamped messages (format: "2024-01-15T20:30:45Z | username: message content")
// 3. Compute rolling average of messages per 30-second window
// 4. Flag windows where rate > configurable multiplier × baseline
// 5. Merge overlapping or adjacent spike windows
// 6. Return array of { startTime, endTime, intensity } objects

import type { Job } from 'bullmq';
import type { HighlightJobPayload } from '@streamz/shared';
import { HIGHLIGHT_THRESHOLDS } from '@streamz/shared';
import { downloadFile } from './storage.js';

// ---- Types ----

export interface ChatMessage {
  timestamp: number; // Unix timestamp in seconds
  username: string;
  message: string;
}

export interface ChatSpike {
  startTime: number;
  endTime: number;
  spikeIntensity: number;
  messageCount: number;
}

export interface ChatAnalyzerConfig {
  windowSeconds: number;      // Size of each analysis window (default: 30)
  spikeMultiplier: number;    // How many times above baseline to flag (default: 2.5)
  minMessages: number;        // Minimum messages in a window to qualify
  mergeGapSeconds: number;    // Merge spikes within this gap (default: 30)
  minSpikeDurationSec: number; // Minimum duration for a spike to be valid
}

const DEFAULT_CONFIG: ChatAnalyzerConfig = {
  windowSeconds: HIGHLIGHT_THRESHOLDS.CHAT_WINDOW_SECONDS,
  spikeMultiplier: 2.5, // More conservative than the 3.0 in constants - allows catching more spikes
  minMessages: HIGHLIGHT_THRESHOLDS.CHAT_SPIKE_MIN_MESSAGES,
  mergeGapSeconds: 30,
  minSpikeDurationSec: 5,
};

// ---- Chat Log Parser ----
// Downloads chat log from S3 and parses into ChatMessage array
// Supports both text format and JSONL format
async function loadChatLog(chatLogR2Key: string): Promise<ChatMessage[]> {
  console.log(`[Chat Analyzer] Loading chat log from: ${chatLogR2Key}`);

  try {
    const chatBuffer = await downloadFile(chatLogR2Key);
    const content = chatBuffer.toString('utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    const messages: ChatMessage[] = [];

    for (const line of lines) {
      const parsed = parseChatLine(line);
      if (parsed) {
        messages.push(parsed);
      }
    }

    // Sort by timestamp to ensure correct ordering
    messages.sort((a, b) => a.timestamp - b.timestamp);

    console.log(`[Chat Analyzer] Parsed ${messages.length} chat messages from ${lines.length} lines`);
    return messages;
  } catch (error) {
    console.error(`[Chat Analyzer] Failed to load chat log from ${chatLogR2Key}:`, error);
    throw new Error(`Chat log download failed: ${error}`);
  }
}

// ---- Parse a Single Chat Line ----
// Supports two formats:
// 1. Text format: "2024-01-15T20:30:45Z | username: message content"
// 2. JSONL format: {"timestamp":"...","username":"...","message":"..."}
function parseChatLine(line: string): ChatMessage | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Try text format first: "2024-01-15T20:30:45Z | username: message content"
  const textFormatMatch = trimmed.match(/^(\S+)\s*\|\s*(\S+?):\s*(.+)$/);
  if (textFormatMatch) {
    const [, timestampStr, username, message] = textFormatMatch;
    const timestamp = parseTimestamp(timestampStr);
    if (timestamp > 0) {
      return { timestamp, username, message };
    }
  }

  // Try JSONL format: {"timestamp":"...","username":"...","message":"..."}
  try {
    const obj = JSON.parse(trimmed);
    if (obj.timestamp || obj.time) {
      const ts = obj.timestamp || obj.time;
      const timestamp = typeof ts === 'number'
        ? ts
        : parseTimestamp(String(ts));
      if (timestamp > 0) {
        return {
          timestamp,
          username: obj.username || obj.user || obj.display_name || 'unknown',
          message: obj.message || obj.text || obj.content || '',
        };
      }
    }
  } catch {
    // Not JSON, ignore
  }

  return null;
}

// ---- Parse Timestamp String to Unix Seconds ----
function parseTimestamp(ts: string): number {
  // ISO format: "2024-01-15T20:30:45Z" or "2024-01-15T20:30:45.123Z"
  const isoDate = new Date(ts);
  if (!isNaN(isoDate.getTime())) {
    return isoDate.getTime() / 1000;
  }

  // Try as a plain number (already in seconds or milliseconds)
  const num = parseFloat(ts);
  if (!isNaN(num)) {
    // If the number is very large, it's likely in milliseconds
    return num > 1e12 ? num / 1000 : num;
  }

  return 0;
}

// ---- Compute Rolling Message Counts ----
// Buckets messages into fixed-size windows and counts per window
function computeWindowCounts(
  messages: ChatMessage[],
  windowSeconds: number
): Map<number, number> {
  const windowCounts = new Map<number, number>();

  if (messages.length === 0) return windowCounts;

  // Find the time range of the stream
  const firstTimestamp = messages[0].timestamp;
  const lastTimestamp = messages[messages.length - 1].timestamp;

  // Initialize all windows with 0
  const firstWindow = Math.floor(firstTimestamp / windowSeconds) * windowSeconds;
  const lastWindow = Math.floor(lastTimestamp / windowSeconds) * windowSeconds;

  for (let w = firstWindow; w <= lastWindow; w += windowSeconds) {
    windowCounts.set(w, 0);
  }

  // Count messages per window
  for (const msg of messages) {
    const bucket = Math.floor(msg.timestamp / windowSeconds) * windowSeconds;
    windowCounts.set(bucket, (windowCounts.get(bucket) || 0) + 1);
  }

  return windowCounts;
}

// ---- Compute Baseline (Median) ----
// Uses median instead of mean to be robust against outlier windows
function computeBaseline(windowCounts: Map<number, number>): number {
  if (windowCounts.size === 0) return 0;

  const counts = Array.from(windowCounts.values()).sort((a, b) => a - b);
  const mid = Math.floor(counts.length / 2);

  const median = counts.length % 2 !== 0
    ? counts[mid]
    : (counts[mid - 1] + counts[mid]) / 2;

  return median;
}

// ---- Detect Spike Windows ----
// Flags windows where message rate exceeds multiplier × baseline
function detectSpikeWindows(
  windowCounts: Map<number, number>,
  baseline: number,
  config: ChatAnalyzerConfig
): Array<{ windowStart: number; count: number; ratio: number }> {
  const spikes: Array<{ windowStart: number; count: number; ratio: number }> = [];
  const threshold = Math.max(baseline * config.spikeMultiplier, config.minMessages);

  const sortedWindows = Array.from(windowCounts.entries()).sort((a, b) => a[0] - b[0]);

  for (const [windowStart, count] of sortedWindows) {
    const ratio = baseline > 0 ? count / baseline : 0;

    if (count >= threshold && ratio >= config.spikeMultiplier) {
      spikes.push({ windowStart, count, ratio });
    }
  }

  return spikes;
}

// ---- Merge Adjacent/Overlapping Spikes ----
// Merges spike windows that are adjacent or within mergeGapSeconds of each other
function mergeSpikeWindows(
  spikeWindows: Array<{ windowStart: number; count: number; ratio: number }>,
  windowSeconds: number,
  config: ChatAnalyzerConfig
): ChatSpike[] {
  if (spikeWindows.length === 0) return [];

  const merged: ChatSpike[] = [];
  let currentSpike: {
    startWindow: number;
    endWindow: number;
    maxCount: number;
    maxRatio: number;
    totalMessages: number;
    windowCount: number;
  } = {
    startWindow: spikeWindows[0].windowStart,
    endWindow: spikeWindows[0].windowStart,
    maxCount: spikeWindows[0].count,
    maxRatio: spikeWindows[0].ratio,
    totalMessages: spikeWindows[0].count,
    windowCount: 1,
  };

  for (let i = 1; i < spikeWindows.length; i++) {
    const spike = spikeWindows[i];
    const gapFromCurrentEnd = spike.windowStart - (currentSpike.endWindow + windowSeconds);

    if (gapFromCurrentEnd <= config.mergeGapSeconds) {
      // Merge: this spike is adjacent or within the gap threshold
      currentSpike.endWindow = spike.windowStart;
      currentSpike.maxCount = Math.max(currentSpike.maxCount, spike.count);
      currentSpike.maxRatio = Math.max(currentSpike.maxRatio, spike.ratio);
      currentSpike.totalMessages += spike.count;
      currentSpike.windowCount++;
    } else {
      // End current spike and start a new one
      const startTime = currentSpike.startWindow;
      const endTime = currentSpike.endWindow + windowSeconds;
      const duration = endTime - startTime;

      if (duration >= config.minSpikeDurationSec) {
        // Normalize intensity to 0-1 scale
        // 1.0 = 10x baseline (extremely intense)
        const spikeIntensity = Math.min(1, currentSpike.maxRatio / 10);

        merged.push({
          startTime,
          endTime,
          spikeIntensity,
          messageCount: currentSpike.totalMessages,
        });
      }

      currentSpike = {
        startWindow: spike.windowStart,
        endWindow: spike.windowStart,
        maxCount: spike.count,
        maxRatio: spike.ratio,
        totalMessages: spike.count,
        windowCount: 1,
      };
    }
  }

  // Don't forget the last spike
  const startTime = currentSpike.startWindow;
  const endTime = currentSpike.endWindow + windowSeconds;
  const duration = endTime - startTime;

  if (duration >= config.minSpikeDurationSec) {
    const spikeIntensity = Math.min(1, currentSpike.maxRatio / 10);
    merged.push({
      startTime,
      endTime,
      spikeIntensity,
      messageCount: currentSpike.totalMessages,
    });
  }

  return merged;
}

// ---- Main Analysis Function ----
export async function analyzeChat(
  chatLogR2Key: string,
  job: Job<HighlightJobPayload>,
  config: Partial<ChatAnalyzerConfig> = {}
): Promise<ChatSpike[]> {
  const fullConfig: ChatAnalyzerConfig = { ...DEFAULT_CONFIG, ...config };

  console.log(`[Chat Analyzer] Starting chat analysis for: ${chatLogR2Key}`);
  console.log(
    `[Chat Analyzer] Config: window=${fullConfig.windowSeconds}s, multiplier=${fullConfig.spikeMultiplier}x, minMessages=${fullConfig.minMessages}`
  );

  // Step 1: Load and parse chat log
  const messages = await loadChatLog(chatLogR2Key);

  if (messages.length === 0) {
    console.log('[Chat Analyzer] No chat messages found, skipping chat analysis');
    return [];
  }

  await job.updateProgress(10);

  // Step 2: Handle edge case - very short streams
  if (messages.length < fullConfig.minMessages) {
    console.log(
      `[Chat Analyzer] Only ${messages.length} messages (below minimum ${fullConfig.minMessages}), skipping`
    );
    return [];
  }

  // Step 3: Compute message counts per window
  const windowCounts = computeWindowCounts(messages, fullConfig.windowSeconds);
  await job.updateProgress(20);

  // Step 4: Compute baseline (median message rate)
  const baseline = computeBaseline(windowCounts);
  const totalWindows = windowCounts.size;
  const avgMessagesPerWindow = messages.length / Math.max(totalWindows, 1);

  console.log(
    `[Chat Analyzer] Baseline: ${baseline.toFixed(1)} msg/window (median), ` +
    `${avgMessagesPerWindow.toFixed(1)} msg/window (mean), ` +
    `${totalWindows} windows of ${fullConfig.windowSeconds}s`
  );

  await job.updateProgress(30);

  // Step 5: Detect spike windows
  const spikeWindows = detectSpikeWindows(windowCounts, baseline, fullConfig);
  console.log(`[Chat Analyzer] Detected ${spikeWindows.length} spike windows`);

  await job.updateProgress(50);

  // Step 6: Merge adjacent/overlapping spikes
  const mergedSpikes = mergeSpikeWindows(spikeWindows, fullConfig.windowSeconds, fullConfig);
  console.log(`[Chat Analyzer] After merging: ${mergedSpikes.length} chat spikes`);

  await job.updateProgress(60);

  // Log spike details
  for (const spike of mergedSpikes) {
    const duration = spike.endTime - spike.startTime;
    console.log(
      `[Chat Analyzer] Spike: ${spike.startTime.toFixed(0)}s - ${spike.endTime.toFixed(0)}s ` +
      `(${duration.toFixed(0)}s, intensity=${spike.spikeIntensity.toFixed(2)}, messages=${spike.messageCount})`
    );
  }

  return mergedSpikes;
}

// ---- Utility: Analyze chat from a local file (for testing) ----
export function analyzeChatFromMessages(
  messages: ChatMessage[],
  config: Partial<ChatAnalyzerConfig> = {}
): ChatSpike[] {
  const fullConfig: ChatAnalyzerConfig = { ...DEFAULT_CONFIG, ...config };

  if (messages.length < fullConfig.minMessages) return [];

  const windowCounts = computeWindowCounts(messages, fullConfig.windowSeconds);
  const baseline = computeBaseline(windowCounts);
  const spikeWindows = detectSpikeWindows(windowCounts, baseline, fullConfig);
  return mergeSpikeWindows(spikeWindows, fullConfig.windowSeconds, fullConfig);
}

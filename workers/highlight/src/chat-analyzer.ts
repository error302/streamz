// ============================================
// StreamZ - Chat Spike Detection Algorithm
// ============================================
// Analyzes IRC chat logs to detect message spikes that indicate
// exciting moments during a live stream.

import type { Job } from 'bullmq';
import type { HighlightJobPayload } from '@streamz/shared';
import { HIGHLIGHT_THRESHOLDS } from '@streamz/shared';

interface ChatMessage {
  timestamp: number; // Unix timestamp in seconds
  username: string;
  message: string;
}

interface ChatSpike {
  startTime: number;
  endTime: number;
  spikeIntensity: number;
  messageCount: number;
}

// ---- Chat Log Parser ----
// Reads JSONL chat log from S3 and parses into ChatMessage array
async function loadChatLog(chatLogR2Key: string): Promise<ChatMessage[]> {
  // TODO: Download and parse chat log from S3
  // const { downloadFile } = await import('@streamz/storage');
  // const chatBuffer = await downloadFile(chatLogR2Key);
  // const lines = chatBuffer.toString('utf-8').split('\n').filter(Boolean);
  // return lines.map((line) => JSON.parse(line));

  console.log(`[Chat Analyzer] Loading chat log from: ${chatLogR2Key} (placeholder)`);
  return [];
}

// ---- Rolling Average Calculator ----
function calculateRollingAverage(
  messages: ChatMessage[],
  windowSeconds: number
): Map<number, number> {
  const messageCounts = new Map<number, number>();

  // Bucket messages by window
  for (const msg of messages) {
    const bucket = Math.floor(msg.timestamp / windowSeconds) * windowSeconds;
    messageCounts.set(bucket, (messageCounts.get(bucket) || 0) + 1);
  }

  return messageCounts;
}

// ---- Spike Detection Algorithm ----
// Uses a sliding window approach to detect chat message spikes:
// 1. Calculate message rate in rolling windows
// 2. Compare each window to the running average
// 3. Flag windows where message rate exceeds THRESHOLD * average
export async function analyzeChat(
  chatLogR2Key: string,
  job: Job<HighlightJobPayload>
): Promise<ChatSpike[]> {
  console.log(`[Chat Analyzer] Starting chat analysis for: ${chatLogR2Key}`);

  const messages = await loadChatLog(chatLogR2Key);
  if (messages.length === 0) {
    console.log('[Chat Analyzer] No chat messages found, skipping chat analysis');
    return [];
  }

  await job.updateProgress(15);

  const windowSeconds = HIGHLIGHT_THRESHOLDS.CHAT_WINDOW_SECONDS;
  const spikeMultiplier = HIGHLIGHT_THRESHOLDS.CHAT_SPIKE_MULTIPLIER;
  const minMessages = HIGHLIGHT_THRESHOLDS.CHAT_SPIKE_MIN_MESSAGES;

  // Calculate rolling message counts
  const bucketCounts = calculateRollingAverage(messages, windowSeconds);

  // Calculate overall average message rate
  const buckets = Array.from(bucketCounts.values());
  const averageRate = buckets.length > 0
    ? buckets.reduce((sum, count) => sum + count, 0) / buckets.length
    : 0;

  console.log(
    `[Chat Analyzer] Average chat rate: ${averageRate.toFixed(1)} messages per ${windowSeconds}s window`
  );

  // Detect spikes
  const spikes: ChatSpike[] = [];
  const sortedBuckets = Array.from(bucketCounts.entries()).sort((a, b) => a[0] - b[0]);

  let currentSpike: { startBucket: number; endBucket: number; maxCount: number; totalMessages: number } | null = null;

  for (const [bucketTime, count] of sortedBuckets) {
    const isSpike = count >= averageRate * spikeMultiplier && count >= minMessages;

    if (isSpike) {
      if (!currentSpike) {
        currentSpike = { startBucket: bucketTime, endBucket: bucketTime, maxCount: count, totalMessages: count };
      } else {
        currentSpike.endBucket = bucketTime;
        currentSpike.maxCount = Math.max(currentSpike.maxCount, count);
        currentSpike.totalMessages += count;
      }
    } else if (currentSpike) {
      // Spike ended, record it
      // Normalize spike intensity (0-1 scale, 1 = 10x average)
      const spikeIntensity = Math.min(1, (currentSpike.maxCount / Math.max(averageRate, 1)) / 10);

      spikes.push({
        startTime: currentSpike.startBucket,
        endTime: currentSpike.endBucket + windowSeconds,
        spikeIntensity,
        messageCount: currentSpike.totalMessages,
      });

      currentSpike = null;
    }
  }

  // Don't forget the last spike
  if (currentSpike) {
    const spikeIntensity = Math.min(1, (currentSpike.maxCount / Math.max(averageRate, 1)) / 10);
    spikes.push({
      startTime: currentSpike.startBucket,
      endTime: currentSpike.endBucket + windowSeconds,
      spikeIntensity,
      messageCount: currentSpike.totalMessages,
    });
  }

  console.log(`[Chat Analyzer] Detected ${spikes.length} chat spikes`);
  return spikes;
}

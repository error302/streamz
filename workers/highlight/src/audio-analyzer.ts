// ============================================
// StreamZ - Audio Energy Analysis
// ============================================
// Analyzes audio energy levels from stream VOD to detect
// exciting moments (loud reactions, intense gameplay audio).
//
// Algorithm:
// 1. Download VOD from R2/MinIO to temp directory
// 2. Use FFmpeg to extract audio as WAV (or raw PCM)
// 3. Compute RMS energy per 1-second window
// 4. Compute rolling baseline (median energy)
// 5. Flag windows where energy > 2.0x baseline
// 6. Return array of { startTime, endTime, energyScore } objects

import { spawn } from 'child_process';
import { mkdir, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Job } from 'bullmq';
import type { HighlightJobPayload } from '@streamz/shared';
import { HIGHLIGHT_THRESHOLDS } from '@streamz/shared';
import { downloadToPath as downloadFileToPath } from './storage.js';

// ---- Types ----

export interface AudioEnergySegment {
  startTime: number;
  endTime: number;
  energyScore: number; // Normalized 0-1
}

export interface AudioAnalyzerConfig {
  windowSeconds: number;        // RMS energy window size (default: 1)
  energyMultiplier: number;     // How many times above baseline to flag (default: 2.0)
  minSegmentDurationSec: number; // Minimum duration for a high-energy segment
  mergeGapSec: number;         // Merge segments within this gap
  smoothingWindow: number;     // Moving average window size for smoothing
}

const DEFAULT_CONFIG: AudioAnalyzerConfig = {
  windowSeconds: 1,
  energyMultiplier: 2.0,
  minSegmentDurationSec: HIGHLIGHT_THRESHOLDS.MIN_HIGHLIGHT_DURATION_SEC,
  mergeGapSec: 10,
  smoothingWindow: 5,
};

// ---- Extract Audio Energy via FFmpeg ----
// Uses FFmpeg's ebur128 filter for loudness measurement or
// volumedetect for per-segment analysis.
// Returns an array of RMS energy values, one per second.
async function extractAudioEnergyPerSecond(
  vodPath: string
): Promise<Float32Array> {
  console.log(`[Audio Analyzer] Extracting audio energy from: ${vodPath}`);

  return new Promise((resolve, reject) => {
    // Use FFmpeg's silencedetect filter to find loud segments
    // and ebur128 for precise loudness measurement
    //
    // Strategy: Extract audio as raw PCM, then compute RMS per second
    // FFmpeg command: ffmpeg -i input.mp4 -f s16le -ac 1 -ar 16000 pipe:1
    // This outputs raw 16-bit PCM at 16kHz mono

    const args = [
      '-i', vodPath,
      '-vn',                    // No video
      '-f', 's16le',            // Raw PCM signed 16-bit little-endian
      '-ac', '1',               // Mono
      '-ar', '16000',           // 16kHz sample rate
      '-acodec', 'pcm_s16le',
      'pipe:1',                 // Output to stdout
    ];

    const proc = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const chunks: Buffer[] = [];
    let stderrOutput = '';

    proc.stdout?.on('data', (data: Buffer) => {
      chunks.push(data);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      // FFmpeg writes progress info to stderr
      stderrOutput += data.toString('utf-8');
    });

    proc.on('close', (code) => {
      if (code !== 0 && code !== null) {
        console.warn(`[Audio Analyzer] FFmpeg exited with code ${code}: ${stderrOutput.slice(-200)}`);
        // If FFmpeg fails, return empty - the analysis will be skipped
        resolve(new Float32Array(0));
        return;
      }

      try {
        // Combine all chunks into a single buffer
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const pcmBuffer = Buffer.concat(chunks, totalLength);

        console.log(`[Audio Analyzer] Received ${pcmBuffer.length} bytes of PCM data`);

        // Parse raw PCM data (16-bit signed integers)
        const sampleRate = 16000;
        const bytesPerSample = 2; // 16-bit
        const samplesPerSecond = sampleRate;
        const bytesPerSecond = samplesPerSecond * bytesPerSample;

        const totalSeconds = Math.floor(pcmBuffer.length / bytesPerSecond);
        const energyPerSecond = new Float32Array(totalSeconds);

        for (let sec = 0; sec < totalSeconds; sec++) {
          const offset = sec * bytesPerSecond;
          const endOffset = Math.min(offset + bytesPerSecond, pcmBuffer.length);

          // Compute RMS (Root Mean Square) energy for this second
          let sumSquares = 0;
          let sampleCount = 0;

          for (let i = offset; i < endOffset; i += bytesPerSample) {
            // Read 16-bit signed integer
            const sample = pcmBuffer.readInt16LE(i);
            // Normalize to -1.0 to 1.0
            const normalized = sample / 32768.0;
            sumSquares += normalized * normalized;
            sampleCount++;
          }

          const rms = sampleCount > 0 ? Math.sqrt(sumSquares / sampleCount) : 0;
          energyPerSecond[sec] = rms;
        }

        console.log(
          `[Audio Analyzer] Computed RMS energy for ${totalSeconds} seconds. ` +
          `Mean energy: ${computeMean(energyPerSecond).toFixed(6)}`
        );

        resolve(energyPerSecond);
      } catch (err) {
        console.error(`[Audio Analyzer] Error processing PCM data:`, err);
        resolve(new Float32Array(0));
      }
    });

    proc.on('error', (err) => {
      console.error(`[Audio Analyzer] FFmpeg spawn error:`, err);
      resolve(new Float32Array(0));
    });
  });
}

// ---- Compute Mean ----
function computeMean(arr: Float32Array): number {
  if (arr.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum / arr.length;
}

// ---- Compute Median ----
function computeMedian(arr: Float32Array): number {
  if (arr.length === 0) return 0;

  const sorted = Array.from(arr).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ---- Energy Smoothing ----
// Apply a moving average to smooth out frame-level energy fluctuations
function smoothEnergy(energy: Float32Array, windowSize: number = 5): Float32Array {
  const smoothed = new Float32Array(energy.length);
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < energy.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(energy.length, i + halfWindow + 1);
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += energy[j];
    }
    smoothed[i] = sum / (end - start);
  }

  return smoothed;
}

// ---- Normalize Energy to 0-1 Scale ----
// Uses the baseline (median) as reference. Energy above baseline
// gets a higher score; energy at or below baseline gets a lower score.
function normalizeEnergy(
  energy: Float32Array,
  baseline: number
): Float32Array {
  const normalized = new Float32Array(energy.length);

  for (let i = 0; i < energy.length; i++) {
    if (baseline === 0) {
      // If baseline is zero (silent stream), use absolute value
      normalized[i] = Math.min(1, energy[i] * 100); // Scale up tiny values
    } else {
      // Ratio to baseline, capped at 1.0
      normalized[i] = Math.min(1, energy[i] / (baseline * 5)); // 5x baseline = score of 1.0
    }
  }

  return normalized;
}

// ---- Peak Detection ----
// Detects segments where normalized energy exceeds the threshold
function detectEnergyPeaks(
  normalizedEnergy: Float32Array,
  threshold: number,
  minDurationSec: number,
  config: AudioAnalyzerConfig
): AudioEnergySegment[] {
  const segments: AudioEnergySegment[] = [];
  let inSegment = false;
  let segmentStart = 0;
  let segmentMax = 0;

  for (let i = 0; i < normalizedEnergy.length; i++) {
    if (normalizedEnergy[i] >= threshold) {
      if (!inSegment) {
        inSegment = true;
        segmentStart = i;
        segmentMax = normalizedEnergy[i];
      } else {
        segmentMax = Math.max(segmentMax, normalizedEnergy[i]);
      }
    } else if (inSegment) {
      const segmentDuration = i - segmentStart;
      if (segmentDuration >= minDurationSec) {
        segments.push({
          startTime: segmentStart,
          endTime: i,
          energyScore: segmentMax,
        });
      }
      inSegment = false;
      segmentMax = 0;
    }
  }

  // Handle segment that extends to end
  if (inSegment) {
    const segmentDuration = normalizedEnergy.length - segmentStart;
    if (segmentDuration >= minDurationSec) {
      segments.push({
        startTime: segmentStart,
        endTime: normalizedEnergy.length,
        energyScore: segmentMax,
      });
    }
  }

  return segments;
}

// ---- Merge Adjacent Peaks ----
function mergeAdjacentPeaks(
  peaks: AudioEnergySegment[],
  gapThresholdSec: number
): AudioEnergySegment[] {
  if (peaks.length === 0) return [];

  const sorted = [...peaks].sort((a, b) => a.startTime - b.startTime);
  const merged: AudioEnergySegment[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];

    if (current.startTime - last.endTime <= gapThresholdSec) {
      // Merge
      last.endTime = current.endTime;
      last.energyScore = Math.max(last.energyScore, current.energyScore);
    } else {
      merged.push({ ...current });
    }
  }

  return merged;
}

// ---- Main Analysis Function ----
export async function analyzeAudio(
  vodR2Key: string,
  job: Job<HighlightJobPayload>,
  config: Partial<AudioAnalyzerConfig> = {}
): Promise<AudioEnergySegment[]> {
  const fullConfig: AudioAnalyzerConfig = { ...DEFAULT_CONFIG, ...config };

  console.log(`[Audio Analyzer] Starting audio analysis for: ${vodR2Key}`);
  console.log(
    `[Audio Analyzer] Config: window=${fullConfig.windowSeconds}s, multiplier=${fullConfig.energyMultiplier}x, minDuration=${fullConfig.minSegmentDurationSec}s`
  );

  // Step 1: Download VOD to temp directory
  const tempDir = `/tmp/streamz_audio_${Date.now()}`;
  await mkdir(tempDir, { recursive: true });
  const vodTempPath = join(tempDir, 'vod.mp4');

  try {
    console.log(`[Audio Analyzer] Downloading VOD from R2: ${vodR2Key}`);
    await downloadFileToPath(vodR2Key, vodTempPath);

    const fileStats = await stat(vodTempPath);
    console.log(`[Audio Analyzer] VOD downloaded: ${(fileStats.size / 1024 / 1024).toFixed(1)} MB`);

    await job.updateProgress(20);
  } catch (error) {
    console.error(`[Audio Analyzer] Failed to download VOD: ${error}`);
    // Cleanup
    try {
      if (existsSync(vodTempPath)) await unlink(vodTempPath);
    } catch { /* ignore */ }
    return [];
  }

  // Step 2: Extract audio energy per second
  let rawEnergy: Float32Array;
  try {
    rawEnergy = await extractAudioEnergyPerSecond(vodTempPath);
  } catch (error) {
    console.error(`[Audio Analyzer] Audio extraction failed: ${error}`);
    rawEnergy = new Float32Array(0);
  }

  await job.updateProgress(40);

  if (rawEnergy.length === 0) {
    console.log('[Audio Analyzer] No audio data available, skipping audio analysis');

    // Cleanup temp files
    try {
      if (existsSync(vodTempPath)) await unlink(vodTempPath);
    } catch { /* ignore */ }

    return [];
  }

  // Step 3: Compute baseline (median energy)
  const baseline = computeMedian(rawEnergy);
  const mean = computeMean(rawEnergy);
  console.log(
    `[Audio Analyzer] Energy baseline: median=${baseline.toFixed(6)}, mean=${mean.toFixed(6)}`
  );

  // Handle edge case: constant-volume or silent streams
  const energyVariance = computeMean(
    new Float32Array(rawEnergy.map((e) => (e - mean) ** 2))
  );
  const standardDeviation = Math.sqrt(energyVariance);

  if (standardDeviation < 0.001) {
    console.log('[Audio Analyzer] Stream has near-constant audio volume, no peaks detectable');

    // Cleanup temp files
    try {
      if (existsSync(vodTempPath)) await unlink(vodTempPath);
    } catch { /* ignore */ }

    return [];
  }

  await job.updateProgress(50);

  // Step 4: Smooth the energy curve
  const smoothedEnergy = smoothEnergy(rawEnergy, fullConfig.smoothingWindow);
  await job.updateProgress(55);

  // Step 5: Normalize energy to 0-1 scale
  const normalizedEnergy = normalizeEnergy(smoothedEnergy, baseline);
  await job.updateProgress(60);

  // Step 6: Compute adaptive threshold
  // If the constant threshold is too high for this stream, use a lower one
  const threshold = Math.min(
    HIGHLIGHT_THRESHOLDS.AUDIO_ENERGY_THRESHOLD,
    baseline * fullConfig.energyMultiplier / (baseline * 5) // Normalize the multiplier to our scale
  );

  console.log(`[Audio Analyzer] Using threshold: ${threshold.toFixed(3)} (base=${HIGHLIGHT_THRESHOLDS.AUDIO_ENERGY_THRESHOLD})`);

  // Step 7: Detect energy peaks
  const peaks = detectEnergyPeaks(normalizedEnergy, threshold, fullConfig.minSegmentDurationSec, fullConfig);
  console.log(`[Audio Analyzer] Detected ${peaks.length} raw audio energy peaks`);

  await job.updateProgress(75);

  // Step 8: Merge adjacent peaks
  const mergedPeaks = mergeAdjacentPeaks(peaks, fullConfig.mergeGapSec);
  console.log(`[Audio Analyzer] After merging: ${mergedPeaks.length} audio highlights`);

  await job.updateProgress(85);

  // Log peak details
  for (const peak of mergedPeaks) {
    const duration = peak.endTime - peak.startTime;
    console.log(
      `[Audio Analyzer] Peak: ${peak.startTime.toFixed(0)}s - ${peak.endTime.toFixed(0)}s ` +
      `(${duration.toFixed(0)}s, score=${peak.energyScore.toFixed(3)})`
    );
  }

  // Cleanup temp files
  try {
    if (existsSync(vodTempPath)) await unlink(vodTempPath);
  } catch { /* ignore */ }

  await job.updateProgress(90);

  return mergedPeaks;
}

// ---- Utility: Analyze audio from raw energy data (for testing) ----
export function analyzeAudioFromEnergy(
  rawEnergy: Float32Array,
  config: Partial<AudioAnalyzerConfig> = {}
): AudioEnergySegment[] {
  const fullConfig: AudioAnalyzerConfig = { ...DEFAULT_CONFIG, ...config };

  if (rawEnergy.length === 0) return [];

  const baseline = computeMedian(rawEnergy);
  const mean = computeMean(rawEnergy);
  const energyVariance = computeMean(
    new Float32Array(rawEnergy.map((e) => (e - mean) ** 2))
  );

  if (Math.sqrt(energyVariance) < 0.001) return [];

  const smoothedEnergy = smoothEnergy(rawEnergy, fullConfig.smoothingWindow);
  const normalizedEnergy = normalizeEnergy(smoothedEnergy, baseline);
  const threshold = Math.min(
    HIGHLIGHT_THRESHOLDS.AUDIO_ENERGY_THRESHOLD,
    baseline * fullConfig.energyMultiplier / (baseline * 5)
  );

  const peaks = detectEnergyPeaks(normalizedEnergy, threshold, fullConfig.minSegmentDurationSec, fullConfig);
  return mergeAdjacentPeaks(peaks, fullConfig.mergeGapSec);
}

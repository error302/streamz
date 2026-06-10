// ============================================
// StreamZ - Audio Energy Analysis
// ============================================
// Analyzes audio energy levels from stream VOD to detect
// exciting moments (loud reactions, intense gameplay audio).

import type { Job } from 'bullmq';
import type { HighlightJobPayload } from '@streamz/shared';
import { HIGHLIGHT_THRESHOLDS } from '@streamz/shared';

interface AudioEnergySegment {
  startTime: number;
  endTime: number;
  energyScore: number; // Normalized 0-1
}

// ---- Audio Energy Extraction via FFmpeg ----
// Uses FFmpeg's ebur128 filter to extract loudness measurements
async function extractAudioEnergy(vodR2Key: string): Promise<Float32Array> {
  // TODO: Download VOD from S3 or stream directly
  // TODO: Use FFmpeg to extract audio energy per-second
  //
  // Command: ffmpeg -i {input} -filter_complex "ebur128=framelog=verbose" -f null -
  // Parse the output to get momentary loudness values
  //
  // Alternative: Use FFmpeg's volumedetect filter per segment
  // Or use a WebAudio-like approach with raw PCM data

  console.log(`[Audio Analyzer] Extracting audio energy from: ${vodR2Key} (placeholder)`);

  // Return empty array as placeholder
  return new Float32Array(0);
}

// ---- Energy Smoothing ----
// Apply a moving average to smooth out frame-level energy fluctuations
function smoothEnergy(energy: Float32Array, windowSize: number = 5): Float32Array {
  const smoothed = new Float32Array(energy.length);
  for (let i = 0; i < energy.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(energy.length, i + Math.ceil(windowSize / 2));
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += energy[j];
    }
    smoothed[i] = sum / (end - start);
  }
  return smoothed;
}

// ---- Peak Detection ----
// Detects peaks in audio energy that exceed the threshold
function detectEnergyPeaks(
  energy: Float32Array,
  threshold: number,
  minDurationSec: number = 10,
  sampleRate: number = 1 // 1 sample per second
): AudioEnergySegment[] {
  const segments: AudioEnergySegment[] = [];
  let inSegment = false;
  let segmentStart = 0;
  let segmentMax = 0;

  for (let i = 0; i < energy.length; i++) {
    if (energy[i] >= threshold) {
      if (!inSegment) {
        inSegment = true;
        segmentStart = i;
        segmentMax = energy[i];
      } else {
        segmentMax = Math.max(segmentMax, energy[i]);
      }
    } else if (inSegment) {
      const segmentDuration = (i - segmentStart) / sampleRate;
      if (segmentDuration >= minDurationSec) {
        segments.push({
          startTime: segmentStart / sampleRate,
          endTime: i / sampleRate,
          energyScore: segmentMax,
        });
      }
      inSegment = false;
      segmentMax = 0;
    }
  }

  // Handle segment that extends to end
  if (inSegment) {
    const segmentDuration = (energy.length - segmentStart) / sampleRate;
    if (segmentDuration >= minDurationSec) {
      segments.push({
        startTime: segmentStart / sampleRate,
        endTime: energy.length / sampleRate,
        energyScore: segmentMax,
      });
    }
  }

  return segments;
}

// ---- Main Analysis Function ----
export async function analyzeAudio(
  vodR2Key: string,
  job: Job<HighlightJobPayload>
): Promise<AudioEnergySegment[]> {
  console.log(`[Audio Analyzer] Starting audio analysis for: ${vodR2Key}`);

  // Extract raw audio energy
  const rawEnergy = await extractAudioEnergy(vodR2Key);

  await job.updateProgress(40);

  if (rawEnergy.length === 0) {
    console.log('[Audio Analyzer] No audio data available, skipping audio analysis');
    return [];
  }

  // Smooth the energy curve
  const smoothedEnergy = smoothEnergy(rawEnergy, 5);

  await job.updateProgress(50);

  // Detect peaks above threshold
  const threshold = HIGHLIGHT_THRESHOLDS.AUDIO_ENERGY_THRESHOLD;
  const minDuration = HIGHLIGHT_THRESHOLDS.MIN_HIGHLIGHT_DURATION_SEC;

  const peaks = detectEnergyPeaks(smoothedEnergy, threshold, minDuration);

  console.log(`[Audio Analyzer] Detected ${peaks.length} audio energy peaks`);

  // Merge overlapping or adjacent peaks (within 10 seconds)
  const mergedPeaks = mergeAdjacentPeaks(peaks, 10);

  console.log(`[Audio Analyzer] After merging: ${mergedPeaks.length} audio highlights`);

  return mergedPeaks;
}

// ---- Peak Merging ----
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

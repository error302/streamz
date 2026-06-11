// ============================================
// StreamZ - Clip Extraction (FFmpeg)
// ============================================
// Extracts highlight clips from the full VOD using FFmpeg.
// Handles different clip types and uploads to S3-compatible storage.
// Supports multiple output formats: full resolution for YouTube,
// vertical crop for Shorts/Reels.

import { spawn } from 'child_process';
import { mkdir, readFile, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Job } from 'bullmq';
import type { HighlightJobPayload, ClipType } from '@streamz/shared';
import { R2_PATHS, CLIP_DURATION, PLATFORM_SPECS } from '@streamz/shared';
import { uploadFile, downloadToPath as downloadFileToPath } from './storage.js';
import type { SceneChange } from './scene-detector.js';

// ---- Types ----

export interface HighlightCandidate {
  startTime: number;
  endTime: number;
  highlightScore: number;
  chatSpikeIntensity: number;
  audioEnergyScore: number;
  sceneChangeScore?: number;
  clipType: ClipType;
  clipR2Key: string;
}

export interface ExtractedHighlight extends HighlightCandidate {
  clipR2Key: string;
  clipDuration: number;
  fileSize: number;
}

// ---- FFmpeg Command Execution ----
function runFFmpeg(args: string[], timeoutMs: number = 300000): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[Clip Extractor] Running FFmpeg: ffmpeg ${args.join(' ')}`);

    const proc = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderrOutput = '';

    proc.stdout?.on('data', (data: Buffer) => {
      // FFmpeg writes progress to stderr, not stdout
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const output = data.toString('utf-8');
      stderrOutput += output;

      // Log progress periodically
      if (output.includes('time=')) {
        const timeMatch = output.match(/time=(\d+:\d+:\d+\.\d+)/);
        if (timeMatch) {
          // Only log every few progress updates to avoid spam
        }
      }
    });

    // Set timeout
    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`FFmpeg timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on('close', (code) => {
      clearTimeout(timeout);

      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderrOutput.slice(-500)}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}

// ---- Extract Clip (Full Resolution / Landscape 16:9) ----
async function extractLandscapeClip(
  vodPath: string,
  outputPath: string,
  startTime: number,
  duration: number
): Promise<void> {
  const args = [
    '-y',                          // Overwrite output
    '-ss', startTime.toFixed(3),   // Seek to start time
    '-i', vodPath,                 // Input file
    '-t', duration.toFixed(3),     // Duration to extract
    '-c:v', 'libx264',             // Video codec
    '-preset', 'fast',             // Encoding speed preset
    '-crf', '23',                  // Constant Rate Factor (quality)
    '-c:a', 'aac',                 // Audio codec
    '-b:a', '128k',                // Audio bitrate
    '-movflags', '+faststart',     // Enable fast start for web playback
    '-avoid_negative_ts', 'make_zero',
    outputPath,
  ];

  await runFFmpeg(args);
}

// ---- Extract Clip (Vertical / Portrait 9:16) ----
// Crops and scales the video for Shorts/Reels/TikTok
async function extractVerticalClip(
  vodPath: string,
  outputPath: string,
  startTime: number,
  duration: number
): Promise<void> {
  // Crop the center portion of the video to 9:16 aspect ratio
  // and scale to 1080x1920
  const cropFilter = 'crop=ih*9/16:ih,scale=1080:1920';

  const args = [
    '-y',                          // Overwrite output
    '-ss', startTime.toFixed(3),   // Seek to start time
    '-i', vodPath,                 // Input file
    '-t', duration.toFixed(3),     // Duration to extract
    '-vf', cropFilter,             // Video filter for crop + scale
    '-c:v', 'libx264',             // Video codec
    '-preset', 'fast',             // Encoding speed preset
    '-crf', '23',                  // Constant Rate Factor (quality)
    '-c:a', 'aac',                 // Audio codec
    '-b:a', '128k',                // Audio bitrate
    '-movflags', '+faststart',     // Enable fast start for web playback
    '-avoid_negative_ts', 'make_zero',
    outputPath,
  ];

  await runFFmpeg(args);
}

// ---- Download VOD for Clip Extraction ----
// Downloads the full VOD or a segment for processing
async function downloadVodForExtraction(vodR2Key: string, tempDir: string): Promise<string> {
  const vodPath = join(tempDir, 'source_vod.mp4');

  if (existsSync(vodPath)) {
    console.log(`[Clip Extractor] VOD already downloaded: ${vodPath}`);
    return vodPath;
  }

  console.log(`[Clip Extractor] Downloading VOD from R2: ${vodR2Key}`);
  await downloadFileToPath(vodR2Key, vodPath);

  const fileStats = await stat(vodPath);
  console.log(`[Clip Extractor] VOD downloaded: ${(fileStats.size / 1024 / 1024).toFixed(1)} MB`);

  return vodPath;
}

// ---- Generate Thumbnail ----
async function generateThumbnail(
  vodPath: string,
  outputPath: string,
  timestamp: number
): Promise<void> {
  const args = [
    '-y',
    '-ss', timestamp.toFixed(3),
    '-i', vodPath,
    '-vframes', '1',
    '-q:v', '2',                  // High quality JPEG
    '-vf', 'scale=1280:-1',       // Scale width to 1280, keep aspect ratio
    outputPath,
  ];

  try {
    await runFFmpeg(args, 30000); // 30s timeout for thumbnail
  } catch (err) {
    console.warn(`[Clip Extractor] Thumbnail generation failed (non-fatal): ${err}`);
  }
}

// ---- Smart Clip Boundary Adjustment (Phase 4) ----
// Adjusts clip boundaries to snap to the nearest scene change,
// avoiding cutting mid-action. This results in more natural-looking
// clips that start/end at meaningful visual transitions.

export function adjustBoundariesToSceneChanges(
  startTime: number,
  endTime: number,
  sceneChanges: SceneChange[],
  paddingSeconds: number = 3
): { startTime: number; endTime: number } {
  if (sceneChanges.length === 0) {
    return { startTime, endTime };
  }

  let adjustedStart = startTime;
  let adjustedEnd = endTime;

  // Find the nearest scene change before or at the start time (within padding)
  let bestStart: SceneChange | null = null;
  let bestStartDist = Infinity;

  for (const sc of sceneChanges) {
    // Scene change should be at or before the start time, but within padding
    if (sc.timestamp <= startTime && (startTime - sc.timestamp) <= paddingSeconds) {
      const dist = startTime - sc.timestamp;
      if (dist < bestStartDist) {
        bestStartDist = dist;
        bestStart = sc;
      }
    }
  }

  // Find the nearest scene change at or after the end time (within padding)
  let bestEnd: SceneChange | null = null;
  let bestEndDist = Infinity;

  for (const sc of sceneChanges) {
    // Scene change should be at or after the end time, but within padding
    if (sc.timestamp >= endTime && (sc.timestamp - endTime) <= paddingSeconds) {
      const dist = sc.timestamp - endTime;
      if (dist < bestEndDist) {
        bestEndDist = dist;
        bestEnd = sc;
      }
    }
  }

  // Apply adjustments if found
  if (bestStart) {
    adjustedStart = bestStart.timestamp;
  }

  if (bestEnd) {
    adjustedEnd = bestEnd.timestamp;
  }

  // Ensure we don't create a zero-length or negative clip
  if (adjustedEnd <= adjustedStart) {
    return { startTime, endTime };
  }

  // Log if adjustments were made
  if (adjustedStart !== startTime || adjustedEnd !== endTime) {
    console.log(
      `[Clip Extractor] Scene-aware boundary adjustment: ` +
      `${startTime.toFixed(1)}s→${adjustedStart.toFixed(1)}s, ` +
      `${endTime.toFixed(1)}s→${adjustedEnd.toFixed(1)}s`
    );
  }

  return { startTime: adjustedStart, endTime: adjustedEnd };
}

// ---- Main Clip Extraction Function ----
export async function extractClips(
  highlights: HighlightCandidate[],
  payload: HighlightJobPayload,
  job: Job<HighlightJobPayload>
): Promise<ExtractedHighlight[]> {
  console.log(
    `[Clip Extractor] Extracting ${highlights.length} clips from VOD: ${payload.vodR2Key}`
  );

  if (highlights.length === 0) {
    console.log('[Clip Extractor] No highlights to extract');
    return [];
  }

  // Create temp directory for this extraction session
  const tempDir = `/tmp/streamz_clips_${Date.now()}`;
  await mkdir(tempDir, { recursive: true });

  // Download the source VOD
  let vodPath: string;
  try {
    vodPath = await downloadVodForExtraction(payload.vodR2Key, tempDir);
  } catch (error) {
    console.error(`[Clip Extractor] Failed to download VOD for clip extraction: ${error}`);
    return [];
  }

  const extracted: ExtractedHighlight[] = [];

  for (let i = 0; i < highlights.length; i++) {
    const hl = highlights[i];
    const progress = 70 + Math.floor((i / highlights.length) * 20);
    await job.updateProgress(progress);

    try {
      const clipId = `hl_${payload.streamId}_${i}_${Date.now()}`;
      const clipR2Key = R2_PATHS.clip(clipId);
      const durationSpec = CLIP_DURATION[hl.clipType];

      // Calculate clip bounds with 15-second padding before/after peak
      const peakTime = (hl.startTime + hl.endTime) / 2; // Center of the highlight
      let clipStart = Math.max(0, peakTime - 15 - (hl.endTime - hl.startTime) / 2);
      let clipEnd = peakTime + 15 + (hl.endTime - hl.startTime) / 2;

      // Enforce maximum duration for clip type
      const rawDuration = clipEnd - clipStart;
      if (rawDuration > durationSpec.max) {
        // Center the clip around the peak
        const center = (clipStart + clipEnd) / 2;
        clipStart = center - durationSpec.max / 2;
        clipEnd = center + durationSpec.max / 2;

        // Ensure we don't go below 0
        if (clipStart < 0) {
          clipEnd -= clipStart;
          clipStart = 0;
        }
      }

      // Enforce minimum duration
      let clipDuration = clipEnd - clipStart;
      if (clipDuration < durationSpec.min) {
        clipDuration = durationSpec.min;
        clipEnd = clipStart + clipDuration;
      }

      console.log(
        `[Clip Extractor] Extracting ${hl.clipType} clip ${i + 1}/${highlights.length}: ` +
        `${clipStart.toFixed(1)}s - ${clipEnd.toFixed(1)}s (${clipDuration.toFixed(1)}s)`
      );

      // Extract landscape clip (16:9 for YouTube VOD)
      const landscapeClipPath = join(tempDir, `clip_${i}_landscape.mp4`);

      try {
        await extractLandscapeClip(vodPath, landscapeClipPath, clipStart, clipDuration);
      } catch (err) {
        console.error(`[Clip Extractor] Landscape clip extraction failed for clip ${i + 1}: ${err}`);
        continue; // Skip this clip
      }

      // Upload landscape clip to R2
      try {
        const clipBuffer = await readFile(landscapeClipPath);
        const fileSize = clipBuffer.length;
        console.log(
          `[Clip Extractor] Uploading clip: ${clipR2Key} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`
        );
        await uploadFile(clipR2Key, clipBuffer, 'video/mp4');

        // Generate and upload thumbnail
        const thumbnailR2Key = R2_PATHS.thumbnail(clipId);
        const thumbnailPath = join(tempDir, `thumb_${i}.jpg`);
        await generateThumbnail(vodPath, thumbnailPath, clipStart + clipDuration / 2);

        if (existsSync(thumbnailPath)) {
          try {
            const thumbBuffer = await readFile(thumbnailPath);
            await uploadFile(thumbnailR2Key, thumbBuffer, 'image/jpeg');
          } catch (thumbErr) {
            console.warn(`[Clip Extractor] Thumbnail upload failed (non-fatal): ${thumbErr}`);
          }
        }

        extracted.push({
          ...hl,
          clipR2Key,
          clipDuration,
          fileSize,
        });

        console.log(`[Clip Extractor] Clip ${i + 1}/${highlights.length} extracted: ${clipR2Key}`);

        // Also extract a vertical version for shorts/reels platforms
        const verticalClipR2Key = R2_PATHS.optimized(clipId, 'youtube_shorts');
        const verticalClipPath = join(tempDir, `clip_${i}_vertical.mp4`);

        try {
          await extractVerticalClip(vodPath, verticalClipPath, clipStart, Math.min(clipDuration, 60)); // Cap at 60s for vertical
          if (existsSync(verticalClipPath)) {
            const verticalBuffer = await readFile(verticalClipPath);
            await uploadFile(verticalClipR2Key, verticalBuffer, 'video/mp4');
            console.log(`[Clip Extractor] Vertical clip uploaded: ${verticalClipR2Key}`);
          }
        } catch (vertErr) {
          console.warn(`[Clip Extractor] Vertical clip extraction failed (non-fatal): ${vertErr}`);
        }
      } catch (uploadErr) {
        console.error(`[Clip Extractor] Clip upload failed for clip ${i + 1}: ${uploadErr}`);
        // Continue with other clips even if upload fails
      }

      // Clean up clip temp files (but keep the source VOD for other clips)
      try {
        if (existsSync(landscapeClipPath)) await unlink(landscapeClipPath);
      } catch { /* ignore */ }
    } catch (error) {
      console.error(`[Clip Extractor] Failed to extract clip ${i + 1}:`, error);
      // Continue with other clips even if one fails
    }
  }

  // Cleanup temp directory
  try {
    if (existsSync(vodPath)) await unlink(vodPath);
  } catch { /* ignore */ }

  console.log(
    `[Clip Extractor] Extracted ${extracted.length}/${highlights.length} clips successfully`
  );

  return extracted;
}

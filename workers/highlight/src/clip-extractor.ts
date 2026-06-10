// ============================================
// StreamZ - Clip Extraction (FFmpeg)
// ============================================
// Extracts highlight clips from the full VOD using FFmpeg.
// Handles different clip types and uploads to S3-compatible storage.

import type { Job } from 'bullmq';
import type { HighlightJobPayload } from '@streamz/shared';
import { R2_PATHS, CLIP_DURATION } from '@streamz/shared';

interface HighlightCandidate {
  startTime: number;
  endTime: number;
  highlightScore: number;
  chatSpikeIntensity: number;
  audioEnergyScore: number;
  clipType: 'short' | 'medium' | 'full';
  clipR2Key: string;
}

interface ExtractedHighlight extends HighlightCandidate {
  clipR2Key: string;
  clipDuration: number;
  fileSize: number;
}

// ---- Clip Extraction ----
export async function extractClips(
  highlights: HighlightCandidate[],
  payload: HighlightJobPayload,
  job: Job<HighlightJobPayload>
): Promise<ExtractedHighlight[]> {
  console.log(`[Clip Extractor] Extracting ${highlights.length} clips from VOD: ${payload.vodR2Key}`);

  const extracted: ExtractedHighlight[] = [];

  for (let i = 0; i < highlights.length; i++) {
    const hl = highlights[i];
    const progress = 70 + Math.floor((i / highlights.length) * 20);
    await job.updateProgress(progress);

    try {
      const clipR2Key = R2_PATHS.clip(`hl_${Date.now()}_${i}`);
      const durationSpec = CLIP_DURATION[hl.clipType];

      // Calculate clip bounds, respecting platform duration limits
      let clipStart = Math.max(0, hl.startTime - 5); // 5s padding before
      let clipEnd = hl.endTime + 5; // 5s padding after

      // Enforce maximum duration
      const rawDuration = clipEnd - clipStart;
      if (rawDuration > durationSpec.max) {
        clipEnd = clipStart + durationSpec.max;
      }

      const clipDuration = clipEnd - clipStart;

      console.log(
        `[Clip Extractor] Extracting ${hl.clipType} clip: ${clipStart}s - ${clipEnd}s (${clipDuration}s)`
      );

      // TODO: Download VOD segment or stream from S3
      // TODO: Execute FFmpeg command to extract clip
      //
      // const vodPath = await downloadVodSegment(payload.vodR2Key, clipStart, clipEnd);
      // const clipTempPath = `/tmp/clip_${i}.mp4`;
      //
      // FFmpeg command for clip extraction:
      // ffmpeg -ss {clipStart} -to {clipEnd} -i {vodPath} \
      //   -c:v libx264 -preset fast -crf 23 \
      //   -c:a aac -b:a 128k \
      //   -movflags +faststart \
      //   -y {clipTempPath}
      //
      // For vertical (9:16) platforms:
      // ffmpeg -ss {clipStart} -to {clipEnd} -i {vodPath} \
      //   -vf "crop=ih*9/16:ih,scale=1080:1920" \
      //   -c:v libx264 -preset fast -crf 23 \
      //   -c:a aac -b:a 128k \
      //   -movflags +faststart \
      //   -y {clipTempPath}

      // TODO: Upload clip to S3/R2
      // const clipBuffer = await fs.readFile(clipTempPath);
      // await uploadFile(clipR2Key, clipBuffer, 'video/mp4');

      // TODO: Clean up temp files

      extracted.push({
        ...hl,
        clipR2Key,
        clipDuration,
        fileSize: 0, // TODO: Get actual file size
      });

      console.log(`[Clip Extractor] Clip ${i + 1}/${highlights.length} extracted: ${clipR2Key}`);
    } catch (error) {
      console.error(`[Clip Extractor] Failed to extract clip ${i + 1}:`, error);
      // Continue with other clips even if one fails
    }
  }

  console.log(`[Clip Extractor] Extracted ${extracted.length}/${highlights.length} clips successfully`);
  return extracted;
}

// ============================================
// StreamZ - Scene Change Detection (Highlight Engine v2)
// ============================================
// Detects visual scene changes in VOD files using FFmpeg's
// scene detection filter. Clusters nearby scene changes into
// events and combines them with chat/audio highlights for
// improved scoring in the v2 highlight pipeline.

import { spawn } from 'child_process';
import { SCENE_DETECTION_THRESHOLD } from '@streamz/shared';

// ---- Types ----

export interface SceneChange {
  timestamp: number;
  score: number; // scene change intensity 0-1
}

export interface SceneCluster {
  startTime: number;
  endTime: number;
  changeCount: number;
  maxScore: number;
}

// ---- FFmpeg Scene Detection ----

/**
 * Detect scene changes in a video file using FFmpeg's `select` filter.
 * Uses `select='gt(scene,threshold)'` to find frames where the visual
 * scene changes significantly.
 *
 * @param vodPath - Local path to the video file
 * @param threshold - Scene change detection threshold (0-1, default 0.3)
 * @returns Array of SceneChange objects with timestamps and scores
 */
export async function detectSceneChanges(
  vodPath: string,
  threshold: number = SCENE_DETECTION_THRESHOLD
): Promise<SceneChange[]> {
  const changes: SceneChange[] = [];

  console.log(
    `[Scene Detector] Starting scene detection on ${vodPath} with threshold=${threshold}`
  );

  return new Promise((resolve, reject) => {
    // FFmpeg command to detect scene changes:
    // - Use the select filter to output frames where scene change > threshold
    // - Use showinfo filter to get frame timestamps
    // - Output to null (we only need stderr/stdout for timestamps)
    const args = [
      '-i', vodPath,
      '-filter:v',
      `select='gt(scene,${threshold})',showinfo`,
      '-f', 'null',
      '-',
    ];

    console.log(`[Scene Detector] Running FFmpeg: ffmpeg ${args.join(' ')}`);

    const proc = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderrOutput = '';

    proc.stdout?.on('data', () => {
      // FFmpeg writes scene detection output to stderr
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const output = data.toString('utf-8');
      stderrOutput += output;

      // Parse showinfo lines to extract timestamps
      // Format: [Parsed_showinfo_1 @ 0x...] n:1 pts:12345 pts_time:12.345 ...
      const timestampRegex = /pts_time:(\d+\.?\d*)/g;
      let match: RegExpExecArray | null;

      // Also parse scene score from select filter output
      // The select filter outputs lines like: [Parsed_select_0 @ ...] n:0 pts:... pts_time:...
      // The scene score is available via the scene detection metadata
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes('showinfo') && line.includes('pts_time')) {
          const timeMatch = /pts_time:(\d+\.?\d*)/.exec(line);
          if (timeMatch) {
            const timestamp = parseFloat(timeMatch[1]);
            if (!isNaN(timestamp) && timestamp >= 0) {
              // Extract scene score if available, otherwise estimate from threshold
              // FFmpeg doesn't output the exact score in showinfo, so we estimate
              // based on the fact that it exceeded the threshold
              const scoreMatch = /t:(\d+\.?\d*)/.exec(line);
              const score = scoreMatch ? Math.min(1, parseFloat(scoreMatch[1])) : threshold + 0.1;

              changes.push({
                timestamp,
                score: Math.min(1, Math.max(0, score)),
              });
            }
          }
        }
      }
    });

    // Set a generous timeout (10 minutes for long VODs)
    const timeout = setTimeout(() => {
      proc.kill('SIGKILL');
      console.warn(`[Scene Detector] FFmpeg timed out after 600s, returning ${changes.length} changes found so far`);
      resolve(changes);
    }, 600000);

    proc.on('close', (code) => {
      clearTimeout(timeout);

      if (code === 0 || changes.length > 0) {
        // Sort by timestamp
        changes.sort((a, b) => a.timestamp - b.timestamp);

        // Remove duplicates (same timestamp within 0.1s)
        const deduplicated: SceneChange[] = [];
        for (const change of changes) {
          if (
            deduplicated.length === 0 ||
            change.timestamp - deduplicated[deduplicated.length - 1].timestamp > 0.1
          ) {
            deduplicated.push(change);
          }
        }

        console.log(
          `[Scene Detector] Detected ${deduplicated.length} scene changes ` +
          `(from ${changes.length} raw detections, threshold=${threshold})`
        );

        resolve(deduplicated);
      } else {
        reject(new Error(`FFmpeg scene detection failed with code ${code}: ${stderrOutput.slice(-500)}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`FFmpeg spawn error during scene detection: ${err.message}`));
    });
  });
}

/**
 * Cluster nearby scene changes into single events.
 * Scene changes within `gapSec` seconds of each other are grouped
 * into a single cluster representing one visual event (e.g., a
 * camera switch montage might produce multiple rapid scene changes).
 *
 * @param changes - Array of scene changes to cluster
 * @param gapSec - Maximum gap in seconds between changes to cluster (default 5)
 * @returns Array of SceneCluster objects
 */
export function clusterSceneChanges(
  changes: SceneChange[],
  gapSec: number = 5
): SceneCluster[] {
  if (changes.length === 0) return [];

  const clusters: SceneCluster[] = [];
  const sorted = [...changes].sort((a, b) => a.timestamp - b.timestamp);

  let currentCluster: SceneCluster = {
    startTime: sorted[0].timestamp,
    endTime: sorted[0].timestamp,
    changeCount: 1,
    maxScore: sorted[0].score,
  };

  for (let i = 1; i < sorted.length; i++) {
    const change = sorted[i];

    if (change.timestamp - currentCluster.endTime <= gapSec) {
      // Extend the current cluster
      currentCluster.endTime = change.timestamp;
      currentCluster.changeCount++;
      currentCluster.maxScore = Math.max(currentCluster.maxScore, change.score);
    } else {
      // Finalize the current cluster and start a new one
      clusters.push(currentCluster);
      currentCluster = {
        startTime: change.timestamp,
        endTime: change.timestamp,
        changeCount: 1,
        maxScore: change.score,
      };
    }
  }

  // Don't forget the last cluster
  clusters.push(currentCluster);

  console.log(
    `[Scene Detector] Clustered ${changes.length} scene changes into ${clusters.length} clusters ` +
    `(gap threshold: ${gapSec}s)`
  );

  return clusters;
}

/**
 * Find the scene change score for a given time range.
 * Returns the maximum scene change intensity within the range,
 * normalized to 0-1. Returns 0 if no scene changes are found.
 */
export function getSceneScoreForRange(
  clusters: SceneCluster[],
  startTime: number,
  endTime: number
): number {
  const overlappingClusters = clusters.filter(
    (c) => c.startTime <= endTime && c.endTime >= startTime
  );

  if (overlappingClusters.length === 0) return 0;

  // Weight by how much the cluster overlaps with the time range
  let totalScore = 0;
  let totalWeight = 0;

  for (const cluster of overlappingClusters) {
    const overlapStart = Math.max(startTime, cluster.startTime);
    const overlapEnd = Math.min(endTime, cluster.endTime);
    const overlapDuration = overlapEnd - overlapStart;
    const rangeDuration = endTime - startTime;

    if (rangeDuration > 0) {
      const weight = overlapDuration / rangeDuration;
      totalScore += cluster.maxScore * weight * (1 + 0.2 * Math.min(cluster.changeCount, 5));
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;

  // Normalize: a single cluster with maxScore 1 should yield ~1
  // Multiple clusters boost the score slightly
  return Math.min(1, totalScore / totalWeight);
}

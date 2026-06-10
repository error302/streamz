// ============================================
// StreamZ - Database Client (Neon PostgreSQL)
// ============================================

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;

// Configure connection pool with sensible defaults for serverless + workers
export const sql = postgres(connectionString, {
  max: process.env.NODE_ENV === 'production' ? 20 : 5,
  idle_timeout: 20,
  connect_timeout: 10,
  // Use prepared statements for performance
  prepare: true,
  // Transform snake_case columns to camelCase
  transform: {
    // Keep snake_case for consistency with SQL schema
    undefined: null,
  },
});

export default sql;

// ---- Type-safe query helpers ----

export async function findStreamById(id: string) {
  const [stream] = await sql`
    SELECT * FROM streams WHERE id = ${id}
  `;
  return stream ?? null;
}

export async function findHighlightsByStreamId(streamId: string) {
  return sql`
    SELECT * FROM highlights
    WHERE stream_id = ${streamId}
    ORDER BY highlight_score DESC
  `;
}

export async function findAIContentByHighlightId(highlightId: string) {
  return sql`
    SELECT * FROM ai_content
    WHERE highlight_id = ${highlightId}
    ORDER BY target_platform
  `;
}

export async function findPendingPublishJobs(limit = 50) {
  return sql`
    SELECT * FROM publish_queue
    WHERE status = 'queued' AND scheduled_at <= NOW()
    ORDER BY scheduled_at ASC
    LIMIT ${limit}
  `;
}

export async function updateStreamStatus(id: string, status: string) {
  const [updated] = await sql`
    UPDATE streams SET status = ${status}::stream_status
    WHERE id = ${id}
    RETURNING *
  `;
  return updated ?? null;
}

export async function insertHighlight(data: {
  streamId: string;
  startTime: number;
  endTime: number;
  highlightScore: number;
  chatSpikeIntensity: number;
  audioEnergyScore: number;
  clipDuration: number;
  clipType: string;
}) {
  const [highlight] = await sql`
    INSERT INTO highlights (
      stream_id, start_time, end_time, highlight_score,
      chat_spike_intensity, audio_energy_score, clip_duration, clip_type
    ) VALUES (
      ${data.streamId}, ${data.startTime}, ${data.endTime}, ${data.highlightScore},
      ${data.chatSpikeIntensity}, ${data.audioEnergyScore}, ${data.clipDuration}, ${data.clipType}::clip_type
    )
    RETURNING *
  `;
  return highlight;
}

export async function insertAIContent(data: {
  highlightId: string;
  targetPlatform: string;
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  suggestedPostTime: Date | null;
  promptVersion: string;
  originalContent: Record<string, unknown> | null;
}) {
  const [content] = await sql`
    INSERT INTO ai_content (
      highlight_id, target_platform, title, description,
      tags, hashtags, suggested_post_time, prompt_version, original_content
    ) VALUES (
      ${data.highlightId}, ${data.targetPlatform}::target_platform, ${data.title}, ${data.description},
      ${data.tags}, ${data.hashtags}, ${data.suggestedPostTime}, ${data.promptVersion}, ${data.originalContent ? sql.json(data.originalContent) : null}
    )
    RETURNING *
  `;
  return content;
}

export async function insertPublishJob(data: {
  aiContentId: string;
  bullmqJobId: string | null;
  platform: string;
  scheduledAt: Date;
}) {
  const [job] = await sql`
    INSERT INTO publish_queue (
      ai_content_id, bullmq_job_id, platform, scheduled_at
    ) VALUES (
      ${data.aiContentId}, ${data.bullmqJobId}, ${data.platform}::target_platform, ${data.scheduledAt}
    )
    RETURNING *
  `;
  return job;
}

export async function updatePublishJobStatus(
  id: string,
  status: string,
  updates?: { publishedAt?: Date; platformContentId?: string; errorMessage?: string }
) {
  const [updated] = await sql`
    UPDATE publish_queue
    SET
      status = ${status}::publish_status,
      published_at = COALESCE(${updates?.publishedAt ?? null}, published_at),
      platform_content_id = COALESCE(${updates?.platformContentId ?? null}, platform_content_id),
      error_message = ${updates?.errorMessage ?? null}
    WHERE id = ${id}
    RETURNING *
  `;
  return updated ?? null;
}

export async function incrementRetryCount(id: string, errorMessage: string) {
  const [updated] = await sql`
    UPDATE publish_queue
    SET
      retry_count = retry_count + 1,
      error_message = ${errorMessage}
    WHERE id = ${id}
    RETURNING *
  `;
  return updated ?? null;
}

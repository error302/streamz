// ============================================
// StreamZ - Database Client (Neon PostgreSQL)
// ============================================
// Lazy singleton connection — created on first use via getDb(),
// NOT at import time. Exports `sql` as a Proxy that lazily
// delegates to the real connection.

import postgres from 'postgres';

// ---- Lazy Singleton Connection ----

let _sql: ReturnType<typeof postgres> | null = null;

function getDb() {
  if (_sql) return _sql;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      '[DB] DATABASE_URL environment variable is required. ' +
      'Set it to your PostgreSQL connection string (e.g., postgresql://user:pass@host:5432/db).'
    );
  }

  _sql = postgres(connectionString, {
    max: process.env.NODE_ENV === 'production' ? 20 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: true,
    transform: {
      undefined: null,
    },
  });

  return _sql;
}

// Export `sql` as a Proxy that lazily delegates to the real connection.
// This means importing `sql` won't immediately create a DB connection.
export const sql = new Proxy({} as ReturnType<typeof postgres>, {
  get(_target, prop, receiver) {
    const db = getDb();
    const value = Reflect.get(db, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(db);
    }
    return value;
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
  sceneChangeScore?: number;
}) {
  const [highlight] = await sql`
    INSERT INTO highlights (
      stream_id, start_time, end_time, highlight_score,
      chat_spike_intensity, audio_energy_score, clip_duration, clip_type, scene_change_score
    ) VALUES (
      ${data.streamId}, ${data.startTime}, ${data.endTime}, ${data.highlightScore},
      ${data.chatSpikeIntensity}, ${data.audioEnergyScore}, ${data.clipDuration}, ${data.clipType}::clip_type, ${data.sceneChangeScore ?? 0}
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
  rejectionReason?: string | null;
  approvalFeedback?: Record<string, unknown> | null;
}) {
  const [content] = await sql`
    INSERT INTO ai_content (
      highlight_id, target_platform, title, description,
      tags, hashtags, suggested_post_time, prompt_version, original_content,
      rejection_reason, approval_feedback
    ) VALUES (
      ${data.highlightId}, ${data.targetPlatform}::target_platform, ${data.title}, ${data.description},
      ${data.tags}, ${data.hashtags}, ${data.suggestedPostTime}, ${data.promptVersion}, ${data.originalContent ? sql.json(data.originalContent as any) : null},
      ${data.rejectionReason ?? null}, ${data.approvalFeedback ? sql.json(data.approvalFeedback as any) : null}
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

// ---- User Helpers ----

export async function upsertUser(data: {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const [user] = await sql`
    INSERT INTO users (id, email, first_name, last_name, image_url, clerk_metadata)
    VALUES (${data.id}, ${data.email}, ${data.firstName ?? null}, ${data.lastName ?? null}, ${data.imageUrl ?? null}, ${sql.json(data.metadata as any ?? {})})
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      image_url = EXCLUDED.image_url,
      clerk_metadata = EXCLUDED.clerk_metadata,
      updated_at = NOW()
    RETURNING *
  `;
  return user;
}

export async function deleteUser(id: string) {
  const [deleted] = await sql`
    DELETE FROM users WHERE id = ${id}
    RETURNING *
  `;
  return deleted ?? null;
}

export async function findUserById(id: string) {
  const [user] = await sql`
    SELECT * FROM users WHERE id = ${id}
  `;
  return user ?? null;
}

// ---- Notification Helpers ----

export async function insertNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  const [notification] = await sql`
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (${data.userId}, ${data.type}, ${data.title}, ${data.message}, ${sql.json(data.data as any ?? {})})
    RETURNING *
  `;
  return notification;
}

export async function findNotificationsByUserId(userId: string, limit = 50, offset = 0) {
  return sql`
    SELECT * FROM notifications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
}

export async function getUnreadNotificationCount(userId: string) {
  const [result] = await sql`
    SELECT COUNT(*)::int AS count FROM notifications
    WHERE user_id = ${userId} AND read = false
  `;
  return result?.count ?? 0;
}

export async function markNotificationRead(id: string) {
  const [updated] = await sql`
    UPDATE notifications SET read = true
    WHERE id = ${id}
    RETURNING *
  `;
  return updated ?? null;
}

export async function markAllNotificationsRead(userId: string) {
  await sql`
    UPDATE notifications SET read = true
    WHERE user_id = ${userId} AND read = false
  `;
}

// ---- Connected Accounts Helpers ----

export async function upsertConnectedAccount(data: {
  userId: string;
  platform: string;
  platformUserId: string;
  platformUsername?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  scopes?: string[];
  metadata?: Record<string, unknown> | null;
}) {
  const [account] = await sql`
    INSERT INTO connected_accounts (user_id, platform, platform_user_id, platform_username, access_token, refresh_token, token_expires_at, scopes, metadata)
    VALUES (${data.userId}, ${data.platform}, ${data.platformUserId}, ${data.platformUsername ?? null}, ${data.accessToken}, ${data.refreshToken ?? null}, ${data.tokenExpiresAt ?? null}, ${data.scopes ?? []}, ${sql.json(data.metadata as any ?? {})})
    ON CONFLICT (user_id, platform) DO UPDATE SET
      platform_user_id = EXCLUDED.platform_user_id,
      platform_username = EXCLUDED.platform_username,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      token_expires_at = EXCLUDED.token_expires_at,
      scopes = EXCLUDED.scopes,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING *
  `;
  return account;
}

export async function findConnectedAccountsByUserId(userId: string) {
  return sql`
    SELECT id, user_id, platform, platform_user_id, platform_username, scopes, created_at, updated_at
    FROM connected_accounts
    WHERE user_id = ${userId}
    ORDER BY platform
  `;
}

export async function findConnectedAccountByPlatform(userId: string, platform: string) {
  const [account] = await sql`
    SELECT * FROM connected_accounts
    WHERE user_id = ${userId} AND platform = ${platform}
  `;
  return account ?? null;
}

export async function deleteConnectedAccount(userId: string, platform: string) {
  const [deleted] = await sql`
    DELETE FROM connected_accounts
    WHERE user_id = ${userId} AND platform = ${platform}
    RETURNING *
  `;
  return deleted ?? null;
}

// ---- Stats Helpers ----

// ---- Prompt Feedback Helpers (Phase 4) ----

export async function insertPromptFeedback(data: {
  promptVersion: string;
  platform: string;
  approved: boolean;
  rejectionReason?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const [feedback] = await sql`
    INSERT INTO prompt_feedback (prompt_version, platform, approved, rejection_reason, metadata)
    VALUES (
      ${data.promptVersion},
      ${data.platform}::target_platform,
      ${data.approved},
      ${data.rejectionReason ?? null},
      ${sql.json(data.metadata as any ?? {})}
    )
    RETURNING *
  `;
  return feedback;
}

export async function getPromptFeedbackStats(platform?: string, promptVersion?: string) {
  const whereClause = platform
    ? promptVersion
      ? sql`WHERE platform = ${platform}::target_platform AND prompt_version = ${promptVersion}`
      : sql`WHERE platform = ${platform}::target_platform`
    : promptVersion
      ? sql`WHERE prompt_version = ${promptVersion}`
      : sql``;

  return sql`
    SELECT
      prompt_version,
      platform,
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE approved = true)::int AS approved_count,
      COUNT(*) FILTER (WHERE approved = false)::int AS rejected_count,
      ROUND(
        COUNT(*) FILTER (WHERE approved = true)::numeric / NULLIF(COUNT(*), 0) * 100,
        2
      ) AS approval_rate
    FROM prompt_feedback
    ${whereClause}
    GROUP BY prompt_version, platform
    ORDER BY prompt_version DESC, platform
  `;
}

export async function getDashboardStats() {
  const [streamCount] = await sql`
    SELECT COUNT(*)::int AS count FROM streams
  `;
  const [highlightCount] = await sql`
    SELECT COUNT(*)::int AS count FROM highlights
  `;
  const [pendingCount] = await sql`
    SELECT COUNT(*)::int AS count FROM ai_content WHERE review_status = 'pending'::review_status
  `;
  const [publishedCount] = await sql`
    SELECT COUNT(*)::int AS count FROM publish_queue WHERE status = 'published'::publish_status
  `;

  return {
    totalStreams: streamCount?.count ?? 0,
    totalHighlights: highlightCount?.count ?? 0,
    pendingReview: pendingCount?.count ?? 0,
    published: publishedCount?.count ?? 0,
  };
}

export async function getRecentStreams(limit = 5) {
  return sql`
    SELECT id, platform, title, game_category, status, started_at
    FROM streams
    ORDER BY started_at DESC
    LIMIT ${limit}
  `;
}

// ============================================
// StreamZ - Batch Approve API Route
// ============================================
// Batch approves multiple AI content items in a single transaction.
// Replaces per-item UPDATE/INSERT loop with batch SQL operations.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ContentApproveBodySchema } from '@streamz/shared';
import { getQueue, QUEUES } from '@streamz/shared';
import sql from '@/lib/db';

const BatchApproveSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    title: z.string().min(1).max(500),
    description: z.string().min(1).max(5000),
    tags: z.array(z.string()).max(50),
    hashtags: z.array(z.string()).max(30),
  })).min(1).max(100),
});

// ---- POST /api/content/batch-approve ----
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const parsed = BatchApproveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { items } = parsed.data;
    const contentIds = items.map((item) => item.id);

    // Batch operation in a transaction
    const approvedContent = await sql.begin(async (tx) => {
      // Batch update all items using unnest for efficiency (instead of N+1 loop)
      const updatedRows = await tx`
        UPDATE ai_content
        SET
          title = data.title,
          description = data.description,
          tags = data.tags,
          hashtags = data.hashtags,
          review_status = 'approved'::review_status,
          edited = true
        FROM (
          SELECT * FROM unnest(
            ${contentIds}::uuid[],
            ${items.map(i => i.title)}::varchar[],
            ${items.map(i => i.description)}::varchar[],
            ${items.map(i => i.tags)}::text[][],
            ${items.map(i => i.hashtags)}::text[][]
          ) AS t(id, title, description, tags, hashtags)
        ) AS data
        WHERE ai_content.id = data.id
        RETURNING ai_content.*
      `;

      // Batch insert publish_queue entries
      if (updatedRows.length > 0) {
        const publishEntries = updatedRows.map((row) => ({
          aiContentId: row.id,
          platform: row.target_platform,
          scheduledAt: new Date(),
        }));

        await tx`
          INSERT INTO publish_queue (ai_content_id, platform, scheduled_at)
          SELECT * FROM unnest(
            ${publishEntries.map(e => e.aiContentId)}::uuid[],
            ${publishEntries.map(e => e.platform)}::target_platform[],
            ${publishEntries.map(e => e.scheduledAt)}::timestamptz[]
          )
        `;
      }

      return updatedRows;
    });

    // Queue BullMQ publish jobs using addBulk
    if (approvedContent.length > 0) {
      try {
        const publishQueue = getQueue(QUEUES.PUBLISH);
        const bulkJobs = approvedContent.map((row) => ({
          name: `publish-${row.target_platform}`,
          data: {
            aiContentId: row.id,
            targetPlatform: row.target_platform,
            clipR2Key: '', // Will be fetched by the worker
            title: row.title,
            description: row.description,
            tags: row.tags,
            hashtags: row.hashtags,
            scheduledAt: null,
          },
          opts: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          },
        }));

        await publishQueue.addBulk(bulkJobs);
      } catch (queueErr) {
        console.error('[Batch Approve] Failed to queue publish jobs:', queueErr);
        // Don't fail the request — the DB records are already created
      }
    }

    return NextResponse.json({
      success: true,
      data: { approved: approvedContent.length },
    });
  } catch (error) {
    console.error('[API /content/batch-approve] Error:', error);
    return NextResponse.json(
      { error: 'Failed to batch approve content' },
      { status: 500 }
    );
  }
}

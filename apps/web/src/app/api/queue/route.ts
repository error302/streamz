// ============================================
// StreamZ - Queue API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { QueueQuerySchema } from '@streamz/shared';
import sql from '@/lib/db';

// ---- GET /api/queue ----
export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());

    // Validate query params with Zod
    const parsed = QueueQuerySchema.safeParse(searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { status, limit } = parsed.data;

    let jobs;

    if (status) {
      jobs = await sql`
        SELECT * FROM publish_queue
        WHERE status = ${status}::publish_status
        ORDER BY scheduled_at ASC
        LIMIT ${limit}
      `;
    } else {
      jobs = await sql`
        SELECT * FROM publish_queue
        ORDER BY scheduled_at ASC
        LIMIT ${limit}
      `;
    }

    return NextResponse.json({ success: true, data: jobs });
  } catch (error) {
    console.error('[API /queue] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue' },
      { status: 500 }
    );
  }
}

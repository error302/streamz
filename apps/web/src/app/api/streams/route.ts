// ============================================
// StreamZ - Streams API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { StreamsQuerySchema } from '@streamz/shared';
import sql from '@/lib/db';

// ---- GET /api/streams ----
export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());

    // Validate query params with Zod
    const parsed = StreamsQuerySchema.safeParse(searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { platform, status, limit } = parsed.data;

    // Build dynamic WHERE clauses
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (platform) {
      conditions.push(`platform = $${paramIdx}::platform_type`);
      params.push(platform);
      paramIdx++;
    }

    if (status) {
      conditions.push(`status = $${paramIdx}::stream_status`);
      params.push(status);
      paramIdx++;
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const streams = await sql`
      SELECT * FROM streams
      ${sql.unsafe(whereClause || 'TRUE')}
      ORDER BY started_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ success: true, data: streams });
  } catch (error) {
    console.error('[API /streams] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch streams' },
      { status: 500 }
    );
  }
}

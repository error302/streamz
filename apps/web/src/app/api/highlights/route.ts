// ============================================
// StreamZ - Highlights API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { HighlightsQuerySchema } from '@streamz/shared';
import sql from '@/lib/db';

// ---- GET /api/highlights ----
export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());

    // Validate query params with Zod
    const parsed = HighlightsQuerySchema.safeParse(searchParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { streamId, limit } = parsed.data;

    let highlights;

    if (streamId) {
      highlights = await sql`
        SELECT * FROM highlights
        WHERE stream_id = ${streamId}
        ORDER BY highlight_score DESC
        LIMIT ${limit}
      `;
    } else {
      highlights = await sql`
        SELECT * FROM highlights
        ORDER BY highlight_score DESC
        LIMIT ${limit}
      `;
    }

    return NextResponse.json({ success: true, data: highlights });
  } catch (error) {
    console.error('[API /highlights] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch highlights' },
      { status: 500 }
    );
  }
}

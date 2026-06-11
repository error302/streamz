// ============================================
// StreamZ - Pending Content API Route
// ============================================

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import sql from '@/lib/db';

// ---- GET /api/content/pending ----
export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const content = await sql`
      SELECT ac.*, s.platform, s.title AS stream_title
      FROM ai_content ac
      JOIN highlights h ON ac.highlight_id = h.id
      JOIN streams s ON h.stream_id = s.id
      WHERE ac.review_status = 'pending'::review_status
      ORDER BY ac.created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({ success: true, data: content });
  } catch (error) {
    console.error('[API /content/pending] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending content' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { sql } = await import('@streamz/db');

    const [streamsRes, highlightsRes, pendingRes, publishedRes, recentRes] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM streams WHERE user_id = ${userId}`,
      sql`SELECT COUNT(*) as count FROM highlights h JOIN streams s ON h.stream_id = s.id WHERE s.user_id = ${userId}`,
      sql`SELECT COUNT(*) as count FROM ai_content WHERE review_status = 'pending'`,
      sql`SELECT COUNT(*) as count FROM publish_queue WHERE status = 'published'`,
      sql`SELECT id, platform, title, status, started_at FROM streams WHERE user_id = ${userId} ORDER BY started_at DESC LIMIT 5`,
    ]);

    return NextResponse.json({
      totalStreams: Number(streamsRes[0]?.count || 0),
      totalHighlights: Number(highlightsRes[0]?.count || 0),
      pendingReview: Number(pendingRes[0]?.count || 0),
      published: Number(publishedRes[0]?.count || 0),
      recentStreams: recentRes,
    });
  } catch (err) {
    console.error('[Stats API] Error:', err);
    return NextResponse.json({ totalStreams: 0, totalHighlights: 0, pendingReview: 0, published: 0, recentStreams: [] });
  }
}

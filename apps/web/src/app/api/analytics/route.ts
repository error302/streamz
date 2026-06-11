// ============================================
// StreamZ - Analytics API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import sql from '@/lib/db';

// ---- GET /api/analytics ----
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const platform = searchParams.get('platform');

    // Get analytics summary from database
    let analytics;
    if (platform) {
      analytics = await sql`
        SELECT a.*, pq.platform, ac.title
        FROM analytics a
        JOIN publish_queue pq ON a.publish_queue_id = pq.id
        JOIN ai_content ac ON pq.ai_content_id = ac.id
        WHERE a.platform = ${platform}::target_platform
        ORDER BY a.pulled_at DESC
        LIMIT 100
      `;
    } else {
      analytics = await sql`
        SELECT a.*, pq.platform, ac.title
        FROM analytics a
        JOIN publish_queue pq ON a.publish_queue_id = pq.id
        JOIN ai_content ac ON pq.ai_content_id = ac.id
        ORDER BY a.pulled_at DESC
        LIMIT 100
      `;
    }

    type AnalyticsRow = Record<string, unknown>;
    const rows = analytics as AnalyticsRow[];

    // Compute summary stats
    const summary = rows.length > 0
      ? {
          totalViews: rows.reduce((sum: number, a) => sum + (a.views as number || 0), 0),
          totalLikes: rows.reduce((sum: number, a) => sum + (a.likes as number || 0), 0),
          totalComments: rows.reduce((sum: number, a) => sum + (a.comments as number || 0), 0),
          totalShares: rows.reduce((sum: number, a) => sum + (a.shares as number || 0), 0),
          avgEngagementRate: rows.reduce((sum: number, a) => sum + (a.click_through_rate as number || 0), 0) / rows.length,
          avgRetention: rows.reduce((sum: number, a) => sum + (a.audience_retention_percent as number || 0), 0) / rows.length,
          publishedCount: rows.length,
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        summary,
        analytics: rows,
      },
    });
  } catch (error) {
    console.error('[API /analytics] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

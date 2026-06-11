import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { sql } = await import('@streamz/db');

    const [summaryRes, byPlatformRes, recentRes] = await Promise.all([
      sql`
        SELECT
          COALESCE(SUM(views), 0) as total_views,
          COALESCE(AVG(click_through_rate), 0) as engagement_rate,
          COUNT(DISTINCT pq.id) as total_published,
          COALESCE(AVG(audience_retention_percent), 0) as avg_retention
        FROM analytics a
        JOIN publish_queue pq ON a.publish_queue_id = pq.id
        WHERE pq.status = 'published'
      `,
      sql`
        SELECT platform, SUM(views) as views, SUM(likes) as likes, SUM(comments) as comments
        FROM analytics
        GROUP BY platform
        ORDER BY views DESC
      `,
      sql`
        SELECT a.platform, a.views, a.likes, a.comments, a.shares, a.audience_retention_percent,
               ac.title, a.pulled_at
        FROM analytics a
        JOIN publish_queue pq ON a.publish_queue_id = pq.id
        JOIN ai_content ac ON pq.ai_content_id = ac.id
        ORDER BY a.pulled_at DESC
        LIMIT 20
      `,
    ]);

    return NextResponse.json({
      summary: summaryRes[0] || { total_views: 0, engagement_rate: 0, total_published: 0, avg_retention: 0 },
      byPlatform: byPlatformRes,
      recent: recentRes,
    });
  } catch (err) {
    console.error('[Analytics API] Error:', err);
    return NextResponse.json({ summary: { total_views: 0, engagement_rate: 0, total_published: 0, avg_retention: 0 }, byPlatform: [], recent: [] });
  }
}

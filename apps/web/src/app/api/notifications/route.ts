// ============================================
// StreamZ - Notifications API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { findNotificationsByUserId } from '@streamz/db';

// ---- GET /api/notifications ----
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const notifications = await findNotificationsByUserId(userId, limit, offset);

    return NextResponse.json({ success: true, data: notifications });
  } catch (error) {
    console.error('[API /notifications] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

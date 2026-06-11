// ============================================
// StreamZ - Unread Notification Count API Route
// ============================================

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { getUnreadNotificationCount } from '@streamz/db';

// ---- GET /api/notifications/unread-count ----
export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const count = await getUnreadNotificationCount(userId);

    return NextResponse.json({ success: true, data: { count } });
  } catch (error) {
    console.error('[API /notifications/unread-count] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unread count' },
      { status: 500 }
    );
  }
}

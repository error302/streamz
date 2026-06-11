// ============================================
// StreamZ - Mark All Notifications Read API Route
// ============================================

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { markAllNotificationsRead } from '@streamz/db';

// ---- POST /api/notifications/read-all ----
export async function POST() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await markAllNotificationsRead(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /notifications/read-all] Error:', error);
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}

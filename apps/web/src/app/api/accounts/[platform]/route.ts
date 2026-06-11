// ============================================
// StreamZ - Disconnect Account API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { deleteConnectedAccount } from '@streamz/db';

const VALID_PLATFORMS = ['youtube', 'instagram', 'tiktok'];

// ---- DELETE /api/accounts/[platform] ----
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const platform = params.platform.toLowerCase();
    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }

    const deleted = await deleteConnectedAccount(userId, platform);

    if (!deleted) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API /accounts/[platform]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}

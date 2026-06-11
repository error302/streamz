// ============================================
// StreamZ - Account Status API Route
// ============================================

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { findConnectedAccountsByUserId } from '@streamz/db';

// ---- GET /api/accounts/status ----
export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const accounts = await findConnectedAccountsByUserId(userId) as Array<Record<string, unknown>>;
    const connectedPlatforms = new Set(accounts.map((a) => a.platform as string));

    const platforms = ['youtube', 'instagram', 'tiktok'].map((platform) => ({
      platform,
      connected: connectedPlatforms.has(platform),
      username: accounts.find((a) => a.platform === platform)?.platform_username as string | null ?? null,
    }));

    return NextResponse.json({ success: true, data: platforms });
  } catch (error) {
    console.error('[API /accounts/status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account status' },
      { status: 500 }
    );
  }
}

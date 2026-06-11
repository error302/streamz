// ============================================
// StreamZ - TikTok OAuth Routes
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

const TIKTOK_SCOPES = ['video.publish', 'video.list'];

// ---- GET /api/auth/tiktok ----
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/tiktok/callback`;

    if (!clientKey) {
      return NextResponse.json({ error: 'TikTok OAuth not configured' }, { status: 500 });
    }

    const state = Buffer.from(JSON.stringify({ userId, nonce: crypto.randomUUID() })).toString('base64');

    const params = new URLSearchParams({
      client_key: clientKey,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: TIKTOK_SCOPES.join(','),
      state,
    });

    return NextResponse.redirect(`https://www.tiktok.com/v2/auth/authorize?${params}`);
  } catch (error) {
    console.error('[API /auth/tiktok] Error:', error);
    return NextResponse.json({ error: 'Failed to initiate TikTok OAuth' }, { status: 500 });
  }
}

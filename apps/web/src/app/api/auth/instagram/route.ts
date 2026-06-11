// ============================================
// StreamZ - Instagram OAuth Routes
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';

const INSTAGRAM_SCOPES = ['instagram_basic', 'instagram_content_publish'];

// ---- GET /api/auth/instagram ----
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const clientId = process.env.META_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/instagram/callback`;

    if (!clientId) {
      return NextResponse.json({ error: 'Meta OAuth not configured' }, { status: 500 });
    }

    const state = Buffer.from(JSON.stringify({ userId, nonce: crypto.randomUUID() })).toString('base64');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: INSTAGRAM_SCOPES.join(','),
      state,
    });

    return NextResponse.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
  } catch (error) {
    console.error('[API /auth/instagram] Error:', error);
    return NextResponse.json({ error: 'Failed to initiate Instagram OAuth' }, { status: 500 });
  }
}

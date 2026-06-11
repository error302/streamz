// ============================================
// StreamZ - YouTube OAuth Routes
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { upsertConnectedAccount } from '@streamz/db';

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

// ---- GET /api/auth/youtube ----
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/youtube/callback`;

    if (!clientId) {
      return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
    }

    // Generate state for CSRF protection
    const state = Buffer.from(JSON.stringify({ userId, nonce: crypto.randomUUID() })).toString('base64');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: YOUTUBE_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  } catch (error) {
    console.error('[API /auth/youtube] Error:', error);
    return NextResponse.json({ error: 'Failed to initiate YouTube OAuth' }, { status: 500 });
  }
}

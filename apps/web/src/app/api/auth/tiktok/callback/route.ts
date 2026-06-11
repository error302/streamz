// ============================================
// StreamZ - TikTok OAuth Callback
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { upsertConnectedAccount } from '@streamz/db';

const TIKTOK_SCOPES = ['video.publish', 'video.list'];

// ---- GET /api/auth/tiktok/callback ----
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const stateParam = request.nextUrl.searchParams.get('state');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=oauth_denied', request.url));
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=oauth_failed', request.url));
    }

    const state = JSON.parse(Buffer.from(stateParam, 'base64').toString());
    const { userId } = state;

    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/tiktok/callback`;

    if (!clientKey || !clientSecret) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=oauth_config', request.url));
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('[TikTok OAuth] Token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(new URL('/dashboard/settings?error=oauth_token', request.url));
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const meResponse = await fetch('https://open.tiktokapis.com/v2/user/info/', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let platformUsername = 'TikTok User';
    let platformUserId = tokens.open_id ?? 'unknown';

    if (meResponse.ok) {
      const meData = await meResponse.json();
      platformUsername = meData.data?.user?.display_name ?? 'TikTok User';
    }

    await upsertConnectedAccount({
      userId,
      platform: 'tiktok',
      platformUserId,
      platformUsername,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenExpiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
      scopes: TIKTOK_SCOPES,
    });

    return NextResponse.redirect(new URL('/dashboard/settings?connected=tiktok', request.url));
  } catch (error) {
    console.error('[TikTok OAuth Callback] Error:', error);
    return NextResponse.redirect(new URL('/dashboard/settings?error=oauth_failed', request.url));
  }
}

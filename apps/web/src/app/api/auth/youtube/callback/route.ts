// ============================================
// StreamZ - YouTube OAuth Callback
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { upsertConnectedAccount } from '@streamz/db';

// ---- GET /api/auth/youtube/callback ----
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

    // Parse state
    const state = JSON.parse(Buffer.from(stateParam, 'base64').toString());
    const { userId } = state;

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/youtube/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=oauth_config', request.url));
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      console.error('[YouTube OAuth] Token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(new URL('/dashboard/settings?error=oauth_token', request.url));
    }

    const tokens = await tokenResponse.json();

    // Get user's YouTube channel info
    const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let platformUsername = 'YouTube User';
    let platformUserId = 'unknown';

    if (channelResponse.ok) {
      const channelData = await channelResponse.json();
      const channel = channelData.items?.[0];
      if (channel) {
        platformUsername = channel.snippet?.title ?? 'YouTube User';
        platformUserId = channel.id ?? 'unknown';
      }
    }

    // Store the connected account
    await upsertConnectedAccount({
      userId,
      platform: 'youtube',
      platformUserId,
      platformUsername,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      scopes: tokens.scope?.split(' ') ?? [],
    });

    return NextResponse.redirect(new URL('/dashboard/settings?connected=youtube', request.url));
  } catch (error) {
    console.error('[YouTube OAuth Callback] Error:', error);
    return NextResponse.redirect(new URL('/dashboard/settings?error=oauth_failed', request.url));
  }
}

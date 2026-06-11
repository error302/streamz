// ============================================
// StreamZ - Instagram OAuth Callback
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { upsertConnectedAccount } from '@streamz/db';

const INSTAGRAM_SCOPES = ['instagram_basic', 'instagram_content_publish'];

// ---- GET /api/auth/instagram/callback ----
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

    const clientId = process.env.META_APP_ID;
    const clientSecret = process.env.META_APP_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/instagram/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/dashboard/settings?error=oauth_config', request.url));
    }

    // Exchange code for short-lived token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      })}`
    );

    if (!tokenResponse.ok) {
      console.error('[Instagram OAuth] Token exchange failed:', await tokenResponse.text());
      return NextResponse.redirect(new URL('/dashboard/settings?error=oauth_token', request.url));
    }

    const tokens = await tokenResponse.json();

    // Get long-lived token
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?${new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: tokens.access_token,
      })}`
    );

    const longLivedTokens = longLivedResponse.ok ? await longLivedResponse.json() : tokens;

    // Get user info
    const meResponse = await fetch('https://graph.facebook.com/v19.0/me?fields=id,name', {
      headers: { Authorization: `Bearer ${longLivedTokens.access_token}` },
    });

    let platformUsername = 'Instagram User';
    let platformUserId = 'unknown';

    if (meResponse.ok) {
      const meData = await meResponse.json();
      platformUsername = meData.name ?? 'Instagram User';
      platformUserId = meData.id ?? 'unknown';
    }

    await upsertConnectedAccount({
      userId,
      platform: 'instagram',
      platformUserId,
      platformUsername,
      accessToken: longLivedTokens.access_token,
      refreshToken: null,
      tokenExpiresAt: longLivedTokens.expires_in
        ? new Date(Date.now() + longLivedTokens.expires_in * 1000)
        : null,
      scopes: INSTAGRAM_SCOPES,
    });

    return NextResponse.redirect(new URL('/dashboard/settings?connected=instagram', request.url));
  } catch (error) {
    console.error('[Instagram OAuth Callback] Error:', error);
    return NextResponse.redirect(new URL('/dashboard/settings?error=oauth_failed', request.url));
  }
}

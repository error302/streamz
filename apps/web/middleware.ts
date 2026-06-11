// ============================================
// StreamZ - Clerk Auth Middleware
// ============================================

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/content(.*)',
  '/api/queue(.*)',
  '/api/seed(.*)',
  '/api/auth/youtube(.*)',
  '/api/auth/instagram(.*)',
  '/api/auth/tiktok(.*)',
  '/api/notifications(.*)',
  '/api/streams(.*)',
  '/api/highlights(.*)',
  '/api/accounts(.*)',
  '/api/analytics(.*)',
  '/api/stats(.*)',
]);

const isPublicRoute = createRouteMatcher([
  '/',
  '/api/webhooks/(.*)',
  '/api/health',
]);

export default clerkMiddleware((auth, req) => {
  const origin = req.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
  ].filter(Boolean);

  if (req.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Access-Control-Max-Age', '86400');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return response;
  }

  if (isProtectedRoute(req)) {
    auth().protect();
  }

  const response = NextResponse.next();
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return response;
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};

'use client';

import React from 'react';

/**
 * Checks if Clerk keys are present and look valid.
 * Valid keys should be > 50 chars and not obviously placeholder values.
 */
function isClerkConfigured(): boolean {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return false;
  if (key.length < 50) return false;
  if (key.startsWith('pk_test_') || key.startsWith('pk_live_')) return true;
  return false;
}

/**
 * Optional Clerk Provider that wraps children in ClerkProvider when
 * Clerk keys are available, otherwise renders children directly.
 * This enables preview/demo mode without real Clerk credentials.
 */
export function OptionalClerkProvider({ children }: { children: React.ReactNode }) {
  const clerkAvailable = isClerkConfigured();

  if (!clerkAvailable) {
    console.log('[StreamZ] Clerk keys not configured — running in preview mode');
    return <>{children}</>;
  }

  // Dynamically import ClerkProvider to avoid errors when keys are missing
  // eslint-disable-next-line
  const { ClerkProvider } = require('@clerk/nextjs');

  return <ClerkProvider>{children}</ClerkProvider>;
}

'use client';

import { useState, useCallback } from 'react';

// ---- Types matching Clerk's API shape ----

interface PreviewUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  emailAddresses: Array<{ id: string; emailAddress: string }>;
  imageUrl: string;
}

interface UsePreviewUserReturn {
  user: PreviewUser | null;
  isSignedIn: boolean;
  isLoaded: boolean;
}

const MOCK_USER: PreviewUser = {
  id: 'preview-user',
  firstName: 'Preview',
  lastName: 'User',
  fullName: 'Preview User',
  emailAddresses: [],
  imageUrl: '',
};

/**
 * Hook that returns a mock user when Clerk is unavailable,
 * matching Clerk's useUser() API shape.
 */
export function usePreviewUser(): UsePreviewUserReturn {
  const [isLoaded] = useState(true);

  const isClerkConfigured = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (!key) return false;
    if (key.length < 50) return false;
    return key.startsWith('pk_test_') || key.startsWith('pk_live_');
  }, []);

  // When Clerk is configured, this hook shouldn't be used
  // (the app should use Clerk's useUser instead)
  if (isClerkConfigured()) {
    // Still return a valid shape but indicate not loaded
    // so the UI can fall through to Clerk's hook
    return { user: null, isSignedIn: false, isLoaded: false };
  }

  return {
    user: MOCK_USER,
    isSignedIn: true,
    isLoaded,
  };
}

/**
 * Badge component to display when running in preview mode
 */
export function PreviewBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      Preview Mode
    </span>
  );
}

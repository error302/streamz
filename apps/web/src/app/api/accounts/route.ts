// ============================================
// StreamZ - Accounts API Route
// ============================================

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { findConnectedAccountsByUserId } from '@streamz/db';

// ---- GET /api/accounts ----
export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const accounts = await findConnectedAccountsByUserId(userId);

    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    console.error('[API /accounts] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

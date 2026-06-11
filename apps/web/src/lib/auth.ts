import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), userId: null };
  }
  return { error: null, userId };
}

export async function requireAdmin() {
  const { error, userId } = await requireAuth();
  if (error || !userId) return { error, userId: null };

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = user.publicMetadata?.role as string | undefined;
  const adminEmails = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim()).filter(Boolean);

  if (role === 'admin' || adminEmails.includes(user.emailAddresses[0]?.emailAddress || '')) {
    return { error: null, userId };
  }

  return { error: NextResponse.json({ error: 'Forbidden — admin access required' }, { status: 403 }), userId: null };
}

import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      return new Response('Webhook secret not configured', { status: 500 });
    }
    console.warn('[Clerk Webhook] CLERK_WEBHOOK_SECRET not set — skipping verification in development');
    return NextResponse.json({ received: true });
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, { 'svix-id': svix_id, 'svix-timestamp': svix_timestamp, 'svix-signature': svix_signature }) as WebhookEvent;
  } catch (err) {
    console.error('[Clerk Webhook] Verification failed:', err);
    return new Response('Verification failed', { status: 401 });
  }

  const eventType = evt.type;
  console.log(`[Clerk Webhook] Received: ${eventType}`, evt.data.id);

  // TODO: Sync user data to database when users table is added

  return NextResponse.json({ received: true });
}

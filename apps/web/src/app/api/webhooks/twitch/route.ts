import { NextRequest, NextResponse } from 'next/server';
import { QUEUES } from '@streamz/shared';
import { redisConnection } from '@/lib/redis';

// ---- Twitch EventSub Webhook Handler ----
// Handles Twitch EventSub notifications for stream online/offline events

export async function GET(request: NextRequest) {
  // Twitch EventSub subscription verification (challenge response)
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode') || searchParams.get('mode');

  // Handle Twitch's challenge verification
  const challenge = request.headers.get('twitch-eventsub-challenge');
  if (challenge) {
    // Verify the signature
    const messageId = request.headers.get('twitch-eventsub-message-id') ?? '';
    const timestamp = request.headers.get('twitch-eventsub-message-timestamp') ?? '';
    const signature = request.headers.get('twitch-eventsub-message-signature') ?? '';

    // TODO: Verify HMAC signature using TWITCH_EVENTSUB_SECRET
    // const expectedSig = crypto
    //   .createHmac('sha256', process.env.TWITCH_EVENTSUB_SECRET!)
    //   .update(messageId + timestamp + body)
    //   .digest('hex');

    console.log('[Twitch Webhook] Challenge verification received');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ status: 'ok' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messageType = request.headers.get('twitch-eventsub-message-type');

    console.log(`[Twitch Webhook] Received ${messageType} notification`);

    // Verify signature for security
    // TODO: Implement HMAC signature verification
    // const messageId = request.headers.get('twitch-eventsub-message-id') ?? '';
    // const timestamp = request.headers.get('twitch-eventsub-message-timestamp') ?? '';

    // Handle different notification types
    switch (messageType) {
      case 'webhook_callback_verification':
        // Already handled in GET, but some setups send via POST
        const challenge = body.challenge;
        return new NextResponse(challenge, { status: 200 });

      case 'notification': {
        const subscriptionType = body.subscription?.type;

        switch (subscriptionType) {
          case 'stream.online': {
            const event = body.event;
            console.log(
              `[Twitch Webhook] Stream online: ${event.broadcaster_user_name} (${event.id})`
            );

            // Queue a capture job
            // TODO: Create stream record in DB first, then enqueue capture job
            const { Queue } = await import('bullmq');
            const captureQueue = new Queue(QUEUES.CAPTURE, { connection: redisConnection });

            await captureQueue.add(
              'capture-twitch',
              {
                streamId: event.id, // TODO: Use DB-generated stream ID
                platform: 'twitch',
                platformStreamId: event.id,
                channelName: event.broadcaster_user_login,
                startedAt: new Date().toISOString(),
              },
              {
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
              }
            );

            console.log('[Twitch Webhook] Capture job queued');
            break;
          }

          case 'stream.offline': {
            const event = body.event;
            console.log(
              `[Twitch Webhook] Stream offline: ${event.broadcaster_user_name}`
            );

            // TODO: Update stream record status to 'captured'
            // TODO: Queue highlight detection job
            break;
          }

          default:
            console.log(`[Twitch Webhook] Unhandled subscription type: ${subscriptionType}`);
        }
        break;
      }

      case 'revocation':
        console.warn('[Twitch Webhook] Subscription revoked:', body.subscription?.type);
        break;

      default:
        console.log(`[Twitch Webhook] Unhandled message type: ${messageType}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[Twitch Webhook] Error processing notification:', error);
    return NextResponse.json(
      { error: 'Failed to process notification' },
      { status: 500 }
    );
  }
}

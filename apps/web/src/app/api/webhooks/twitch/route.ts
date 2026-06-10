import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { QUEUES, RETRY_CONFIG } from '@streamz/shared';
import { redisConnection } from '@/lib/redis';
import sql from '@/lib/db';

// ---- Twitch EventSub Webhook Handler ----
// Handles Twitch EventSub notifications for stream online/offline events.
// Verifies HMAC signatures for security, creates stream records in DB,
// and enqueues capture jobs.

const TWITCH_EVENTSUB_SECRET = process.env.TWITCH_EVENTSUB_SECRET || '';

// ---- HMAC Signature Verification ----
function verifyTwitchSignature(
  messageId: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  if (!TWITCH_EVENTSUB_SECRET) {
    console.warn('[Twitch Webhook] TWITCH_EVENTSUB_SECRET not set, skipping signature verification');
    return true; // Allow in development
  }

  // Twitch uses HMAC-SHA256 with the message ID + timestamp + body as the message
  const message = messageId + timestamp + body;

  const expectedSig = 'sha256=' + createHmac('sha256', TWITCH_EVENTSUB_SECRET)
    .update(message)
    .digest('hex');

  try {
    // Use timing-safe comparison to prevent timing attacks
    const sigBuffer = Buffer.from(signature, 'utf-8');
    const expectedBuffer = Buffer.from(expectedSig, 'utf-8');

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return createHmac('sha256', 'dummy') // Just for the timing-safe compare
      .update(sigBuffer)
      .digest()
      .equals(
        createHmac('sha256', 'dummy')
          .update(expectedBuffer)
          .digest()
      ) && signature === expectedSig; // Direct comparison as fallback
  } catch {
    return signature === expectedSig;
  }
}

// ---- GET: Challenge Verification ----
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Twitch EventSub sends challenge verification via GET with specific headers
  const challenge = request.headers.get('twitch-eventsub-challenge');

  if (challenge) {
    const messageId = request.headers.get('twitch-eventsub-message-id') ?? '';
    const timestamp = request.headers.get('twitch-eventsub-message-timestamp') ?? '';
    const signature = request.headers.get('twitch-eventsub-message-signature') ?? '';

    // Verify the signature for security
    // Note: For GET requests, the body is empty
    if (signature && !verifyTwitchSignature(messageId, timestamp, '', signature)) {
      console.warn('[Twitch Webhook] Challenge verification failed: invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    console.log('[Twitch Webhook] Challenge verification successful');
    // Must respond with the challenge value to confirm subscription
    return new NextResponse(challenge, { status: 200 });
  }

  // Legacy hub.mode verification (for older integrations)
  const mode = searchParams.get('hub.mode');
  const hubChallenge = searchParams.get('hub.challenge');

  if ((mode === 'subscribe' || mode === 'unsubscribe') && hubChallenge) {
    console.log(`[Twitch Webhook] Hub ${mode} verification`);
    return new NextResponse(hubChallenge, { status: 200 });
  }

  return NextResponse.json({ status: 'ok' });
}

// ---- POST: Event Notification ----
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const messageType = request.headers.get('twitch-eventsub-message-type');

    console.log(`[Twitch Webhook] Received ${messageType} notification`);

    // ---- Verify Signature ----
    const messageId = request.headers.get('twitch-eventsub-message-id') ?? '';
    const timestamp = request.headers.get('twitch-eventsub-message-timestamp') ?? '';
    const signature = request.headers.get('twitch-eventsub-message-signature') ?? '';

    if (!verifyTwitchSignature(messageId, timestamp, rawBody, signature)) {
      console.warn('[Twitch Webhook] Notification verification failed: invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // Parse the body
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error('[Twitch Webhook] Failed to parse request body');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // ---- Handle Notification Types ----
    switch (messageType) {
      case 'webhook_callback_verification': {
        const challenge = body.challenge as string;
        console.log('[Twitch Webhook] Callback verification via POST');
        return new NextResponse(challenge, { status: 200 });
      }

      case 'notification': {
        const subscription = body.subscription as { type?: string; condition?: Record<string, unknown> } | undefined;
        const subscriptionType = subscription?.type;

        switch (subscriptionType) {
          case 'stream.online': {
            const event = body.event as {
              id: string;
              broadcaster_user_id: string;
              broadcaster_user_login: string;
              broadcaster_user_name: string;
              type: string;
              started_at: string;
            };

            if (!event) {
              console.warn('[Twitch Webhook] Missing event data in stream.online notification');
              break;
            }

            console.log(
              `[Twitch Webhook] Stream online: ${event.broadcaster_user_name} (${event.id})`
            );

            try {
              // ---- Create stream record in database ----
              const [stream] = await sql`
                INSERT INTO streams (platform, platform_stream_id, title, game_category, started_at, status)
                VALUES (
                  'twitch'::platform_type,
                  ${event.id},
                  ${`Stream by ${event.broadcaster_user_name}`},
                  NULL,
                  ${event.started_at ? new Date(event.started_at) : new Date()}::timestamptz,
                  'detected'::stream_status
                )
                ON CONFLICT (platform, platform_stream_id) DO UPDATE SET
                  status = 'detected'::stream_status,
                  started_at = ${event.started_at ? new Date(event.started_at) : new Date()}::timestamptz
                RETURNING *
              `;

              if (!stream) {
                console.error('[Twitch Webhook] Failed to create stream record');
                break;
              }

              console.log(`[Twitch Webhook] Created stream record: ${stream.id}`);

              // ---- Update status to 'capturing' and enqueue capture job ----
              await sql`
                UPDATE streams SET status = 'capturing'::stream_status WHERE id = ${stream.id}
              `;

              const { Queue } = await import('bullmq');
              const captureQueue = new Queue(QUEUES.CAPTURE, { connection: redisConnection });

              const captureJob = await captureQueue.add(
                'capture-twitch',
                {
                  streamId: stream.id,
                  platform: 'twitch',
                  platformStreamId: event.id,
                  channelName: event.broadcaster_user_login,
                  startedAt: event.started_at || new Date().toISOString(),
                },
                {
                  attempts: RETRY_CONFIG.MAX_RETRIES,
                  backoff: { type: 'exponential', delay: RETRY_CONFIG.BACKOFF_BASE_MS },
                  removeOnComplete: { count: 100 },
                  removeOnFail: { count: 50 },
                }
              );

              console.log(
                `[Twitch Webhook] Capture job queued: ${captureJob.id} for stream ${stream.id}`
              );

              // Close the queue connection (don't need it hanging around in a serverless function)
              await captureQueue.close();
            } catch (dbErr) {
              console.error('[Twitch Webhook] Database error creating stream:', dbErr);
            }
            break;
          }

          case 'stream.offline': {
            const event = body.event as {
              broadcaster_user_id: string;
              broadcaster_user_login: string;
              broadcaster_user_name: string;
            };

            if (!event) {
              console.warn('[Twitch Webhook] Missing event data in stream.offline notification');
              break;
            }

            console.log(
              `[Twitch Webhook] Stream offline: ${event.broadcaster_user_name}`
            );

            try {
              // Find the active stream for this broadcaster and update status
              const [activeStream] = await sql`
                SELECT id FROM streams
                WHERE platform = 'twitch'::platform_type
                AND platform_stream_id IN (
                  SELECT platform_stream_id FROM streams
                  WHERE platform = 'twitch'::platform_type
                  AND status IN ('detected'::stream_status, 'capturing'::stream_status)
                )
                ORDER BY started_at DESC
                LIMIT 1
              `;

              if (activeStream) {
                await sql`
                  UPDATE streams
                  SET ended_at = NOW()::timestamptz,
                      status = 'captured'::stream_status
                  WHERE id = ${activeStream.id} AND status IN ('detected'::stream_status, 'capturing'::stream_status)
                `;
                console.log(`[Twitch Webhook] Updated stream ${activeStream.id} status to 'captured'`);
              }
            } catch (dbErr) {
              console.error('[Twitch Webhook] Database error updating stream offline:', dbErr);
            }
            break;
          }

          case 'channel.update': {
            const event = body.event as {
              broadcaster_user_id: string;
              broadcaster_user_login: string;
              title?: string;
              category_name?: string;
            };

            if (event) {
              console.log(
                `[Twitch Webhook] Channel update: ${event.broadcaster_user_login} - title="${event.title}", category="${event.category_name}"`
              );

              // Update stream metadata
              try {
                await sql`
                  UPDATE streams
                  SET title = COALESCE(${event.title}, title),
                      game_category = COALESCE(${event.category_name}, game_category)
                  WHERE platform = 'twitch'::platform_type
                  AND status IN ('detected'::stream_status, 'capturing'::stream_status)
                  ORDER BY started_at DESC
                  LIMIT 1
                `;
              } catch (dbErr) {
                console.error('[Twitch Webhook] Error updating stream metadata:', dbErr);
              }
            }
            break;
          }

          default:
            console.log(`[Twitch Webhook] Unhandled subscription type: ${subscriptionType}`);
        }
        break;
      }

      case 'revocation':
        console.warn('[Twitch Webhook] Subscription revoked:', (body as { subscription?: { type?: string } }).subscription?.type);
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

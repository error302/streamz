import { NextRequest, NextResponse } from 'next/server';
import { QUEUES } from '@streamz/shared';

// ---- YouTube Push Notification Handler ----
// Handles YouTube PubSubHubbub / push notifications for live stream events

export async function GET(request: NextRequest) {
  // YouTube push notification verification (hub.challenge)
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const challenge = searchParams.get('hub.challenge');
  const topic = searchParams.get('hub.topic');
  const leaseSeconds = searchParams.get('hub.lease_seconds');

  if (mode === 'subscribe' && challenge) {
    console.log(
      `[YouTube Webhook] Subscription confirmed for topic: ${topic}, lease: ${leaseSeconds}s`
    );
    // Respond with the challenge to confirm subscription
    return new NextResponse(challenge, { status: 200 });
  }

  if (mode === 'unsubscribe' && challenge) {
    console.log(`[YouTube Webhook] Unsubscribe confirmed for topic: ${topic}`);
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ status: 'ok' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // YouTube sends Atom/XML feed data
    // TODO: Parse the Atom feed XML to extract video/stream info
    console.log('[YouTube Webhook] Received push notification');

    // Verify the signature if present
    const signature = request.headers.get('x-hub-signature');
    if (signature && process.env.YOUTUBE_WEBHOOK_SECRET) {
      // TODO: Verify HMAC signature
      // const crypto = await import('crypto');
      // const expectedSig = 'sha1=' + crypto
      //   .createHmac('sha1', process.env.YOUTUBE_WEBHOOK_SECRET)
      //   .update(body)
      //   .digest('hex');
      console.log('[YouTube Webhook] Signature present, verification TODO');
    }

    // Parse the XML feed
    // TODO: Implement proper Atom feed parsing
    // For now, extract basic info from the raw XML
    const titleMatch = body.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
      body.match(/<title>(.*?)<\/title>/);
    const videoIdMatch = body.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
    const channelIdMatch = body.match(/<yt:channelId>(.*?)<\/yt:channelId>/);

    if (videoIdMatch) {
      const videoId = videoIdMatch[1];
      const channelId = channelIdMatch?.[1] ?? '';
      const title = titleMatch?.[1] ?? 'Untitled Stream';

      console.log(
        `[YouTube Webhook] Video/Stream detected: ${title} (${videoId}) from channel ${channelId}`
      );

      // Check if this is a live stream (YouTube API would be needed)
      // TODO: Check video status via YouTube Data API to confirm it's a live stream
      // TODO: Create stream record in DB if it's a live stream
      // TODO: Queue capture job if live

      // Placeholder: Queue capture job
      const { Queue } = await import('bullmq');
      const { redisConnection } = await import('@/lib/redis');
      const captureQueue = new Queue(QUEUES.CAPTURE, { connection: redisConnection });

      await captureQueue.add(
        'capture-youtube',
        {
          streamId: videoId, // TODO: Use DB-generated stream ID
          platform: 'youtube',
          platformStreamId: videoId,
          channelName: channelId,
          startedAt: new Date().toISOString(),
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }
      );

      console.log('[YouTube Webhook] Capture job queued');
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[YouTube Webhook] Error processing notification:', error);
    return NextResponse.json(
      { error: 'Failed to process notification' },
      { status: 500 }
    );
  }
}

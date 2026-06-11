import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { QUEUES, RETRY_CONFIG } from '@streamz/shared';
import { getQueue } from '@streamz/shared';
import sql from '@/lib/db';

// ---- YouTube Push Notification Handler ----
// Handles YouTube PubSubHubbub / push notifications for live stream events.
// Verifies HMAC signatures, parses Atom feed XML, creates stream records,
// and enqueues capture jobs.

const YOUTUBE_WEBHOOK_SECRET = process.env.YOUTUBE_WEBHOOK_SECRET || '';

// ---- HMAC Signature Verification (timing-safe) ----
function verifyYouTubeSignature(body: string, signature: string): boolean {
  // SECURITY: If secret is missing in production, fail closed
  if (!YOUTUBE_WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[YouTube Webhook] YOUTUBE_WEBHOOK_SECRET not set in production — REJECTING');
      return false;
    }
    console.warn('[YouTube Webhook] YOUTUBE_WEBHOOK_SECRET not set, skipping signature verification (dev only)');
    return true;
  }

  // YouTube uses HMAC-SHA1 for push notifications
  const expectedSig = 'sha1=' + createHmac('sha1', YOUTUBE_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  // Use timingSafeEqual for constant-time comparison (prevents timing attacks)
  try {
    const sigBuffer = Buffer.from(signature, 'utf-8');
    const expectedBuffer = Buffer.from(expectedSig, 'utf-8');

    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

// ---- Atom Feed XML Parser ----
interface YouTubeFeedEntry {
  videoId: string;
  channelId: string;
  title: string;
  publishedAt: string;
  updated: string;
  author: string;
}

function parseAtomFeed(xml: string): YouTubeFeedEntry[] {
  const entries: YouTubeFeedEntry[] = [];

  // Simple XML parsing for Atom feed
  // Split by <entry> tags to find individual entries
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];

    // Extract video ID
    const videoIdMatch = entryXml.match(/<yt:videoId>(.*?)<\/yt:videoId>/) ||
      entryXml.match(/<id>.*?:video:(.*?)<\/id>/);
    const videoId = videoIdMatch?.[1] || '';

    // Extract channel ID
    const channelIdMatch = entryXml.match(/<yt:channelId>(.*?)<\/yt:channelId>/) ||
      entryXml.match(/<uri>.*?\/channel\/(.*?)<\/uri>/);
    const channelId = channelIdMatch?.[1] || '';

    // Extract title (handle CDATA)
    const titleMatch = entryXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
      entryXml.match(/<title>(.*?)<\/title>/);
    const title = titleMatch?.[1] || 'Untitled Stream';

    // Extract published date
    const publishedMatch = entryXml.match(/<published>(.*?)<\/published>/);
    const publishedAt = publishedMatch?.[1] || new Date().toISOString();

    // Extract updated date
    const updatedMatch = entryXml.match(/<updated>(.*?)<\/updated>/);
    const updated = updatedMatch?.[1] || publishedAt;

    // Extract author name
    const authorMatch = entryXml.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/) ||
      entryXml.match(/<name>(.*?)<\/name>/);
    const author = authorMatch?.[1] || '';

    if (videoId) {
      entries.push({
        videoId,
        channelId,
        title,
        publishedAt,
        updated,
        author,
      });
    }
  }

  return entries;
}

// ---- Check if Video is a Live Stream via YouTube API ----
async function checkIfLiveStream(videoId: string): Promise<{
  isLive: boolean;
  title: string;
  channelId: string;
  description: string;
}> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn('[YouTube Webhook] YOUTUBE_API_KEY not set, assuming video is a live stream');
    return { isLive: true, title: '', channelId: '', description: '' };
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}&key=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      console.warn(`[YouTube Webhook] YouTube API error: ${response.status}`);
      return { isLive: false, title: '', channelId: '', description: '' };
    }

    const data = await response.json();
    const video = data.items?.[0];

    if (!video) {
      return { isLive: false, title: '', channelId: '', description: '' };
    }

    const isLive = !!video.liveStreamingDetails &&
      (video.liveStreamingDetails.actualStartTime && !video.liveStreamingDetails.actualEndTime);

    return {
      isLive,
      title: video.snippet?.title || '',
      channelId: video.snippet?.channelId || '',
      description: video.snippet?.description || '',
    };
  } catch (err) {
    console.error(`[YouTube Webhook] Error checking live status: ${err}`);
    return { isLive: false, title: '', channelId: '', description: '' };
  }
}

// ---- GET: Subscription Verification ----
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const challenge = searchParams.get('hub.challenge');
  const topic = searchParams.get('hub.topic');
  const leaseSeconds = searchParams.get('hub.lease_seconds');
  const reason = searchParams.get('hub.reason');

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

  if (mode === 'denied') {
    console.warn(`[YouTube Webhook] Subscription denied for topic: ${topic}, reason: ${reason}`);
    return NextResponse.json({ status: 'denied' }, { status: 200 });
  }

  return NextResponse.json({ status: 'ok' });
}

// ---- POST: Push Notification ----
export async function POST(request: NextRequest) {
  try {
    // SECURITY: If secret is missing in production, return 500
    if (!YOUTUBE_WEBHOOK_SECRET && process.env.NODE_ENV === 'production') {
      console.error('[YouTube Webhook] YOUTUBE_WEBHOOK_SECRET not set in production');
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      );
    }

    const rawBody = await request.text();

    console.log('[YouTube Webhook] Received push notification');

    // ---- Verify Signature ----
    const signature = request.headers.get('x-hub-signature');

    // SECURITY: Reject missing signature header with 403
    if (!signature) {
      if (YOUTUBE_WEBHOOK_SECRET) {
        console.warn('[YouTube Webhook] Missing signature header — REJECTING');
        return NextResponse.json({ error: 'Missing signature' }, { status: 403 });
      }
      // If no secret configured (dev only), allow through
    } else if (YOUTUBE_WEBHOOK_SECRET) {
      if (!verifyYouTubeSignature(rawBody, signature)) {
        console.warn('[YouTube Webhook] Signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
      console.log('[YouTube Webhook] Signature verified');
    }

    // ---- Parse Atom Feed ----
    const entries = parseAtomFeed(rawBody);

    if (entries.length === 0) {
      console.log('[YouTube Webhook] No entries found in feed');
      return NextResponse.json({ received: true, entries: 0 }, { status: 200 });
    }

    console.log(`[YouTube Webhook] Found ${entries.length} entries in feed`);

    // ---- Process Each Entry ----
    for (const entry of entries) {
      console.log(
        `[YouTube Webhook] Processing entry: ${entry.title} (${entry.videoId}) from ${entry.author || entry.channelId}`
      );

      try {
        // Check if this is a live stream via YouTube API
        const liveInfo = await checkIfLiveStream(entry.videoId);

        if (!liveInfo.isLive) {
          console.log(`[YouTube Webhook] Video ${entry.videoId} is not a live stream, skipping`);
          continue;
        }

        console.log(`[YouTube Webhook] Live stream detected: ${entry.videoId}`);

        // ---- Transaction: Create stream record + update status atomically ----
        const streamTitle = liveInfo.title || entry.title || 'Untitled Stream';

        await sql.begin(async (tx) => {
          const [stream] = await tx`
            INSERT INTO streams (platform, platform_stream_id, title, game_category, started_at, status)
            VALUES (
              'youtube'::platform_type,
              ${entry.videoId},
              ${streamTitle},
              NULL,
              ${entry.publishedAt ? new Date(entry.publishedAt) : new Date()}::timestamptz,
              'capturing'::stream_status
            )
            ON CONFLICT (platform, platform_stream_id) DO UPDATE SET
              title = ${streamTitle},
              status = 'capturing'::stream_status,
              started_at = ${entry.publishedAt ? new Date(entry.publishedAt) : new Date()}::timestamptz
            RETURNING *
          `;

          if (!stream) {
            throw new Error('Failed to create stream record');
          }

          console.log(`[YouTube Webhook] Created stream record: ${stream.id}`);

          // Enqueue capture job
          const captureQueue = getQueue(QUEUES.CAPTURE);

          const captureJob = await captureQueue.add(
            'capture-youtube',
            {
              streamId: stream.id,
              platform: 'youtube',
              platformStreamId: entry.videoId,
              channelName: entry.channelId || entry.author,
              startedAt: entry.publishedAt || new Date().toISOString(),
            },
            {
              attempts: RETRY_CONFIG.MAX_RETRIES,
              backoff: { type: 'exponential', delay: RETRY_CONFIG.BACKOFF_BASE_MS },
              removeOnComplete: { count: 100 },
              removeOnFail: { count: 50 },
            }
          );

          console.log(
            `[YouTube Webhook] Capture job queued: ${captureJob.id} for stream ${stream.id}`
          );
        });
      } catch (entryErr) {
        console.error(
          `[YouTube Webhook] Error processing entry ${entry.videoId}:`,
          entryErr
        );
        // Continue processing other entries
      }
    }

    return NextResponse.json({ received: true, entries: entries.length }, { status: 200 });
  } catch (error) {
    console.error('[YouTube Webhook] Error processing notification:', error);
    return NextResponse.json(
      { error: 'Failed to process notification' },
      { status: 500 }
    );
  }
}

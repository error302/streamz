// ============================================
// StreamZ - Unified S3/R2 Storage Client
// ============================================
// Lazy singleton S3Client — created on first use, NOT at import time.
// All downloads use streaming (pipeline/readable stream) to avoid loading
// entire files into RAM.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as getPresignedUrl } from '@aws-sdk/s3-request-presigner';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { Readable } from 'stream';

// ---- Lazy Singleton S3 Client ----

let _s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (_s3Client) return _s3Client;

  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  // Security: In production, credentials MUST be present
  if (process.env.NODE_ENV === 'production') {
    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        '[Storage] S3 credentials are required in production. ' +
        'Set S3_ENDPOINT, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY environment variables.'
      );
    }
  } else {
    // Development: warn but allow with defaults
    if (!endpoint || !accessKeyId || !secretAccessKey) {
      console.warn(
        '[Storage] S3 credentials not fully configured. Using development defaults. ' +
        'Set S3_ENDPOINT, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY for production.'
      );
    }
  }

  _s3Client = new S3Client({
    endpoint: endpoint || 'http://localhost:9000',
    region: process.env.S3_REGION || 'auto',
    credentials: {
      accessKeyId: accessKeyId || 'minioadmin',
      secretAccessKey: secretAccessKey || 'minioadmin',
    },
    forcePathStyle: true,
  });

  return _s3Client;
}

const BUCKET = () => process.env.S3_BUCKET || 'streamz';

// ---- Upload Operations ----

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string | Readable,
  contentType?: string
): Promise<{ key: string; bucket: string }> {
  const command = new PutObjectCommand({
    Bucket: BUCKET(),
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await getS3Client().send(command);
  console.log(`[Storage] Uploaded: ${key}`);
  return { key, bucket: BUCKET() };
}

// ---- Download Operations (STREAMING — never loads entire file into RAM) ----

/**
 * Download a file as a streaming Readable stream.
 * CRITICAL: This returns a Node.js Readable stream — the caller MUST consume it
 * (e.g. pipe to a file, collect chunks) to avoid memory leaks.
 * NEVER use transformToByteArray() or Buffer.concat() on the body.
 */
export async function downloadFile(key: string): Promise<Readable> {
  const command = new GetObjectCommand({
    Bucket: BUCKET(),
    Key: key,
  });

  const response = await getS3Client().send(command);

  if (!response.Body) {
    throw new Error(`[Storage] Empty response body for key: ${key}`);
  }

  // Convert the SDK stream to a Node.js Readable stream
  // The AWS SDK v3 returns a ReadableStream (web stream) in Node.js
  const sdkStream = response.Body;
  if (sdkStream instanceof Readable) {
    return sdkStream;
  }

  // Handle web ReadableStream by converting to Node Readable
  return Readable.fromWeb(sdkStream as any);
}

/**
 * Stream download directly to a local file path using pipeline().
 * This is the recommended way to download large files — it never loads
 * the entire file into RAM.
 */
export async function downloadToPath(key: string, localPath: string): Promise<void> {
  const readable = await downloadFile(key);
  const writeStream = createWriteStream(localPath);

  await pipeline(readable, writeStream);
  console.log(`[Storage] Downloaded: ${key} -> ${localPath}`);
}

// ---- Presigned URLs ----

export async function getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET(),
    Key: key,
  });

  return getPresignedUrl(getS3Client(), command, { expiresIn });
}

export async function getSignedUploadUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET(),
    Key: key,
  });

  return getPresignedUrl(getS3Client(), command, { expiresIn });
}

// ---- File Info ----

export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({ Bucket: BUCKET(), Key: key });
    await getS3Client().send(command);
    return true;
  } catch {
    return false;
  }
}

// ---- Delete Operations ----

export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET(),
    Key: key,
  });

  await getS3Client().send(command);
  console.log(`[Storage] Deleted: ${key}`);
}

// ---- Public URL Helper ----

export function getPublicUrl(key: string): string {
  const publicUrl = process.env.S3_PUBLIC_URL || `http://localhost:9000/${BUCKET()}`;
  return `${publicUrl}/${key}`;
}

// ---- Re-export client for advanced usage ----

export { getS3Client as s3Client };

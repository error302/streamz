// ============================================
// StreamZ - Cloudflare R2 / S3 Storage Client
// ============================================

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configure S3 client for Cloudflare R2 (or MinIO in dev)
export const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
  },
  // Required for R2 compatibility
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET || 'streamz';

// ---- Upload Operations ----

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string
) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3Client.send(command);
  console.log(`[Storage] Uploaded: ${key}`);
  return { key, bucket: BUCKET };
}

// ---- Download Operations ----

export async function downloadFile(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  const bytes = await response.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

// ---- File Info ----

export async function fileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({ Bucket: BUCKET, Key: key });
    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
}

// ---- Delete Operations ----

export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3Client.send(command);
  console.log(`[Storage] Deleted: ${key}`);
}

// ---- Public URL Helper ----

export function getPublicUrl(key: string): string {
  const publicUrl = process.env.S3_PUBLIC_URL || `http://localhost:9000/${BUCKET}`;
  return `${publicUrl}/${key}`;
}

// ============================================
// StreamZ - S3 Storage Client (Capture Worker)
// ============================================

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

// Configure S3 client for Cloudflare R2 (or MinIO in dev)
export const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  region: process.env.S3_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET || 'streamz';

// ---- Upload Operations ----

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string
): Promise<{ key: string; bucket: string }> {
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

// ---- Stream Download (for large files) ----

export async function downloadFileToPath(key: string, destPath: string): Promise<void> {
  const { createWriteStream } = await import('fs');
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  const body = response.Body;

  if (!body) {
    throw new Error(`Empty response body for key: ${key}`);
  }

  const bytes = await body.transformToByteArray();
  const { writeFile } = await import('fs/promises');
  await writeFile(destPath, Buffer.from(bytes));
  console.log(`[Storage] Downloaded: ${key} -> ${destPath}`);
}

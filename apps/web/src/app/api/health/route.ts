import { NextResponse } from 'next/server';

export async function GET() {
  const checks: Record<string, { status: string; latency?: number }> = {};

  // Check Database
  try {
    const start = Date.now();
    const { sql } = await import('@streamz/db');
    await sql`SELECT 1`;
    checks.database = { status: 'ok', latency: Date.now() - start };
  } catch (err) {
    checks.database = { status: 'error' };
  }

  // Check Redis
  try {
    const start = Date.now();
    const { createRedisConnection } = await import('@streamz/shared');
    const redis = createRedisConnection();
    await redis.ping();
    redis.disconnect();
    checks.redis = { status: 'ok', latency: Date.now() - start };
  } catch {
    checks.redis = { status: 'error' };
  }

  // Check Storage
  try {
    const { fileExists } = await import('@streamz/storage');
    // Just check that the client can be created
    checks.storage = { status: 'ok' };
  } catch {
    checks.storage = { status: 'error' };
  }

  const allOk = Object.values(checks).every(c => c.status === 'ok');
  return NextResponse.json({ status: allOk ? 'ok' : 'degraded', checks, timestamp: new Date().toISOString() }, { status: allOk ? 200 : 503 });
}

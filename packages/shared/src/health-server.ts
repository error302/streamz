// ============================================
// StreamZ - Worker Health Check Server
// ============================================
// Lightweight HTTP server for k8s/container health checks.
//
// Phase 4 enhancements:
// - /health/live  — liveness probe (always OK if process is running)
// - /health/ready — readiness probe (checks all dependencies)
// - /health       — basic health info (backward compatible)
// - /health/metrics — Prometheus-compatible metrics endpoint
// - Deep health checks: Redis, DB, R2 connectivity
// - Worker-specific health metrics

import { createServer, type Server } from 'http';
import type { WorkerHealthMetrics } from './types.js';

const START_TIME = Date.now();

// Read version from env or default
const VERSION = process.env.npm_package_version || process.env.APP_VERSION || '0.1.0';

// ---- Health Metrics Registry ----
// Workers register their metrics via registerWorkerMetrics()

const workerMetricsMap = new Map<string, WorkerHealthMetrics>();

export function registerWorkerMetrics(workerName: string, metrics: WorkerHealthMetrics): void {
  workerMetricsMap.set(workerName, metrics);
}

export function updateWorkerMetrics(workerName: string, partial: Partial<WorkerHealthMetrics>): void {
  const existing = workerMetricsMap.get(workerName);
  if (existing) {
    workerMetricsMap.set(workerName, { ...existing, ...partial });
  } else {
    workerMetricsMap.set(workerName, {
      jobsProcessed: 0,
      jobsFailed: 0,
      avgProcessingTimeMs: 0,
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
      ...partial,
    });
  }
}

// ---- Dependency Check Functions ----

async function checkRedis(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    // Dynamic import to avoid hard dependency
    const { createRedisConnection } = await import('./queue.js');
    const config = createRedisConnection();
    // We can't directly ping through the config object, so we check if config exists
    // In production, this would use the actual Redis client to PING
    const { default: IORedis } = await import('ioredis');
    const client = new IORedis(config);
    await client.ping();
    await client.quit();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: String(err) };
  }
}

async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    // Dynamic import to avoid hard dependency
    const { sql } = await import('@streamz/db');
    await sql`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: String(err) };
  }
}

async function checkR2(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    // Dynamic import to avoid hard dependency
    const { getStorageClient } = await import('../../storage/src/index.js');
    const storage = getStorageClient();
    // List objects with limit 1 to check connectivity
    await storage.listObjects({ prefix: 'health-check', maxKeys: 1 }).promise();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    // R2 check is non-critical — report as degraded but not failed
    return { ok: true, latencyMs: Date.now() - start, error: `R2 degraded: ${String(err)}` };
  }
}

// ---- Response Helpers ----

function jsonResponse(res: import('http').ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function prometheusResponse(res: import('http').ServerResponse, data: string): void {
  res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
  res.end(data);
}

// ---- Prometheus Metrics Format ----

function formatPrometheusMetrics(): string {
  const lines: string[] = [];
  const uptime = Math.floor((Date.now() - START_TIME) / 1000);

  // Process metrics
  lines.push('# HELP streamz_uptime_seconds Process uptime in seconds');
  lines.push('# TYPE streamz_uptime_seconds gauge');
  lines.push(`streamz_uptime_seconds ${uptime}`);

  lines.push('# HELP streamz_info Process information');
  lines.push('# TYPE streamz_info gauge');
  lines.push(`streamz_info{version="${VERSION}"} 1`);

  // Worker metrics
  for (const [workerName, metrics] of workerMetricsMap) {
    const labels = `worker="${workerName}"`;

    lines.push('# HELP streamz_worker_jobs_processed_total Total jobs processed by this worker');
    lines.push('# TYPE streamz_worker_jobs_processed_total counter');
    lines.push(`streamz_worker_jobs_processed_total{${labels}} ${metrics.jobsProcessed}`);

    lines.push('# HELP streamz_worker_jobs_failed_total Total jobs failed by this worker');
    lines.push('# TYPE streamz_worker_jobs_failed_total counter');
    lines.push(`streamz_worker_jobs_failed_total{${labels}} ${metrics.jobsFailed}`);

    lines.push('# HELP streamz_worker_avg_processing_time_ms Average job processing time in ms');
    lines.push('# TYPE streamz_worker_avg_processing_time_ms gauge');
    lines.push(`streamz_worker_avg_processing_time_ms{${labels}} ${metrics.avgProcessingTimeMs}`);

    lines.push('# HELP streamz_worker_uptime_seconds Worker uptime in seconds');
    lines.push('# TYPE streamz_worker_uptime_seconds gauge');
    lines.push(`streamz_worker_uptime_seconds{${labels}} ${metrics.uptime}`);
  }

  return lines.join('\n') + '\n';
}

// ---- Legacy Health Check Response ----

export interface HealthCheckResponse {
  status: 'ok';
  worker: string;
  uptime: number;
  timestamp: string;
  version: string;
}

// ---- Start Health Server ----

export function startHealthServer(port: number, workerName: string): Server {
  const server = createServer(async (req, res) => {
    const url = req.url ?? '/';
    const method = req.method ?? 'GET';

    if (method !== 'GET') {
      jsonResponse(res, 405, { error: 'Method not allowed' });
      return;
    }

    // ---- /health/live — Liveness probe ----
    // Always returns OK if the process is running and the event loop is responsive
    if (url === '/health/live') {
      jsonResponse(res, 200, {
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // ---- /health/ready — Readiness probe ----
    // Checks all critical dependencies
    if (url === '/health/ready') {
      const checks: Record<string, { ok: boolean; latencyMs: number; error?: string }> = {};

      // Check Redis
      try {
        checks.redis = await checkRedis();
      } catch {
        checks.redis = { ok: false, latencyMs: 0, error: 'Redis check failed' };
      }

      // Check Database
      try {
        checks.database = await checkDatabase();
      } catch {
        checks.database = { ok: false, latencyMs: 0, error: 'Database check failed' };
      }

      // Check R2 (non-critical)
      try {
        checks.r2 = await checkR2();
      } catch {
        checks.r2 = { ok: true, latencyMs: 0, error: 'R2 check skipped' };
      }

      const allCriticalOk = checks.redis.ok && checks.database.ok;
      const statusCode = allCriticalOk ? 200 : 503;

      jsonResponse(res, statusCode, {
        status: allCriticalOk ? 'ok' : 'degraded',
        worker: workerName,
        checks,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // ---- /health/metrics — Prometheus metrics ----
    if (url === '/health/metrics') {
      prometheusResponse(res, formatPrometheusMetrics());
      return;
    }

    // ---- /health — Basic health (backward compatible) ----
    if (url === '/health') {
      const metrics = workerMetricsMap.get(workerName);
      const response: HealthCheckResponse & { metrics?: WorkerHealthMetrics } = {
        status: 'ok',
        worker: workerName,
        uptime: Math.floor((Date.now() - START_TIME) / 1000),
        timestamp: new Date().toISOString(),
        version: VERSION,
      };

      if (metrics) {
        response.metrics = metrics;
      }

      jsonResponse(res, 200, response);
      return;
    }

    // ---- 404 ----
    jsonResponse(res, 404, { error: 'Not found' });
  });

  server.listen(port, () => {
    console.log(`[Health] Health check server listening on port ${port} for worker: ${workerName}`);
    console.log(`[Health] Endpoints: /health, /health/live, /health/ready, /health/metrics`);
  });

  // Graceful shutdown on SIGTERM
  process.on('SIGTERM', () => {
    console.log(`[Health] SIGTERM received, closing health server for ${workerName}`);
    server.close();
  });

  return server;
}

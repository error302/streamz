// ============================================
// StreamZ - Shared Queue Utilities
// ============================================
// BullMQ Redis connection factory and queue singletons.

import { Queue } from 'bullmq';

// ---- Queue Name Constants ----

export const QUEUES = {
  CAPTURE: 'capture-queue',
  HIGHLIGHT: 'highlight-queue',
  OPTIMIZE: 'optimize-queue',
  PUBLISH: 'publish-queue',
  ANALYTICS: 'analytics-queue',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

// ---- Redis Configuration ----

export function getRedisConfig() {
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null as null, // Required by BullMQ
  };
}

// ---- Create BullMQ-compatible Redis connection config ----
// Returns a plain object that BullMQ can use to create its own ioredis connection.
// This avoids ioredis version mismatch issues between packages.

export function createRedisConnection() {
  return getRedisConfig();
}

// ---- Queue Singleton Cache ----

const queueCache = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  const existing = queueCache.get(name);
  if (existing) return existing;

  const queue = new Queue(name, { connection: createRedisConnection() });
  queueCache.set(name, queue);
  return queue;
}

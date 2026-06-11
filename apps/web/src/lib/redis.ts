// ============================================
// StreamZ - Redis / BullMQ Connection (Web App)
// ============================================
// Re-exports from @streamz/shared, plus a direct Redis client for caching/pub-sub.

import { createRedisConnection, getRedisConfig } from '@streamz/shared';

// Re-export shared queue utilities
export { createRedisConnection, getRedisConfig, getQueue, QUEUES } from '@streamz/shared';

// BullMQ-compatible connection config (re-exported for backward compat)
export const redisConnection = getRedisConfig();

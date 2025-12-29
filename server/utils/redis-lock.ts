/**
 * Redis-based distributed lock for per-shop bulk operation serialization
 *
 * Shopify allows only one bulk operation per shop at a time.
 * This lock ensures we don't start a new bulk op while one is already running.
 */

import Redis from 'ioredis';
import { createLogger } from './logger.js';

const log = createLogger({ module: 'redis-lock' });

// Lock configuration
const LOCK_TTL_MS = 30 * 60 * 1000; // 30 minutes (max bulk op duration)
const LOCK_PREFIX = 'lock:bulkop:';

// Singleton Redis client for locks
let redisClient: Redis | null = null;

/**
 * Get or create Redis client for locking
 */
function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    redisClient.on('error', (err) => {
      log.error({ error: err.message }, 'Redis lock client error');
    });
  }
  return redisClient;
}

/**
 * Acquire a per-shop bulk operation lock
 *
 * @param shopDomain - Shop domain to lock
 * @param jobId - Job ID claiming the lock (for debugging)
 * @param ttlMs - Lock TTL in milliseconds (default: 30 minutes)
 * @returns true if lock acquired, false if already locked
 */
export async function acquireShopLock(
  shopDomain: string,
  jobId: string,
  ttlMs: number = LOCK_TTL_MS
): Promise<boolean> {
  const redis = getRedisClient();
  const lockKey = `${LOCK_PREFIX}${shopDomain}`;

  try {
    // SET key value NX PX ttl - atomic acquire
    const result = await redis.set(lockKey, jobId, 'PX', ttlMs, 'NX');

    if (result === 'OK') {
      log.info({ shopDomain, jobId, ttlMs }, 'Shop lock acquired');
      return true;
    }

    // Lock exists - get current holder for logging
    const currentHolder = await redis.get(lockKey);
    log.info({ shopDomain, jobId, currentHolder }, 'Shop lock already held');
    return false;
  } catch (error) {
    log.error({ error, shopDomain, jobId }, 'Failed to acquire shop lock');
    // On Redis error, allow job to proceed (fail-open for availability)
    // The Shopify API will reject if there's truly a conflict
    return true;
  }
}

/**
 * Release a per-shop bulk operation lock
 *
 * Uses Lua script for atomic check-and-delete to prevent releasing
 * a lock that was acquired by another job after TTL expired.
 *
 * @param shopDomain - Shop domain to unlock
 * @param jobId - Job ID that should hold the lock
 * @returns true if released, false if lock was not held by this job
 */
export async function releaseShopLock(
  shopDomain: string,
  jobId: string
): Promise<boolean> {
  const redis = getRedisClient();
  const lockKey = `${LOCK_PREFIX}${shopDomain}`;

  // Lua script: only delete if value matches (safe release)
  const luaScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  try {
    const result = await redis.eval(luaScript, 1, lockKey, jobId);

    if (result === 1) {
      log.info({ shopDomain, jobId }, 'Shop lock released');
      return true;
    }

    log.warn({ shopDomain, jobId }, 'Shop lock not held by this job (already released or expired)');
    return false;
  } catch (error) {
    log.error({ error, shopDomain, jobId }, 'Failed to release shop lock');
    return false;
  }
}

/**
 * Extend a lock's TTL (useful for long-running operations)
 *
 * @param shopDomain - Shop domain
 * @param jobId - Job ID that should hold the lock
 * @param ttlMs - New TTL in milliseconds
 * @returns true if extended, false if lock not held
 */
export async function extendShopLock(
  shopDomain: string,
  jobId: string,
  ttlMs: number = LOCK_TTL_MS
): Promise<boolean> {
  const redis = getRedisClient();
  const lockKey = `${LOCK_PREFIX}${shopDomain}`;

  // Lua script: only extend if we hold the lock
  const luaScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("pexpire", KEYS[1], ARGV[2])
    else
      return 0
    end
  `;

  try {
    const result = await redis.eval(luaScript, 1, lockKey, jobId, ttlMs.toString());

    if (result === 1) {
      log.debug({ shopDomain, jobId, ttlMs }, 'Shop lock extended');
      return true;
    }

    log.warn({ shopDomain, jobId }, 'Cannot extend lock - not held by this job');
    return false;
  } catch (error) {
    log.error({ error, shopDomain, jobId }, 'Failed to extend shop lock');
    return false;
  }
}

/**
 * Check if a shop is currently locked
 *
 * @param shopDomain - Shop domain to check
 * @returns Lock holder job ID or null if not locked
 */
export async function getShopLockHolder(shopDomain: string): Promise<string | null> {
  const redis = getRedisClient();
  const lockKey = `${LOCK_PREFIX}${shopDomain}`;

  try {
    return await redis.get(lockKey);
  } catch (error) {
    log.error({ error, shopDomain }, 'Failed to check shop lock');
    return null;
  }
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeLockClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    log.info('Redis lock client closed');
  }
}

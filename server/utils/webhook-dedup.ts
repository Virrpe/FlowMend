/**
 * Webhook Deduplication using Redis
 *
 * Prevents duplicate job creation when Shopify replays webhooks.
 * Uses X-Shopify-Webhook-Id header to track processed webhooks.
 */

import Redis from 'ioredis';
import { createLogger } from './logger.js';

const log = createLogger({ module: 'webhook-dedup' });

// Dedup configuration
const WEBHOOK_ID_TTL_SECONDS = 48 * 60 * 60; // 48 hours (Shopify retry window)
const WEBHOOK_ID_PREFIX = 'webhook:processed:';

// Singleton Redis client
let redisClient: Redis | null = null;

/**
 * Get or create Redis client for deduplication
 */
function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    redisClient.on('error', (err) => {
      log.error({ error: err.message }, 'Redis dedup client error');
    });
  }
  return redisClient;
}

/**
 * Check if a webhook has already been processed
 *
 * @param webhookId - X-Shopify-Webhook-Id header value
 * @returns true if already processed, false if new
 */
export async function isWebhookProcessed(webhookId: string): Promise<boolean> {
  if (!webhookId) {
    log.warn('No webhook ID provided, skipping dedup check');
    return false;
  }

  const redis = getRedisClient();
  const key = `${WEBHOOK_ID_PREFIX}${webhookId}`;

  try {
    const exists = await redis.exists(key);
    if (exists) {
      log.info({ webhookId }, 'Duplicate webhook detected');
      return true;
    }
    return false;
  } catch (error) {
    log.error({ error, webhookId }, 'Failed to check webhook dedup');
    // Fail open - allow processing if Redis is unavailable
    return false;
  }
}

/**
 * Mark a webhook as processed
 *
 * @param webhookId - X-Shopify-Webhook-Id header value
 * @param jobId - Job ID created for this webhook
 */
export async function markWebhookProcessed(
  webhookId: string,
  jobId: string
): Promise<void> {
  if (!webhookId) {
    log.warn('No webhook ID provided, skipping dedup mark');
    return;
  }

  const redis = getRedisClient();
  const key = `${WEBHOOK_ID_PREFIX}${webhookId}`;

  try {
    await redis.setex(key, WEBHOOK_ID_TTL_SECONDS, jobId);
    log.debug({ webhookId, jobId }, 'Webhook marked as processed');
  } catch (error) {
    log.error({ error, webhookId }, 'Failed to mark webhook as processed');
    // Non-fatal - job was already created
  }
}

/**
 * Get the job ID associated with a processed webhook
 *
 * @param webhookId - X-Shopify-Webhook-Id header value
 * @returns Job ID if webhook was processed, null otherwise
 */
export async function getWebhookJobId(webhookId: string): Promise<string | null> {
  if (!webhookId) {
    return null;
  }

  const redis = getRedisClient();
  const key = `${WEBHOOK_ID_PREFIX}${webhookId}`;

  try {
    return await redis.get(key);
  } catch (error) {
    log.error({ error, webhookId }, 'Failed to get webhook job ID');
    return null;
  }
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeDedupClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    log.info('Redis dedup client closed');
  }
}

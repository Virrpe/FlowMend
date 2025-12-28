/**
 * Job Enqueuer (BullMQ Producer)
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';
import logger from '../utils/logger.js';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Create BullMQ queue
export const jobQueue = new Queue('flowmend-jobs', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minute initial delay
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

/**
 * Enqueue a job for processing
 *
 * @param jobId - UUID of job to process
 * @param shopId - Shopify shop domain
 */
export async function enqueueJob(jobId: string, shopId: string): Promise<void> {
  // TODO: Implement job enqueueing
  // 1. Add job to BullMQ queue
  // 2. Use shop ID as concurrency key (1 job per shop)
  // 3. Log enqueue event

  await jobQueue.add(
    'process-job',
    { jobId, shopId },
    {
      jobId, // Use job UUID as BullMQ job ID for deduplication
      // Per-shop concurrency control (BullMQ will handle via rate limiter)
    }
  );

  logger.info({ jobId, shopId }, 'Job enqueued');
}

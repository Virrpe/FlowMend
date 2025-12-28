/**
 * Job Worker (BullMQ Consumer)
 * Processes jobs from the queue
 */

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import logger from '../utils/logger.js';
import { processJob } from './worker-test-helper.js';

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// Create and start worker
const worker = new Worker(
  'flowmend-jobs',
  async (job) => {
    const { jobId, shopId } = job.data;
    await processJob(jobId, shopId);
  },
  {
    connection,
    concurrency: 1, // Process 1 job at a time per worker (per-shop concurrency handled via job data)
  }
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.data.jobId }, 'Job completed successfully');
});

worker.on('failed', (job, error) => {
  logger.error({ jobId: job?.data.jobId, error }, 'Job failed');
});

logger.info('Job worker started');

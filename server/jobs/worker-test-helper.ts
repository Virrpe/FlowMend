/**
 * Worker Test Helper
 * Exports processJob function for testing
 */

import prisma from '../db/client.js';
import { runBulkQuery } from '../shopify/bulk-query.js';
import { runBulkMutation } from '../shopify/bulk-mutation.js';
import { createLogger } from '../utils/logger.js';
import { acquireShopLock, releaseShopLock, extendShopLock } from '../utils/redis-lock.js';

// Lock configuration
const LOCK_TTL_MS = 35 * 60 * 1000; // 35 minutes (slightly longer than max poll time)
const LOCK_EXTEND_INTERVAL_MS = 5 * 60 * 1000; // Extend every 5 minutes

/**
 * Process a job with per-shop serialization
 *
 * @param jobId - UUID of job to process
 * @param shopId - Shopify shop domain
 * @throws Error if lock cannot be acquired (triggers BullMQ retry)
 */
export async function processJob(jobId: string, shopId: string): Promise<void> {
  const log = createLogger({ jobId, shopId });

  log.info('Job processing started');

  // Fetch job and shop
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });

  if (!job || !shop) {
    throw new Error(`Job or shop not found: ${jobId}, ${shopId}`);
  }

  // B1: Acquire per-shop lock before starting bulk operation
  const lockAcquired = await acquireShopLock(shopId, jobId, LOCK_TTL_MS);

  if (!lockAcquired) {
    // Lock held by another job - mark as waiting and throw to trigger retry
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'PENDING' }, // Keep as PENDING for retry
    });
    await logEvent(jobId, 'LOCK_WAITING', 'Waiting for another bulk operation to complete');
    log.info('Shop lock held by another job, will retry');

    // Throw error to trigger BullMQ exponential backoff retry
    throw new Error(`LOCK_WAITING: Shop ${shopId} has another bulk operation in progress`);
  }

  // Set up lock extension interval (for long-running jobs)
  const lockExtendInterval = setInterval(async () => {
    await extendShopLock(shopId, jobId, LOCK_TTL_MS);
  }, LOCK_EXTEND_INTERVAL_MS);

  // Update status to RUNNING
  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'RUNNING' },
  });

  await logEvent(jobId, 'JOB_STARTED', 'Job started processing');
  await logEvent(jobId, 'LOCK_ACQUIRED', `Acquired per-shop lock for ${shopId}`);

  try {
    // Execute bulk query
    await logEvent(jobId, 'QUERY_STARTED', 'Starting bulk query');
    const productIds = await runBulkQuery(shop, job.queryString, job.maxItems);
    const matchedCount = productIds.length;

    await prisma.job.update({
      where: { id: jobId },
      data: { matchedCount },
    });

    await logEvent(jobId, 'QUERY_COMPLETED', `Bulk query completed: ${matchedCount} products matched`);

    // If dry-run, complete here
    if (job.dryRun) {
      await prisma.job.update({
        where: { id: jobId },
        data: { status: 'COMPLETED' },
      });
      await logEvent(jobId, 'JOB_COMPLETED', `Dry-run completed: ${matchedCount} products matched`);
      log.info({ matchedCount }, 'Dry-run job completed');
      return;
    }

    // If no products matched, complete
    if (matchedCount === 0) {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          updatedCount: 0,
          failedCount: 0,
        },
      });
      await logEvent(jobId, 'JOB_COMPLETED', 'No products matched query');
      log.info('Job completed with 0 matches');
      return;
    }

    // Execute bulk mutation
    await logEvent(jobId, 'MUTATION_STARTED', `Starting bulk mutation for ${matchedCount} products`);
    const result = await runBulkMutation(shop, job, productIds);

    // Update job with results
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        updatedCount: result.updatedCount,
        failedCount: result.failedCount,
        errorPreview: result.errorPreview,
        bulkOperationId: result.bulkOperationId,
      },
    });

    await logEvent(
      jobId,
      'MUTATION_COMPLETED',
      `Bulk mutation completed: ${result.updatedCount} updated, ${result.failedCount} failed`
    );
    await logEvent(jobId, 'JOB_COMPLETED', 'Job completed successfully');

    log.info(
      { updatedCount: result.updatedCount, failedCount: result.failedCount },
      'Job completed'
    );
  } catch (error) {
    // Handle job failure
    log.error({ error }, 'Job failed');

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorPreview: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    await logEvent(jobId, 'JOB_FAILED', `Job failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

    throw error; // Re-throw to trigger BullMQ retry
  } finally {
    // B1: Always release lock and clear interval on completion or failure
    clearInterval(lockExtendInterval);
    await releaseShopLock(shopId, jobId);
    await logEvent(jobId, 'LOCK_RELEASED', `Released per-shop lock for ${shopId}`);
    log.info('Shop lock released');
  }
}

// Helper: Log job event
async function logEvent(jobId: string, eventType: string, message: string): Promise<void> {
  await prisma.jobEvent.create({
    data: {
      jobId,
      eventType,
      message,
    },
  });
}

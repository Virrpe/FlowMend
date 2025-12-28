/**
 * Worker Test Helper
 * Exports processJob function for testing
 */

import prisma from '../db/client.js';
import { runBulkQuery } from '../shopify/bulk-query.js';
import { runBulkMutation } from '../shopify/bulk-mutation.js';
import { createLogger } from '../utils/logger.js';

/**
 * Process a job
 *
 * @param jobId - UUID of job to process
 * @param shopId - Shopify shop domain
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

  // Update status to RUNNING
  await prisma.job.update({
    where: { id: jobId },
    data: { status: 'RUNNING' },
  });

  await logEvent(jobId, 'JOB_STARTED', 'Job started processing');

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

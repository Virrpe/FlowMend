/**
 * Job Creator
 * Handles job creation with idempotency checking
 */

import prisma from '../../server/db/client.js';
import { generateInputHash } from '../../server/utils/idempotency.js';
import logger from '../../server/utils/logger.js';
import type { JobCreateInput } from '../../server/types/index.js';

/**
 * Create a new job with idempotency check
 *
 * @param input - Job creation parameters
 * @returns Created job record
 * @throws DuplicateJobError if identical job already exists
 */
export async function createJob(input: JobCreateInput) {
  // TODO: Implement job creation with idempotency
  // 1. Generate input hash
  // 2. Check for existing PENDING or RUNNING job with same hash
  // 3. If exists, throw error with existing job ID
  // 4. Create new job record
  // 5. Log job creation event
  // 6. Return job record

  const inputHash = generateInputHash(input);

  // Check for duplicate
  const existingJob = await prisma.job.findFirst({
    where: {
      inputHash,
      status: {
        in: ['PENDING', 'RUNNING'],
      },
    },
  });

  if (existingJob) {
    logger.warn({ jobId: existingJob.id, inputHash }, 'Duplicate job detected');
    throw new DuplicateJobError(existingJob.id);
  }

  // Create job
  const job = await prisma.job.create({
    data: {
      shopId: input.shopId,
      status: 'PENDING',
      queryString: input.queryString,
      namespace: input.namespace,
      key: input.key,
      type: input.type,
      value: input.value,
      dryRun: input.dryRun,
      maxItems: input.maxItems,
      inputHash,
    },
  });

  // Log creation event
  await prisma.jobEvent.create({
    data: {
      jobId: job.id,
      eventType: 'JOB_CREATED',
      message: 'Job created and enqueued',
    },
  });

  logger.info({ jobId: job.id, shopId: input.shopId }, 'Job created');

  return job;
}

// Custom error for duplicate jobs
export class DuplicateJobError extends Error {
  constructor(public existingJobId: string) {
    super(`Job with identical parameters already exists: ${existingJobId}`);
    this.name = 'DuplicateJobError';
  }
}

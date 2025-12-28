#!/usr/bin/env tsx
/**
 * E2E Positive Test (Gate 1)
 * Creates real job with dry_run=false and verifies metafield creation
 *
 * Usage: npx tsx scripts/e2e-positive-test.ts
 */

import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { generateInputHash } from '../server/utils/idempotency.js';

const prisma = new PrismaClient();
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const jobQueue = new Queue('flowmend-jobs', { connection });

async function main() {
  console.log('🧪 Gate 1: E2E Positive Test\n');

  const shopId = process.env.SHOPIFY_STORE_DOMAIN!;

  // Test job configuration - REAL WRITE
  const testJob = {
    shopId,
    queryString: 'status:active', // Guaranteed to match products
    namespace: 'custom',
    key: 'flowmend_test',
    type: 'single_line_text_field' as const,
    value: '1',
    dryRun: false, // REAL WRITE
    maxItems: 3, // Only 3 products for safety
  };

  console.log('🔧 Test Configuration:');
  console.log(`   Shop: ${testJob.shopId}`);
  console.log(`   Query: ${testJob.queryString}`);
  console.log(`   Metafield: ${testJob.namespace}.${testJob.key} = "${testJob.value}"`);
  console.log(`   Type: ${testJob.type}`);
  console.log(`   Dry Run: ${testJob.dryRun} ⚠️  REAL WRITE`);
  console.log(`   Max Items: ${testJob.maxItems}\n`);

  // Generate input hash
  const inputHash = generateInputHash(testJob);

  // Check for existing job
  const existingJob = await prisma.job.findFirst({
    where: { inputHash, status: { in: ['PENDING', 'RUNNING'] } },
  });

  if (existingJob) {
    console.log(`⚠️  Job already exists: ${existingJob.id}`);
    console.log(`   Waiting for existing job to complete...\n`);
    await waitForJobCompletion(existingJob.id);
    await printJobResults(existingJob.id);
    await prisma.$disconnect();
    await connection.quit();
    return;
  }

  // Create job
  console.log('📝 Creating job...');
  const job = await prisma.job.create({
    data: {
      shopId: testJob.shopId,
      status: 'PENDING',
      queryString: testJob.queryString,
      namespace: testJob.namespace,
      key: testJob.key,
      type: testJob.type,
      value: testJob.value,
      dryRun: testJob.dryRun,
      maxItems: testJob.maxItems,
      inputHash,
    },
  });

  await prisma.jobEvent.create({
    data: {
      jobId: job.id,
      eventType: 'JOB_CREATED',
      message: 'Job created via E2E positive test',
    },
  });

  console.log(`✅ Job created: ${job.id}\n`);

  // Enqueue job
  console.log('📨 Enqueueing job...');
  await jobQueue.add('process-job', { jobId: job.id, shopId: testJob.shopId }, { jobId: job.id });
  console.log('✅ Job enqueued\n');

  // Wait for completion
  console.log('⏳ Waiting for job to complete (max 5 minutes)...\n');
  await waitForJobCompletion(job.id);

  // Print results
  await printJobResults(job.id);

  // Verify expectations
  const finalJob = await prisma.job.findUnique({ where: { id: job.id } });
  console.log('\n🔍 Verification:');

  const checks = {
    'Status is COMPLETED': finalJob?.status === 'COMPLETED',
    'Matched count > 0': (finalJob?.matchedCount || 0) > 0,
    'Updated count > 0': (finalJob?.updatedCount || 0) > 0,
    'Failed count = 0': (finalJob?.failedCount || 0) === 0,
  };

  for (const [check, passed] of Object.entries(checks)) {
    console.log(`   ${passed ? '✅' : '❌'} ${check}`);
  }

  const allPassed = Object.values(checks).every(v => v);

  if (allPassed) {
    console.log('\n✅ Gate 1 PASSED - Run verify-metafield.ts next to confirm Shopify data\n');
  } else {
    console.log('\n❌ Gate 1 FAILED - Check job events for details\n');
    process.exit(1);
  }

  await prisma.$disconnect();
  await connection.quit();
}

async function waitForJobCompletion(jobId: string): Promise<void> {
  const maxWaitTime = 5 * 60 * 1000; // 5 minutes
  const pollInterval = 2000; // 2 seconds
  let elapsed = 0;

  while (elapsed < maxWaitTime) {
    const job = await prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'COMPLETED' || job.status === 'FAILED') {
      console.log(''); // New line after progress dots
      return;
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
    elapsed += pollInterval;

    // Print progress indicator
    process.stdout.write('.');
  }

  throw new Error('Job did not complete within 5 minutes');
}

async function printJobResults(jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { events: { orderBy: { createdAt: 'asc' } } },
  });

  if (!job) {
    console.log('❌ Job not found');
    return;
  }

  console.log('\n📊 Job Results:');
  console.log(`   ID: ${job.id}`);
  console.log(`   Status: ${job.status}`);
  console.log(`   Matched: ${job.matchedCount || 0}`);
  console.log(`   Updated: ${job.updatedCount || 0}`);
  console.log(`   Failed: ${job.failedCount || 0}`);

  if (job.errorPreview) {
    console.log(`\n⚠️  Errors:\n${job.errorPreview}`);
  }

  console.log('\n📝 Events:');
  for (const event of job.events) {
    const time = event.createdAt.toISOString().substring(11, 19);
    console.log(`   [${time}] ${event.eventType}: ${event.message}`);
  }
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

/**
 * Dev Harness Script
 * Manually enqueue a job for testing without Flow
 *
 * Usage: tsx scripts/dev-harness.ts
 */

import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { generateInputHash } from '../server/utils/idempotency.js';
import { encryptToken } from '../server/utils/encryption.js';

const prisma = new PrismaClient();

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const jobQueue = new Queue('flowmend-jobs', { connection });

async function main() {
  console.log('🚀 Flowmend Dev Harness\n');

  // Test job configuration
  const testJob = {
    shopId: 'dev-store.myshopify.com', // Replace with your dev store domain
    queryString: 'status:active', // Simple query to match active products
    namespace: 'custom',
    key: 'test_badge',
    type: 'single_line_text_field',
    value: 'Dev Test',
    dryRun: true, // Start with dry-run for safety
    maxItems: 10, // Limit to 10 products for testing
  };

  console.log('Test Job Configuration:');
  console.log(JSON.stringify(testJob, null, 2));
  console.log('');

  // Ensure shop exists in database (for testing)
  console.log('📦 Checking shop record...');
  const shop = await prisma.shop.upsert({
    where: { id: testJob.shopId },
    create: {
      id: testJob.shopId,
      accessToken: encryptToken(process.env.TEST_SHOP_ACCESS_TOKEN || 'test-token'),
      scopes: 'read_products,write_products',
      installedAt: new Date(),
    },
    update: {},
  });
  console.log(`✅ Shop: ${shop.id}\n`);

  // Generate input hash for idempotency
  const inputHash = generateInputHash(testJob);

  // Check for existing job
  const existingJob = await prisma.job.findFirst({
    where: {
      inputHash,
      status: { in: ['PENDING', 'RUNNING'] },
    },
  });

  if (existingJob) {
    console.log(`⚠️  Job already exists: ${existingJob.id}`);
    console.log(`   Status: ${existingJob.status}`);
    console.log('');
    process.exit(0);
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
      message: 'Job created via dev harness',
    },
  });

  console.log(`✅ Job created: ${job.id}\n`);

  // Enqueue job
  console.log('📨 Enqueueing job to BullMQ...');
  await jobQueue.add(
    'process-job',
    { jobId: job.id, shopId: testJob.shopId },
    { jobId: job.id }
  );
  console.log(`✅ Job enqueued\n`);

  console.log('🎉 Done!\n');
  console.log('View job status:');
  console.log(`  npx prisma studio`);
  console.log(`  or check Jobs list in admin UI\n`);

  await prisma.$disconnect();
  await connection.quit();
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});

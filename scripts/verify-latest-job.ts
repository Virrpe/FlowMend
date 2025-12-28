#!/usr/bin/env tsx
/**
 * Verify Latest Job Script (Gate 2)
 * Shows the most recent job in the database
 *
 * Usage: npx tsx scripts/verify-latest-job.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Latest Job in Database\n');

  const job = await prisma.job.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      events: {
        orderBy: { createdAt: 'asc' },
        take: 10, // Only show first 10 events
      },
    },
  });

  if (!job) {
    console.log('❌ No jobs found in database\n');
    process.exit(1);
  }

  console.log('📊 Job Details:');
  console.log(`   ID: ${job.id}`);
  console.log(`   Shop: ${job.shopId}`);
  console.log(`   Status: ${job.status}`);
  console.log(`   Created: ${job.createdAt.toISOString()}`);
  console.log(`   Updated: ${job.updatedAt.toISOString()}\n`);

  console.log('⚙️  Configuration:');
  console.log(`   Query: ${job.queryString}`);
  console.log(`   Metafield: ${job.namespace}.${job.key}`);
  console.log(`   Type: ${job.type}`);
  console.log(`   Value: ${job.value}`);
  console.log(`   Dry Run: ${job.dryRun}`);
  console.log(`   Max Items: ${job.maxItems}\n`);

  if (job.matchedCount !== null || job.updatedCount !== null || job.failedCount !== null) {
    console.log('📈 Results:');
    console.log(`   Matched: ${job.matchedCount || 0}`);
    console.log(`   Updated: ${job.updatedCount || 0}`);
    console.log(`   Failed: ${job.failedCount || 0}\n`);
  }

  if (job.events.length > 0) {
    console.log('📝 Recent Events:');
    for (const event of job.events) {
      const time = event.createdAt.toISOString().substring(11, 19);
      console.log(`   [${time}] ${event.eventType}: ${event.message}`);
    }
    if (job.events.length === 10) {
      console.log('   ... (showing first 10 events)');
    }
    console.log('');
  }

  if (job.errorPreview) {
    console.log('⚠️  Error Preview:');
    console.log(job.errorPreview.substring(0, 500));
    console.log('');
  }

  console.log('✅ Gate 2: Latest job found\n');

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Failed to fetch job:', error);
  process.exit(1);
});

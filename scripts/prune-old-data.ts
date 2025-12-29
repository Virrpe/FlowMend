#!/usr/bin/env npx tsx
/**
 * Data Retention Pruning Script
 *
 * Deletes old job data per the retention policy.
 * Default: 30 days for completed/failed jobs.
 *
 * Usage:
 *   npx tsx scripts/prune-old-data.ts              # Dry run
 *   npx tsx scripts/prune-old-data.ts --execute    # Actually delete
 *   npx tsx scripts/prune-old-data.ts --days 60    # Custom retention
 *
 * Safe to run as a cron job or scheduled task.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration
const DEFAULT_RETENTION_DAYS = parseInt(process.env.JOB_RETENTION_DAYS || '30', 10);

interface PruneStats {
  jobsDeleted: number;
  eventsDeleted: number;
  shopsProcessed: number;
  oldestJobDate: Date | null;
}

async function pruneOldData(
  retentionDays: number,
  dryRun: boolean
): Promise<PruneStats> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  console.log(`\n📅 Retention Policy: ${retentionDays} days`);
  console.log(`📅 Cutoff Date: ${cutoffDate.toISOString()}`);
  console.log(`🔍 Mode: ${dryRun ? 'DRY RUN (no changes)' : 'EXECUTE (will delete)'}\n`);

  // Find jobs to delete
  const jobsToDelete = await prisma.job.findMany({
    where: {
      createdAt: { lt: cutoffDate },
      status: { in: ['COMPLETED', 'FAILED'] }, // Only delete finished jobs
    },
    select: {
      id: true,
      shopId: true,
      createdAt: true,
      status: true,
      _count: { select: { events: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (jobsToDelete.length === 0) {
    console.log('✅ No jobs found older than the retention period.\n');
    return {
      jobsDeleted: 0,
      eventsDeleted: 0,
      shopsProcessed: 0,
      oldestJobDate: null,
    };
  }

  // Calculate stats
  const totalEvents = jobsToDelete.reduce((sum, job) => sum + job._count.events, 0);
  const uniqueShops = new Set(jobsToDelete.map((j) => j.shopId));
  const oldestJob = jobsToDelete[0];

  console.log(`📊 Found ${jobsToDelete.length} jobs to prune:`);
  console.log(`   - Events to delete: ${totalEvents}`);
  console.log(`   - Shops affected: ${uniqueShops.size}`);
  console.log(`   - Oldest job: ${oldestJob.createdAt.toISOString()}`);

  // Show sample of jobs to delete
  console.log('\n📋 Sample jobs to delete (first 5):');
  for (const job of jobsToDelete.slice(0, 5)) {
    console.log(
      `   - ${job.id.substring(0, 8)}... | ${job.shopId} | ${job.status} | ${job.createdAt.toISOString()} | ${job._count.events} events`
    );
  }
  if (jobsToDelete.length > 5) {
    console.log(`   ... and ${jobsToDelete.length - 5} more`);
  }

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No data was deleted.');
    console.log('   Run with --execute to actually delete data.\n');
    return {
      jobsDeleted: 0,
      eventsDeleted: 0,
      shopsProcessed: uniqueShops.size,
      oldestJobDate: oldestJob.createdAt,
    };
  }

  // Execute deletion
  console.log('\n🗑️  Deleting old data...');

  // Delete in batches to avoid timeouts
  const batchSize = 100;
  let deletedJobs = 0;
  let deletedEvents = 0;

  for (let i = 0; i < jobsToDelete.length; i += batchSize) {
    const batch = jobsToDelete.slice(i, i + batchSize);
    const jobIds = batch.map((j) => j.id);

    // Delete events first (due to foreign key)
    const eventsResult = await prisma.jobEvent.deleteMany({
      where: { jobId: { in: jobIds } },
    });
    deletedEvents += eventsResult.count;

    // Delete jobs
    const jobsResult = await prisma.job.deleteMany({
      where: { id: { in: jobIds } },
    });
    deletedJobs += jobsResult.count;

    console.log(`   Batch ${Math.floor(i / batchSize) + 1}: Deleted ${jobsResult.count} jobs, ${eventsResult.count} events`);
  }

  console.log(`\n✅ Pruning complete!`);
  console.log(`   - Jobs deleted: ${deletedJobs}`);
  console.log(`   - Events deleted: ${deletedEvents}`);
  console.log(`   - Shops affected: ${uniqueShops.size}\n`);

  return {
    jobsDeleted: deletedJobs,
    eventsDeleted: deletedEvents,
    shopsProcessed: uniqueShops.size,
    oldestJobDate: oldestJob.createdAt,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute');
  const daysIndex = args.indexOf('--days');
  const retentionDays =
    daysIndex !== -1 && args[daysIndex + 1]
      ? parseInt(args[daysIndex + 1], 10)
      : DEFAULT_RETENTION_DAYS;

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   FlowMend Data Retention Pruning');
  console.log('═══════════════════════════════════════════════════════════════');

  try {
    const stats = await pruneOldData(retentionDays, !execute);

    // Output JSON stats for automation
    if (process.env.OUTPUT_JSON === 'true') {
      console.log('\n📊 JSON Output:');
      console.log(JSON.stringify(stats, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Pruning failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

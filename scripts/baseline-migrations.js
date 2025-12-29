#!/usr/bin/env node
/**
 * Baseline existing database for Prisma migrations
 * Marks the initial migration as already applied
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function baseline() {
  try {
    console.log('Baselining database migrations...');

    // Create _prisma_migrations table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        id VARCHAR(36) PRIMARY KEY,
        checksum VARCHAR(64) NOT NULL,
        finished_at TIMESTAMPTZ,
        migration_name VARCHAR(255) NOT NULL,
        logs TEXT,
        rolled_back_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        applied_steps_count INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Mark the initial migration as applied
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
      VALUES (
        '20251227142206_init_flowmend',
        'skip',
        now(),
        '20251227142206_init_flowmend',
        now(),
        1
      )
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('✅ Database baselined successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Baseline failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

baseline();

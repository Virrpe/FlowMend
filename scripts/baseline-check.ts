#!/usr/bin/env tsx
/**
 * Baseline Check Script
 * Verifies environment and system readiness
 *
 * Usage: npx tsx scripts/baseline-check.ts
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { decryptToken } from '../server/utils/encryption.js';

const prisma = new PrismaClient();

interface CheckResult {
  name: string;
  status: 'OK' | 'NOT OK';
  details: string;
}

async function main() {
  console.log('🔍 Flowmend Baseline Check\n');

  const results: CheckResult[] = [];

  // 1. Environment Variables Check
  console.log('📋 Checking environment variables...');
  const requiredEnvVars = [
    'SHOPIFY_API_KEY',
    'SHOPIFY_API_SECRET',
    'SHOPIFY_APP_URL',
    'SHOPIFY_STORE_DOMAIN',
    'TEST_SHOP_ACCESS_TOKEN',
    'DATABASE_URL',
    'REDIS_URL',
    'ENCRYPTION_KEY',
  ];

  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    if (value) {
      results.push({
        name: `ENV: ${envVar}`,
        status: 'OK',
        details: `SET (length: ${value.length})`,
      });
    } else {
      results.push({
        name: `ENV: ${envVar}`,
        status: 'NOT OK',
        details: 'NOT SET',
      });
    }
  }

  // 2. Database Check
  console.log('📋 Checking database connection...');
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.push({
      name: 'Database Connection',
      status: 'OK',
      details: 'Connected',
    });
  } catch (error) {
    results.push({
      name: 'Database Connection',
      status: 'NOT OK',
      details: `Error: ${error}`,
    });
  }

  // 3. Redis Check
  console.log('📋 Checking Redis connection...');
  let redis: Redis | null = null;
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    await redis.ping();
    results.push({
      name: 'Redis Connection',
      status: 'OK',
      details: 'Connected',
    });
  } catch (error) {
    results.push({
      name: 'Redis Connection',
      status: 'NOT OK',
      details: `Error: ${error}`,
    });
  } finally {
    if (redis) await redis.quit();
  }

  // 4. Shop Record Check
  console.log('📋 Checking shop record...');
  try {
    const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
    if (!shopDomain) {
      results.push({
        name: 'Shop Record',
        status: 'NOT OK',
        details: 'SHOPIFY_STORE_DOMAIN not set',
      });
    } else {
      const shop = await prisma.shop.findUnique({
        where: { id: shopDomain },
      });

      if (!shop) {
        results.push({
          name: 'Shop Record',
          status: 'NOT OK',
          details: `Shop ${shopDomain} not found in database`,
        });
      } else if (shop.uninstalledAt) {
        results.push({
          name: 'Shop Record',
          status: 'NOT OK',
          details: `Shop uninstalled at ${shop.uninstalledAt}`,
        });
      } else {
        // Verify token is encrypted
        let tokenStatus = 'Unknown';
        try {
          const decrypted = decryptToken(shop.accessToken);
          tokenStatus = `Encrypted (decrypts to ${decrypted.length} chars)`;
        } catch {
          tokenStatus = 'PLAINTEXT (needs migration!)';
        }

        results.push({
          name: 'Shop Record',
          status: 'OK',
          details: `Found (installed: ${shop.installedAt.toISOString()})`,
        });
        results.push({
          name: 'Shop Token Encryption',
          status: tokenStatus.includes('PLAINTEXT') ? 'NOT OK' : 'OK',
          details: tokenStatus,
        });
      }
    }
  } catch (error) {
    results.push({
      name: 'Shop Record',
      status: 'NOT OK',
      details: `Error: ${error}`,
    });
  }

  // 5. Encryption Key Check
  console.log('📋 Checking encryption key...');
  try {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      results.push({
        name: 'Encryption Key Format',
        status: 'NOT OK',
        details: 'NOT SET',
      });
    } else {
      const keyBuffer = Buffer.from(key, 'hex');
      if (keyBuffer.length === 32) {
        results.push({
          name: 'Encryption Key Format',
          status: 'OK',
          details: '32 bytes (valid AES-256 key)',
        });
      } else {
        results.push({
          name: 'Encryption Key Format',
          status: 'NOT OK',
          details: `${keyBuffer.length} bytes (expected 32)`,
        });
      }
    }
  } catch (error) {
    results.push({
      name: 'Encryption Key Format',
      status: 'NOT OK',
      details: `Invalid hex: ${error}`,
    });
  }

  // Print Results Table
  console.log('\n📊 Baseline Check Results:\n');
  console.log('┌─────────────────────────────────────┬──────────┬────────────────────────────────────┐');
  console.log('│ Check                               │ Status   │ Details                            │');
  console.log('├─────────────────────────────────────┼──────────┼────────────────────────────────────┤');

  for (const result of results) {
    const name = result.name.padEnd(35).substring(0, 35);
    const status = result.status.padEnd(8);
    const details = result.details.padEnd(36).substring(0, 36);
    console.log(`│ ${name} │ ${status} │ ${details} │`);
  }

  console.log('└─────────────────────────────────────┴──────────┴────────────────────────────────────┘\n');

  // Overall Status
  const allOk = results.every(r => r.status === 'OK');
  if (allOk) {
    console.log('✅ Baseline OK - Ready for validation gates\n');
  } else {
    console.log('❌ Baseline NOT OK - Fix issues before proceeding\n');
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Baseline check failed:', error);
  process.exit(1);
});

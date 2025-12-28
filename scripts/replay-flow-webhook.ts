#!/usr/bin/env tsx
/**
 * Replay Flow Webhook Script (Gate 3)
 * Sends identical webhook payload 3 times to test idempotency
 *
 * Usage: npx tsx scripts/replay-flow-webhook.ts
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { generateInputHash } from '../server/utils/idempotency.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔁 Gate 3: Idempotency Test\n');

  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN!;
  const appUrl = process.env.SHOPIFY_APP_URL!;
  const apiSecret = process.env.SHOPIFY_API_SECRET!;

  // Webhook payload - identical for all 3 requests
  const payload = {
    query_string: 'status:active',
    namespace: 'custom',
    key: 'flowmend_idem',
    type: 'single_line_text_field',
    value: 'idem',
    dry_run: true,
    max_items: 3,
  };

  console.log('📦 Webhook Payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('');

  // Calculate expected inputHash
  const expectedHash = generateInputHash({
    shopId: shopDomain,
    queryString: payload.query_string,
    namespace: payload.namespace,
    key: payload.key,
    type: payload.type as 'single_line_text_field',
    value: payload.value,
    dryRun: payload.dry_run,
    maxItems: payload.max_items,
  });

  console.log(`🔑 Expected inputHash: ${expectedHash}\n`);

  // Capture start time to filter out historical jobs
  const testStartTime = new Date(Date.now() - 2000); // 2 seconds slack for clock skew
  console.log(`⏱️  Test start time: ${testStartTime.toISOString()}\n`);

  // Send webhook 3 times
  const webhookUrl = `${appUrl}/webhooks/flow-action`;
  const payloadString = JSON.stringify(payload);

  console.log('📡 Sending webhook 3 times...\n');

  for (let i = 1; i <= 3; i++) {
    console.log(`   Request ${i}/3...`);

    // Calculate HMAC
    const hmac = crypto
      .createHmac('sha256', apiSecret)
      .update(payloadString, 'utf8')
      .digest('base64');

    // Send POST request
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Hmac-Sha256': hmac,
        'X-Shopify-Shop-Domain': shopDomain,
      },
      body: payloadString,
    });

    const responseData = await response.json();

    console.log(`      Status: ${response.status}`);
    console.log(`      Response: ${JSON.stringify(responseData)}`);

    if (responseData.deduped) {
      console.log(`      ✅ Deduped (existing job: ${responseData.jobId})`);
    } else {
      console.log(`      📝 New job created: ${responseData.jobId}`);
    }

    // Small delay between requests
    if (i < 3) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n🔍 Verifying database state...\n');

  // Query for jobs with this inputHash created DURING this test run
  const jobs = await prisma.job.findMany({
    where: {
      inputHash: expectedHash,
      createdAt: { gte: testStartTime },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('📊 Results:');
  console.log(`   Jobs found with inputHash (created during test): ${jobs.length}`);

  if (jobs.length > 0) {
    console.log('\n   Job Details:');
    for (const job of jobs) {
      console.log(`      ID: ${job.id}`);
      console.log(`      Status: ${job.status}`);
      console.log(`      Created: ${job.createdAt.toISOString()}`);
      console.log('');
    }
  }

  console.log('\n🎯 Verification:');

  const checks = {
    'Exactly 1 job created': jobs.length === 1,
    'Job has correct inputHash': jobs.length > 0 && jobs[0].inputHash === expectedHash,
  };

  for (const [check, passed] of Object.entries(checks)) {
    console.log(`   ${passed ? '✅' : '❌'} ${check}`);
  }

  const allPassed = Object.values(checks).every(v => v);

  if (allPassed) {
    console.log('\n✅ Gate 3 PASSED - Idempotency working correctly\n');
  } else {
    console.log('\n❌ Gate 3 FAILED - Multiple jobs created for same input\n');
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * Fires a test webhook to simulate Shopify Flow Action
 * Includes proper HMAC signature for authentication
 */

import 'dotenv/config';
import crypto from 'crypto';

const payload = {
  query_string: 'status:active tag:test',
  namespace: 'custom',
  key: 'test_field',
  type: 'single_line_text_field',
  value: 'Test value from webhook',
  dry_run: true,
  max_items: 10,
};

const body = JSON.stringify(payload);
const shop = process.env.SHOPIFY_STORE_DOMAIN || 'flowmend.myshopify.com';
const secret = process.env.SHOPIFY_API_SECRET!;
const webhookUrl = `${process.env.SHOPIFY_APP_URL}/webhooks/flow-action`;

// Generate HMAC signature
const hmac = crypto
  .createHmac('sha256', secret)
  .update(body, 'utf8')
  .digest('base64');

console.log('\n📤 Firing test webhook...');
console.log(`   URL: ${webhookUrl}`);
console.log(`   Shop: ${shop}`);
console.log(`   HMAC: ${hmac.substring(0, 20)}...`);
console.log(`   Payload:`, JSON.stringify(payload, null, 2));

// Send webhook
const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Shop-Domain': shop,
    'X-Shopify-Hmac-Sha256': hmac,
  },
  body,
});

const responseText = await response.text();
console.log(`\n✅ Response: ${response.status} ${response.statusText}`);
console.log(`   Body: ${responseText}`);

if (response.status === 200) {
  console.log('\n🎉 Webhook accepted! Check worker logs for job processing.');
} else {
  console.log('\n❌ Webhook failed!');
  process.exit(1);
}

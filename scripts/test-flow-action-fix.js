#!/usr/bin/env node
/**
 * Test script for Flow action query_string extraction fix
 * 
 * This script tests that:
 * 1. Non-empty query_string in properties returns non-400
 * 2. Empty query_string still returns 400 with correct message
 * 3. Backwards compatibility with query_string at req.body level
 */

import { spawn } from 'child_process';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;
const SERVER_URL = `http://localhost:${PORT}`;
const API_SECRET = process.env.SHOPIFY_API_SECRET || 'test-secret-key-for-testing';

// Generate a valid HMAC for testing
function generateHmac(body, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');
}

// Test cases
const testCases = [
  {
    name: 'Valid query_string in properties',
    payload: {
      shop_id: '123456789',
      shopify_domain: 'test-shop.myshopify.com',
      properties: {
        query_string: 'tag:flowmend-e2e',
        namespace: 'test',
        key: 'e2e_proof',
        type: 'single_line_text_field',
        value: 'E2E test successful',
        dry_run: true,
        max_items: 5
      },
      handle: 'bulk-set-metafield'
    },
    expect400: false,
    expectErrorMessage: null
  },
  {
    name: 'Empty query_string in properties',
    payload: {
      shop_id: '123456789',
      shopify_domain: 'test-shop.myshopify.com',
      properties: {
        query_string: '',
        namespace: 'test',
        key: 'e2e_proof',
        type: 'single_line_text_field',
        value: 'E2E test successful',
        dry_run: true,
        max_items: 5
      },
      handle: 'bulk-set-metafield'
    },
    expect400: true,
    expectErrorMessage: 'query_string is required and cannot be empty'
  },
  {
    name: 'Missing query_string in properties',
    payload: {
      shop_id: '123456789',
      shopify_domain: 'test-shop.myshopify.com',
      properties: {
        namespace: 'test',
        key: 'e2e_proof',
        type: 'single_line_text_field',
        value: 'E2E test successful',
        dry_run: true,
        max_items: 5
      },
      handle: 'bulk-set-metafield'
    },
    expect400: true,
    expectErrorMessage: 'query_string is required and cannot be empty'
  },
  {
    name: 'Backwards compatibility - query_string at root level',
    payload: {
      shop_id: '123456789',
      shopify_domain: 'test-shop.myshopify.com',
      query_string: 'tag:backwards-compat',
      namespace: 'test',
      key: 'compat_test',
      type: 'single_line_text_field',
      value: 'Backwards compat test',
      dry_run: true,
      max_items: 5
    },
    expect400: false,
    expectErrorMessage: null
  },
  {
    name: 'product_query fallback in properties',
    payload: {
      shop_id: '123456789',
      shopify_domain: 'test-shop.myshopify.com',
      properties: {
        product_query: 'tag:fallback-test',
        namespace: 'test',
        key: 'fallback_proof',
        type: 'single_line_text_field',
        value: 'Fallback test successful',
        dry_run: true,
        max_items: 5
      },
      handle: 'bulk-set-metafield'
    },
    expect400: false,
    expectErrorMessage: null
  }
];

async function runTest(testCase) {
  const body = JSON.stringify(testCase.payload);
  const hmac = generateHmac(body, API_SECRET);
  const shopDomain = testCase.payload.shopify_domain || 'test-shop.myshopify.com';

  try {
    const response = await fetch(`${SERVER_URL}/webhooks/flow-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Hmac-SHA256': hmac,
        'X-Shopify-Shop-Domain': shopDomain,
        'X-Shopify-Webhook-ID': `test-webhook-${Date.now()}`
      },
      body
    });

    const result = await response.json();

    if (testCase.expect400) {
      if (response.status === 400) {
        if (testCase.expectErrorMessage && result.error !== testCase.expectErrorMessage) {
          return {
            passed: false,
                error: `Expected error message "${testCase.expectErrorMessage}" but got "${result.error}"`
          };
        }
        return { passed: true };
      } else {
        return {
          passed: false,
          error: `Expected 400 status but got ${response.status}`
        };
      }
    } else {
      if (response.status === 400) {
        return {
          passed: false,
          error: `Expected non-400 status but got 400: ${JSON.stringify(result)}`
        };
      }
      // For non-400 cases, we expect the job to be created (or deduplicated)
      if (!result.ok) {
        return {
          passed: false,
          error: `Expected ok=true but got: ${JSON.stringify(result)}`
        };
      }
      return { passed: true };
    }
  } catch (error) {
    return { passed: false, error: error.message };
  }
}

async function main() {
  console.log('=== Flow Action Fix Test Suite ===\n');

  // Check if server is running
  try {
    await fetch(`${SERVER_URL}/health`);
  } catch (error) {
    console.log(`Starting test server on port ${PORT}...`);
    const server = spawn('node', ['server.js'], {
      env: { ...process.env, PORT, NODE_ENV: 'test' },
      stdio: 'pipe'
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if server started successfully
    try {
      await fetch(`${SERVER_URL}/health`);
    } catch (e) {
      console.error('Failed to start server:', e.message);
      process.exit(1);
    }
  }

  console.log(`Server running at ${SERVER_URL}\n`);

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    process.stdout.write(`Test: ${testCase.name}... `);
    const result = await runTest(testCase);
    if (result.passed) {
      console.log('PASSED');
      passed++;
    } else {
      console.log(`FAILED: ${result.error}`);
      failed++;
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`Passed: ${passed}/${testCases.length}`);
  console.log(`Failed: ${failed}/${testCases.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);

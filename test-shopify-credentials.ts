#!/usr/bin/env tsx
/**
 * Test script to verify Shopify API credentials
 * Usage: npx tsx test-shopify-credentials.ts
 */

import 'dotenv/config';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const TEST_SHOP_ACCESS_TOKEN = process.env.TEST_SHOP_ACCESS_TOKEN;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || 'flowmend.myshopify.com';
const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

console.log('\n🔍 Verifying Shopify Credentials\n');
console.log('Environment Variables:');
console.log('  SHOPIFY_API_KEY:', SHOPIFY_API_KEY ? `${SHOPIFY_API_KEY.slice(0, 20)}...` : '❌ NOT SET');
console.log('  SHOPIFY_API_SECRET:', SHOPIFY_API_SECRET ? (SHOPIFY_API_SECRET === 'dev-placeholder' ? '⚠️  PLACEHOLDER VALUE' : '✅ SET') : '❌ NOT SET');
console.log('  TEST_SHOP_ACCESS_TOKEN:', TEST_SHOP_ACCESS_TOKEN ? (TEST_SHOP_ACCESS_TOKEN === 'placeholder-token' ? '⚠️  PLACEHOLDER VALUE' : '✅ SET') : '❌ NOT SET');
console.log('  SHOPIFY_STORE_DOMAIN:', SHOPIFY_STORE_DOMAIN);
console.log('  SHOPIFY_API_VERSION:', SHOPIFY_API_VERSION);
console.log();

async function testShopifyAPI() {
  if (!TEST_SHOP_ACCESS_TOKEN || TEST_SHOP_ACCESS_TOKEN === 'placeholder-token') {
    console.log('❌ Cannot test Shopify API: TEST_SHOP_ACCESS_TOKEN is not set or is a placeholder\n');
    console.log('To test with real credentials, you need:');
    console.log('  1. SHOPIFY_STORE_DOMAIN - Your development store domain (e.g., my-store.myshopify.com)');
    console.log('  2. TEST_SHOP_ACCESS_TOKEN - Admin API access token from your development store\n');
    console.log('How to get these:');
    console.log('  1. Go to Shopify Partners Dashboard: https://partners.shopify.com');
    console.log('  2. Create or select a development store');
    console.log('  3. Install your app to get the access token\n');
    console.log('     OR for quick testing:');
    console.log('  4. In your dev store, go to Settings → Apps and sales channels → Develop apps');
    console.log('  5. Create a custom app with read_products, write_products scopes');
    console.log('  6. Install it and copy the Admin API access token\n');
    return;
  }

  const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=1`;

  console.log(`🌐 Testing REST API call to: ${url}\n`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': TEST_SHOP_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Authentication successful!\n');
      console.log(`Products found: ${data.products?.length || 0}`);
      if (data.products && data.products.length > 0) {
        console.log('Sample product:', {
          id: data.products[0].id,
          title: data.products[0].title,
          status: data.products[0].status,
        });
      }
    } else {
      const errorText = await response.text();
      console.log('❌ Authentication failed\n');
      console.log('Error:', errorText);

      if (response.status === 401) {
        console.log('\n⚠️  This likely means:');
        console.log('  - Invalid or expired access token');
        console.log('  - Token does not have required scopes');
      } else if (response.status === 404) {
        console.log('\n⚠️  This likely means:');
        console.log('  - Invalid store domain');
        console.log('  - Store does not exist');
      }
    }
  } catch (error) {
    console.log('❌ Network error:', error);
  }

  console.log('\n---\n');

  // Test GraphQL API
  console.log('🌐 Testing GraphQL API...\n');

  const graphqlUrl = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

  try {
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': TEST_SHOP_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `{
          shop {
            name
            email
            myshopifyDomain
          }
        }`,
      }),
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      if (data.errors) {
        console.log('❌ GraphQL errors:', data.errors);
      } else {
        console.log('✅ GraphQL API working!\n');
        console.log('Shop Details:', data.data?.shop);
      }
    } else {
      const errorText = await response.text();
      console.log('❌ GraphQL request failed\n');
      console.log('Error:', errorText);
    }
  } catch (error) {
    console.log('❌ Network error:', error);
  }
}

testShopifyAPI().catch(console.error);

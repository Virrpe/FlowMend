#!/usr/bin/env tsx
/**
 * Verify Metafield Script (Gate 1 Part 2)
 * Queries Shopify to confirm metafield was actually created
 *
 * Usage: npx tsx scripts/verify-metafield.ts
 */

import { createShopifyClient, executeQuery } from '../server/shopify/client.js';
import { decryptToken } from '../server/utils/encryption.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying Metafield on Shopify\n');

  const shopDomain = process.env.SHOPIFY_STORE_DOMAIN!;

  // Get shop and decrypt token
  const shop = await prisma.shop.findUnique({ where: { id: shopDomain } });
  if (!shop) {
    throw new Error(`Shop ${shopDomain} not found`);
  }

  const accessToken = decryptToken(shop.accessToken);
  const client = createShopifyClient(accessToken, shopDomain);

  // Query for products with our test metafield
  const query = `
    query {
      products(first: 5, query: "status:active") {
        edges {
          node {
            id
            title
            metafield(namespace: "custom", key: "flowmend_test") {
              id
              namespace
              key
              value
              type
            }
          }
        }
      }
    }
  `;

  console.log('📡 Querying Shopify for products with metafield...\n');

  const result = await executeQuery<{
    products: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          metafield: {
            id: string;
            namespace: string;
            key: string;
            value: string;
            type: string;
          } | null;
        };
      }>;
    };
  }>(client, query);

  const productsWithMetafield = result.products.edges.filter(
    edge => edge.node.metafield !== null
  );

  console.log('📊 Results:');
  console.log(`   Total products checked: ${result.products.edges.length}`);
  console.log(`   Products with metafield: ${productsWithMetafield.length}\n`);

  if (productsWithMetafield.length > 0) {
    console.log('✅ Metafield found on products:\n');
    for (const edge of productsWithMetafield) {
      const product = edge.node;
      const meta = product.metafield!;
      console.log(`   Product: ${product.title}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Metafield: ${meta.namespace}.${meta.key} = "${meta.value}"`);
      console.log(`   Type: ${meta.type}\n`);
    }
    console.log('✅ Gate 1 CONFIRMED - Metafields exist on Shopify\n');
  } else {
    console.log('❌ No metafields found - Gate 1 FAILED\n');
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});

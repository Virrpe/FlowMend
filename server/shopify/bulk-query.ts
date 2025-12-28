/**
 * Bulk Query Runner
 * Executes Shopify bulk queries to fetch product IDs
 */

import { createShopifyClient, executeQuery } from './client.js';
import logger from '../utils/logger.js';
import { decryptToken } from '../utils/encryption.js';
import type { Shop } from '@prisma/client';
import type { BulkOperationStatus } from '../types/index.js';

/**
 * Run bulk query to fetch product IDs matching query
 *
 * @param shop - Shop record with access token
 * @param queryString - Shopify product search query
 * @param maxItems - Maximum number of products to return
 * @returns Array of product GIDs
 */
export async function runBulkQuery(
  shop: Shop,
  queryString: string,
  maxItems: number
): Promise<string[]> {
  // TODO: Implement bulk query execution (see PSEUDOCODE.md)
  // 1. Build GraphQL bulk query
  // 2. Start bulk operation via bulkOperationRunQuery
  // 3. Poll currentBulkOperation until COMPLETED
  // 4. Download result JSONL from URL
  // 5. Parse product IDs
  // 6. Return array of GIDs

  // Decrypt the access token from database
  const accessToken = decryptToken(shop.accessToken);
  const client = createShopifyClient(accessToken, shop.id);

  // Build bulk query
  const graphqlQuery = `
    {
      products(query: "${escapeGraphQL(queryString)}") {
        edges {
          node {
            id
          }
        }
      }
    }
  `;

  // Start bulk operation
  const startMutation = `
    mutation($query: String!) {
      bulkOperationRunQuery(query: $query) {
        bulkOperation {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const startResult = await executeQuery<{
    bulkOperationRunQuery: {
      bulkOperation: { id: string; status: string };
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(client, startMutation, { query: graphqlQuery });

  if (startResult.bulkOperationRunQuery.userErrors.length > 0) {
    const error = startResult.bulkOperationRunQuery.userErrors[0];
    throw new Error(`Bulk query failed: ${error.message}`);
  }

  const bulkOpId = startResult.bulkOperationRunQuery.bulkOperation.id;
  logger.info({ bulkOpId, shopId: shop.id }, 'Bulk query started');

  // Poll until completion
  const productIds = await pollBulkOperationQuery(client, bulkOpId, maxItems);

  return productIds;
}

// Helper: Poll bulk operation
async function pollBulkOperationQuery(
  client: any,
  bulkOpId: string,
  maxItems: number
): Promise<string[]> {
  // TODO: Implement polling logic (see PSEUDOCODE.md)
  // 1. Query currentBulkOperation every 5 seconds
  // 2. Check status (COMPLETED, FAILED, RUNNING)
  // 3. If COMPLETED, download JSONL from URL
  // 4. Parse product IDs
  // 5. Return array

  const maxWaitTime = 30 * 60 * 1000; // 30 minutes
  const pollInterval = 5000; // 5 seconds
  let elapsedTime = 0;

  while (elapsedTime < maxWaitTime) {
    const statusQuery = `
      query {
        currentBulkOperation {
          id
          status
          errorCode
          objectCount
          url
        }
      }
    `;

    const statusResult = await executeQuery<{
      currentBulkOperation: BulkOperationStatus;
    }>(client, statusQuery);

    const op = statusResult.currentBulkOperation;

    if (op.status === 'COMPLETED') {
      if (!op.url) {
        logger.warn({ bulkOpId }, 'Bulk query completed with no results');
        return [];
      }

      // Download and parse JSONL
      const productIds = await downloadAndParseQueryResults(op.url, maxItems);
      return productIds;
    }

    if (op.status === 'FAILED') {
      throw new Error(`Bulk operation failed: ${op.errorCode || 'UNKNOWN'}`);
    }

    // Still running; wait and retry
    await sleep(pollInterval);
    elapsedTime += pollInterval;
  }

  throw new Error('Bulk operation timed out after 30 minutes');
}

// Helper: Download and parse query results
async function downloadAndParseQueryResults(url: string, maxItems: number): Promise<string[]> {
  // TODO: Implement JSONL download and parsing
  // 1. Fetch JSONL from URL
  // 2. Parse lines
  // 3. Extract product IDs
  // 4. Return array (up to maxItems)

  const response = await fetch(url);
  const jsonlContent = await response.text();

  const productIds: string[] = [];
  const lines = jsonlContent.split('\n');

  for (const line of lines) {
    if (productIds.length >= maxItems) break;
    if (!line.trim()) continue;

    const obj = JSON.parse(line);
    if (obj.id) {
      productIds.push(obj.id);
    }
  }

  return productIds;
}

// Helper: Escape GraphQL string
function escapeGraphQL(str: string): string {
  return str.replace(/"/g, '\\"');
}

// Helper: Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

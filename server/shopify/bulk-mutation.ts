/**
 * Bulk Mutation Runner
 * Executes Shopify bulk mutations to set metafields
 */

import { createShopifyClient, executeQuery } from './client.js';
import { buildMutationJsonl } from './jsonl-builder.js';
import logger from '../utils/logger.js';
import { decryptToken } from '../utils/encryption.js';
import { streamJsonlCounts } from '../utils/stream-jsonl.js';
import type { Shop, Job } from '@prisma/client';
import type { JobResult, BulkOperationStatus } from '../types/index.js';
import { Blob } from 'buffer';
import { FormData } from 'undici';

/**
 * Run bulk mutation to set metafields on products
 *
 * @param shop - Shop record with access token
 * @param job - Job record with metafield params
 * @param productIds - Array of product GIDs to update
 * @returns Mutation result with counts and errors
 */
export async function runBulkMutation(
  shop: Shop,
  job: Job,
  productIds: string[]
): Promise<JobResult> {
  // Decrypt the access token from database
  const accessToken = decryptToken(shop.accessToken);
  const client = createShopifyClient(accessToken, shop.id);

  // Build JSONL
  const jsonlChunks = buildMutationJsonl(productIds, job);

  // For MVP, only process first chunk
  if (jsonlChunks.length > 1) {
    logger.warn({ jobId: job.id }, 'Multiple JSONL chunks detected; only first will be processed');
  }

  const jsonlContent = jsonlChunks[0].join('');

  // Upload JSONL
  const stagedUploadPath = await uploadJsonlChunk(client, jsonlContent);

  // Start bulk mutation with metafieldsSet
  const mutationString = `
    mutation metafieldsSet($ownerId: ID!, $namespace: String!, $key: String!, $type: String!, $value: String!) {
      metafieldsSet(metafields: [{
        ownerId: $ownerId,
        namespace: $namespace,
        key: $key,
        type: $type,
        value: $value
      }]) {
        metafields {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const startMutation = `
    mutation($mutation: String!, $stagedUploadPath: String!) {
      bulkOperationRunMutation(
        mutation: $mutation,
        stagedUploadPath: $stagedUploadPath
      ) {
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
    bulkOperationRunMutation: {
      bulkOperation: { id: string; status: string };
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(client, startMutation, {
    mutation: mutationString,
    stagedUploadPath,
  });

  if (startResult.bulkOperationRunMutation.userErrors.length > 0) {
    const error = startResult.bulkOperationRunMutation.userErrors[0];
    throw new Error(`Bulk mutation failed: ${error.message}`);
  }

  const bulkOpId = startResult.bulkOperationRunMutation.bulkOperation.id;
  logger.info({ bulkOpId, jobId: job.id }, 'Bulk mutation started');

  // Poll until completion
  const result = await pollBulkOperationMutation(client, bulkOpId);

  return {
    ...result,
    bulkOperationId: bulkOpId,
  };
}

// Helper: Upload JSONL chunk
async function uploadJsonlChunk(client: any, jsonlContent: string): Promise<string> {
  const stagedUploadMutation = `
    mutation {
      stagedUploadsCreate(input: [
        {
          resource: BULK_MUTATION_VARIABLES,
          filename: "bulk-mutation-vars.jsonl",
          mimeType: "text/jsonl",
          httpMethod: POST
        }
      ]) {
        stagedTargets {
          url
          resourceUrl
          parameters {
            name
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const uploadResult = await executeQuery<{
    stagedUploadsCreate: {
      stagedTargets: Array<{
        url: string;
        resourceUrl: string;
        parameters: Array<{ name: string; value: string }>;
      }>;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(client, stagedUploadMutation);

  if (uploadResult.stagedUploadsCreate.userErrors.length > 0) {
    const error = uploadResult.stagedUploadsCreate.userErrors[0];
    throw new Error(`Staged upload creation failed: ${error.message}`);
  }

  const stagedTarget = uploadResult.stagedUploadsCreate.stagedTargets[0];

  // Upload JSONL via multipart form-data (Node.js compatible)
  const formData = new FormData();

  // Add staged upload parameters
  stagedTarget.parameters.forEach((param) => {
    formData.append(param.name, param.value);
  });

  // Add file as Blob
  const blob = new Blob([jsonlContent], { type: 'text/jsonl' });
  formData.append('file', blob, 'bulk-mutation-vars.jsonl');

  const uploadResponse = await fetch(stagedTarget.url, {
    method: 'POST',
    body: formData as any,
  });

  if (!uploadResponse.ok) {
    throw new Error(`JSONL upload failed: ${uploadResponse.statusText}`);
  }

  logger.info({ resourceUrl: stagedTarget.resourceUrl }, 'JSONL uploaded');

  // Extract the staged upload path for bulkOperationRunMutation
  const stagedUploadPath = getStagedUploadPath(stagedTarget);

  logger.debug({
    stagedUploadPath: stagedUploadPath?.substring(0, 20) + '... (length: ' + stagedUploadPath?.length + ')',
    hasResourceUrl: !!stagedTarget.resourceUrl
  }, 'Staged upload path extracted');

  return stagedUploadPath;
}

/**
 * Extract the staged upload path from a staged target
 * Uses the "key" parameter which contains the GCS path (e.g., tmp/.../bulk/...)
 *
 * Note: resourceUrl returns the upload URL (https://shopify-staged-uploads.storage.googleapis.com/)
 * which is NOT the correct value for bulkOperationRunMutation's stagedUploadPath parameter.
 *
 * @param stagedTarget - Staged target from stagedUploadsCreate
 * @returns Staged upload path for bulkOperationRunMutation
 */
function getStagedUploadPath(stagedTarget: {
  url: string;
  resourceUrl: string | null;
  parameters: Array<{ name: string; value: string }>;
}): string {
  // Find the "key" parameter which contains the staged upload path
  // This is the GCS bucket path like: tmp/12345/bulk/67890/bulk_op_vars
  const keyParam = stagedTarget.parameters.find(p => p.name === 'key');

  if (!keyParam) {
    throw new Error(
      'Staged upload path not found: no "key" parameter in staged upload response. ' +
      'Available parameters: ' + stagedTarget.parameters.map(p => p.name).join(', ')
    );
  }

  return keyParam.value;
}

// Helper: Poll bulk operation (mutation)
async function pollBulkOperationMutation(
  client: any,
  bulkOpId: string
): Promise<Omit<JobResult, 'bulkOperationId'>> {
  const maxWaitTime = 2 * 60 * 60 * 1000; // 2 hours
  const pollInterval = 10000; // 10 seconds
  let elapsedTime = 0;

  while (elapsedTime < maxWaitTime) {
    const statusQuery = `
      query {
        currentBulkOperation {
          id
          status
          errorCode
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
        return {
          updatedCount: 0,
          failedCount: 0,
          errorPreview: null,
        };
      }

      // Download and parse mutation results
      const result = await downloadAndParseMutationResults(op.url);
      return result;
    }

    if (op.status === 'FAILED') {
      throw new Error(`Bulk operation failed: ${op.errorCode || 'UNKNOWN'}`);
    }

    // Still running
    await sleep(pollInterval);
    elapsedTime += pollInterval;
  }

  throw new Error(
    'TIMEOUT: Bulk mutation operation timed out after 2 hours. ' +
    'This may indicate a Shopify API issue or an unusually large batch. ' +
    'Try: (1) Split into smaller batches with max_items, (2) Check Shopify status page, (3) Contact support with Job ID.'
  );
}

// Helper: Download and parse mutation results using streaming (B4)
async function downloadAndParseMutationResults(
  url: string
): Promise<Omit<JobResult, 'bulkOperationId'>> {
  // B4: Use streaming to avoid loading entire JSONL into memory
  // Critical for handling 100K+ mutation results
  logger.info({ url }, 'Streaming JSONL mutation results');

  const { successCount, failedCount, errorPreview } = await streamJsonlCounts(url, 50);

  logger.info({ successCount, failedCount }, 'Finished streaming mutation results');

  return {
    updatedCount: successCount,
    failedCount,
    errorPreview,
  };
}

// Helper: Sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

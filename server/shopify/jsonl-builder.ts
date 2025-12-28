/**
 * JSONL Builder
 * Builds JSONL files for bulk mutations with chunking
 */

import type { Job } from '@prisma/client';

const CHUNK_SIZE_MB = 95;
const CHUNK_SIZE_BYTES = CHUNK_SIZE_MB * 1024 * 1024;

/**
 * Build mutation JSONL with chunking
 *
 * @param productIds - Array of product GIDs
 * @param job - Job record with metafield params
 * @returns Array of JSONL chunks (each chunk is an array of lines)
 */
export function buildMutationJsonl(productIds: string[], job: Job): string[][] {
  // TODO: Implement JSONL building with chunking (see PSEUDOCODE.md)
  // 1. Iterate over product IDs
  // 2. Build JSONL line for each product
  // 3. Chunk to <=95MB per chunk
  // 4. Return array of chunks

  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentSize = 0;

  for (const productId of productIds) {
    const line = buildJsonlLine(productId, job);
    const lineSize = Buffer.byteLength(line, 'utf8');

    // Check if adding this line exceeds chunk size
    if (currentSize + lineSize > CHUNK_SIZE_BYTES) {
      // Finalize current chunk
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }

    currentChunk.push(line);
    currentSize += lineSize;
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Build single JSONL line for metafieldsSet mutation
 *
 * @param productId - Product GID
 * @param job - Job record with metafield params
 * @returns JSONL line (with newline)
 */
function buildJsonlLine(productId: string, job: Job): string {
  // Parse value based on type
  const parsedValue = parseMetafieldValue(job.value, job.type);

  // For metafieldsSet bulk mutation, each JSONL line is an object with ownerId and metafields
  const input = {
    ownerId: productId,
    namespace: job.namespace,
    key: job.key,
    type: job.type,
    value: parsedValue,
  };

  return JSON.stringify(input) + '\n';
}

/**
 * Parse metafield value based on type
 *
 * @param value - Raw value string
 * @param type - Metafield type
 * @returns Parsed value as string
 */
function parseMetafieldValue(value: string, type: string): string {
  // TODO: Implement value parsing (see PSEUDOCODE.md)

  if (type === 'boolean') {
    const lowerValue = value.toLowerCase();
    return ['true', '1', 'yes'].includes(lowerValue) ? 'true' : 'false';
  }

  if (type === 'number_integer') {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid number_integer value: ${value}`);
    }
    return parsed.toString();
  }

  if (type === 'json') {
    // Validate JSON
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed);
    } catch (error) {
      throw new Error(`Invalid JSON value: ${value}`);
    }
  }

  // Default: single_line_text_field
  return value;
}

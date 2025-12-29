/**
 * Streaming JSONL Parser
 *
 * Parses JSONL files line-by-line without loading entire content into memory.
 * Critical for handling large bulk operation results (100K+ products).
 */

import { createLogger } from './logger.js';
import { Readable } from 'stream';
import { createInterface } from 'readline';

const log = createLogger({ module: 'stream-jsonl' });

/**
 * Process function type for streaming JSONL lines
 */
export type JsonlLineProcessor<T> = (line: string, obj: unknown, index: number) => T | null;

/**
 * Stream and parse JSONL from a URL
 *
 * Uses Node.js streams to process line-by-line without loading
 * the entire file into memory. Essential for large bulk operation results.
 *
 * @param url - URL to fetch JSONL from
 * @param processor - Function to process each parsed line
 * @param options - Processing options
 * @returns Collected results from processor
 */
export async function streamJsonl<T>(
  url: string,
  processor: JsonlLineProcessor<T>,
  options: {
    maxItems?: number;
    onProgress?: (count: number) => void;
  } = {}
): Promise<T[]> {
  const { maxItems = Infinity, onProgress } = options;
  const results: T[] = [];
  let lineIndex = 0;
  let errorCount = 0;

  log.debug({ url, maxItems }, 'Starting JSONL stream');

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch JSONL: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  // Convert web ReadableStream to Node.js Readable
  const nodeStream = Readable.fromWeb(response.body as any);

  // Create readline interface for line-by-line processing
  const rl = createInterface({
    input: nodeStream,
    crlfDelay: Infinity, // Handle both \n and \r\n
  });

  return new Promise((resolve, reject) => {
    rl.on('line', (line: string) => {
      // Skip empty lines
      if (!line.trim()) {
        return;
      }

      // Stop if we've hit maxItems
      if (results.length >= maxItems) {
        rl.close();
        return;
      }

      try {
        const obj = JSON.parse(line);
        const result = processor(line, obj, lineIndex);

        if (result !== null) {
          results.push(result);
        }

        lineIndex++;

        // Progress callback every 1000 items
        if (onProgress && lineIndex % 1000 === 0) {
          onProgress(lineIndex);
        }
      } catch (parseError) {
        errorCount++;
        if (errorCount <= 5) {
          log.warn({ error: parseError, lineIndex, line: line.substring(0, 100) }, 'Failed to parse JSONL line');
        }
      }
    });

    rl.on('close', () => {
      log.debug({ totalLines: lineIndex, resultCount: results.length, errorCount }, 'JSONL stream completed');
      resolve(results);
    });

    rl.on('error', (error) => {
      log.error({ error }, 'JSONL stream error');
      reject(error);
    });

    // Handle stream errors
    nodeStream.on('error', (error) => {
      log.error({ error }, 'Fetch stream error');
      rl.close();
      reject(error);
    });
  });
}

/**
 * Stream and count JSONL entries with success/failure tracking
 *
 * Specialized for bulk mutation result processing.
 *
 * @param url - URL to fetch JSONL from
 * @param maxErrorLines - Maximum error lines to capture
 * @returns Count statistics and error preview
 */
export async function streamJsonlCounts(
  url: string,
  maxErrorLines: number = 50
): Promise<{
  successCount: number;
  failedCount: number;
  errorPreview: string | null;
}> {
  let successCount = 0;
  let failedCount = 0;
  const errorLines: string[] = [];

  await streamJsonl(url, (line, obj: any) => {
    // Check for userErrors in response
    if (obj.userErrors && Array.isArray(obj.userErrors) && obj.userErrors.length > 0) {
      failedCount++;
      if (errorLines.length < maxErrorLines) {
        errorLines.push(line);
      }
    } else {
      successCount++;
    }
    return null; // Don't collect results
  });

  let errorPreview: string | null = null;
  if (errorLines.length > 0) {
    errorPreview = errorLines.join('\n');
    // Truncate to 10KB
    if (Buffer.byteLength(errorPreview, 'utf8') > 10 * 1024) {
      errorPreview = errorPreview.substring(0, 10 * 1024) + '\n... (truncated)';
    }
  }

  return {
    successCount,
    failedCount,
    errorPreview,
  };
}

/**
 * Stream product IDs from JSONL query results
 *
 * Specialized for bulk query result processing.
 *
 * @param url - URL to fetch JSONL from
 * @param maxItems - Maximum items to collect
 * @returns Array of product GIDs
 */
export async function streamProductIds(url: string, maxItems: number): Promise<string[]> {
  return streamJsonl<string>(
    url,
    (_line, obj: any) => {
      if (obj.id && typeof obj.id === 'string') {
        return obj.id;
      }
      return null;
    },
    { maxItems }
  );
}

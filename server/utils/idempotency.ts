/**
 * Idempotency Hash Generator
 */

import crypto from 'crypto';
import type { JobCreateInput } from '../types/index.js';

/**
 * Generate SHA-256 hash of job input for idempotency checking
 *
 * @param input - Job creation input
 * @returns Hex-encoded SHA-256 hash
 */
export function generateInputHash(input: JobCreateInput): string {
  // TODO: Implement idempotency hash generation
  // 1. Concatenate all input fields in deterministic order
  // 2. Compute SHA-256 hash
  // 3. Return hex-encoded string

  const hashInput = [
    input.shopId,
    input.queryString,
    input.namespace,
    input.key,
    input.type,
    input.value,
    input.dryRun.toString(),
    input.maxItems.toString(),
  ].join('|');

  return crypto
    .createHash('sha256')
    .update(hashInput, 'utf8')
    .digest('hex');
}

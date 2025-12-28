/**
 * Idempotency Hash Tests
 */

import { describe, it, expect } from 'vitest';
import { generateInputHash } from '../idempotency.js';

describe('generateInputHash', () => {
  it('generates consistent hash for same inputs', () => {
    const input = {
      shopId: 'test.myshopify.com',
      queryString: 'status:active',
      namespace: 'custom',
      key: 'badge',
      type: 'single_line_text_field',
      value: 'Featured',
      dryRun: true,
      maxItems: 1000,
    };

    const hash1 = generateInputHash(input);
    const hash2 = generateInputHash(input);

    expect(hash1).toBe(hash2);
  });

  it('generates different hash for different inputs', () => {
    const input1 = {
      shopId: 'test.myshopify.com',
      queryString: 'status:active',
      namespace: 'custom',
      key: 'badge',
      type: 'single_line_text_field',
      value: 'Featured',
      dryRun: true,
      maxItems: 1000,
    };

    const input2 = {
      ...input1,
      value: 'Different Value',
    };

    const hash1 = generateInputHash(input1);
    const hash2 = generateInputHash(input2);

    expect(hash1).not.toBe(hash2);
  });

  it('generates different hash when dryRun changes', () => {
    const input1 = {
      shopId: 'test.myshopify.com',
      queryString: 'status:active',
      namespace: 'custom',
      key: 'badge',
      type: 'single_line_text_field',
      value: 'Featured',
      dryRun: true,
      maxItems: 1000,
    };

    const input2 = {
      ...input1,
      dryRun: false,
    };

    const hash1 = generateInputHash(input1);
    const hash2 = generateInputHash(input2);

    expect(hash1).not.toBe(hash2);
  });

  it('returns a hex-encoded SHA-256 hash', () => {
    const input = {
      shopId: 'test.myshopify.com',
      queryString: 'status:active',
      namespace: 'custom',
      key: 'badge',
      type: 'single_line_text_field',
      value: 'Featured',
      dryRun: true,
      maxItems: 1000,
    };

    const hash = generateInputHash(input);

    // SHA-256 hash is 64 hex characters
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

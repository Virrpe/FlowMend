/**
 * JSONL Builder Tests
 */

import { describe, it, expect } from 'vitest';
import { buildMutationJsonl } from '../jsonl-builder.js';
import type { Job } from '@prisma/client';

const createMockJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'test-job-id',
  shopId: 'test.myshopify.com',
  status: 'PENDING',
  queryString: 'status:active',
  namespace: 'custom',
  key: 'badge',
  type: 'single_line_text_field',
  value: 'Featured',
  dryRun: false,
  maxItems: 1000,
  matchedCount: null,
  updatedCount: null,
  failedCount: null,
  errorPreview: null,
  bulkOperationId: null,
  inputHash: 'test-hash',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('buildMutationJsonl', () => {
  it('builds JSONL for single product', () => {
    const job = createMockJob();
    const productIds = ['gid://shopify/Product/1'];

    const chunks = buildMutationJsonl(productIds, job);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(1);

    const line = chunks[0][0];
    const parsed = JSON.parse(line);

    expect(parsed).toEqual({
      ownerId: 'gid://shopify/Product/1',
      namespace: 'custom',
      key: 'badge',
      type: 'single_line_text_field',
      value: 'Featured',
    });
  });

  it('builds JSONL for multiple products', () => {
    const job = createMockJob();
    const productIds = [
      'gid://shopify/Product/1',
      'gid://shopify/Product/2',
      'gid://shopify/Product/3',
    ];

    const chunks = buildMutationJsonl(productIds, job);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toHaveLength(3);
  });

  it('parses boolean value correctly', () => {
    const job = createMockJob({
      type: 'boolean',
      value: 'true',
    });
    const productIds = ['gid://shopify/Product/1'];

    const chunks = buildMutationJsonl(productIds, job);
    const parsed = JSON.parse(chunks[0][0]);

    expect(parsed.value).toBe('true');
  });

  it('parses integer value correctly', () => {
    const job = createMockJob({
      type: 'number_integer',
      value: '42',
    });
    const productIds = ['gid://shopify/Product/1'];

    const chunks = buildMutationJsonl(productIds, job);
    const parsed = JSON.parse(chunks[0][0]);

    expect(parsed.value).toBe('42');
  });

  it('parses JSON value correctly', () => {
    const job = createMockJob({
      type: 'json',
      value: '{"test":"value"}',
    });
    const productIds = ['gid://shopify/Product/1'];

    const chunks = buildMutationJsonl(productIds, job);
    const parsed = JSON.parse(chunks[0][0]);

    expect(parsed.value).toBe('{"test":"value"}');
  });

  it('chunks large JSONL to <=95MB', () => {
    const job = createMockJob();
    // Create enough product IDs to exceed 95MB
    const largeValue = 'x'.repeat(100000); // 100KB per line
    const jobWithLargeValue = createMockJob({ value: largeValue });

    // This would create ~1000 * 100KB = 100MB if not chunked
    const productIds = Array.from({ length: 1000 }, (_, i) => `gid://shopify/Product/${i}`);

    const chunks = buildMutationJsonl(productIds, jobWithLargeValue);

    // Should be chunked into multiple chunks
    expect(chunks.length).toBeGreaterThan(1);

    // Each chunk should be <=95MB
    chunks.forEach((chunk) => {
      const chunkSize = chunk.reduce((sum, line) => sum + Buffer.byteLength(line, 'utf8'), 0);
      expect(chunkSize).toBeLessThanOrEqual(95 * 1024 * 1024);
    });
  });

  it('ends each line with newline', () => {
    const job = createMockJob();
    const productIds = ['gid://shopify/Product/1'];

    const chunks = buildMutationJsonl(productIds, job);

    chunks[0].forEach((line) => {
      expect(line).toMatch(/\n$/);
    });
  });
});

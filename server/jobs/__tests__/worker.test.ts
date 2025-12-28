/**
 * Worker Integration Tests
 * Tests the worker's job processing logic with mocked Shopify API responses
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import * as bulkQuery from '../../shopify/bulk-query.js';
import * as bulkMutation from '../../shopify/bulk-mutation.js';

const prisma = new PrismaClient();

// Mock the Shopify integration modules
vi.mock('../../shopify/bulk-query.js', () => ({
  runBulkQuery: vi.fn(),
}));

vi.mock('../../shopify/bulk-mutation.js', () => ({
  runBulkMutation: vi.fn(),
}));

describe('Worker Job Processing', () => {
  let testShopId: string;

  beforeEach(async () => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Create test shop
    testShopId = `test-${Date.now()}.myshopify.com`;
    await prisma.shop.create({
      data: {
        id: testShopId,
        accessToken: 'test-token',
        scopes: 'read_products,write_products',
      },
    });
  });

  afterEach(async () => {
    // Cleanup test data
    await prisma.jobEvent.deleteMany({ where: { job: { shopId: testShopId } } });
    await prisma.job.deleteMany({ where: { shopId: testShopId } });
    await prisma.shop.delete({ where: { id: testShopId } });
  });

  it('processes dry-run job successfully', async () => {
    // Create test job
    const job = await prisma.job.create({
      data: {
        shopId: testShopId,
        status: 'PENDING',
        queryString: 'status:active',
        namespace: 'custom',
        key: 'test_badge',
        type: 'single_line_text_field',
        value: 'Test',
        dryRun: true,
        maxItems: 10,
        inputHash: 'test-hash-1',
      },
    });

    // Mock bulk query to return 5 products
    const mockProductIds = Array.from(
      { length: 5 },
      (_, i) => `gid://shopify/Product/${i + 1}`
    );
    vi.mocked(bulkQuery.runBulkQuery).mockResolvedValue(mockProductIds);

    // Import and execute processJob function
    const { processJob } = await import('../worker-test-helper.js');
    await processJob(job.id, testShopId);

    // Verify job was updated correctly
    const updatedJob = await prisma.job.findUnique({ where: { id: job.id } });
    expect(updatedJob).toBeTruthy();
    expect(updatedJob!.status).toBe('COMPLETED');
    expect(updatedJob!.matchedCount).toBe(5);
    expect(updatedJob!.updatedCount).toBeNull(); // Dry-run doesn't update

    // Verify events were logged
    const events = await prisma.jobEvent.findMany({
      where: { jobId: job.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(events.length).toBeGreaterThan(0);
    expect(events.some(e => e.eventType === 'JOB_STARTED')).toBe(true);
    expect(events.some(e => e.eventType === 'QUERY_COMPLETED')).toBe(true);
    expect(events.some(e => e.eventType === 'JOB_COMPLETED')).toBe(true);
  });

  it('processes live job successfully', async () => {
    // Create test job
    const job = await prisma.job.create({
      data: {
        shopId: testShopId,
        status: 'PENDING',
        queryString: 'status:active',
        namespace: 'custom',
        key: 'test_badge',
        type: 'single_line_text_field',
        value: 'Test',
        dryRun: false,
        maxItems: 10,
        inputHash: 'test-hash-2',
      },
    });

    // Mock bulk query
    const mockProductIds = Array.from(
      { length: 3 },
      (_, i) => `gid://shopify/Product/${i + 1}`
    );
    vi.mocked(bulkQuery.runBulkQuery).mockResolvedValue(mockProductIds);

    // Mock bulk mutation
    vi.mocked(bulkMutation.runBulkMutation).mockResolvedValue({
      updatedCount: 3,
      failedCount: 0,
      errorPreview: null,
      bulkOperationId: 'gid://shopify/BulkOperation/123',
    });

    // Import and execute processJob function
    const { processJob } = await import('../worker-test-helper.js');
    await processJob(job.id, testShopId);

    // Verify job was updated correctly
    const updatedJob = await prisma.job.findUnique({ where: { id: job.id } });
    expect(updatedJob).toBeTruthy();
    expect(updatedJob!.status).toBe('COMPLETED');
    expect(updatedJob!.matchedCount).toBe(3);
    expect(updatedJob!.updatedCount).toBe(3);
    expect(updatedJob!.failedCount).toBe(0);
    expect(updatedJob!.bulkOperationId).toBe('gid://shopify/BulkOperation/123');

    // Verify mutation was called with correct params
    expect(bulkMutation.runBulkMutation).toHaveBeenCalledWith(
      expect.objectContaining({ id: testShopId }),
      expect.objectContaining({ id: job.id }),
      mockProductIds
    );
  });

  it('handles job with zero matches', async () => {
    const job = await prisma.job.create({
      data: {
        shopId: testShopId,
        status: 'PENDING',
        queryString: 'status:archived',
        namespace: 'custom',
        key: 'test',
        type: 'single_line_text_field',
        value: 'Test',
        dryRun: false,
        maxItems: 10,
        inputHash: 'test-hash-3',
      },
    });

    // Mock bulk query to return no products
    vi.mocked(bulkQuery.runBulkQuery).mockResolvedValue([]);

    const { processJob } = await import('../worker-test-helper.js');
    await processJob(job.id, testShopId);

    // Verify job completed with zero matches
    const updatedJob = await prisma.job.findUnique({ where: { id: job.id } });
    expect(updatedJob!.status).toBe('COMPLETED');
    expect(updatedJob!.matchedCount).toBe(0);
    expect(updatedJob!.updatedCount).toBe(0);

    // Verify mutation was NOT called
    expect(bulkMutation.runBulkMutation).not.toHaveBeenCalled();
  });

  it('handles job failures correctly', async () => {
    const job = await prisma.job.create({
      data: {
        shopId: testShopId,
        status: 'PENDING',
        queryString: 'invalid:query',
        namespace: 'custom',
        key: 'test',
        type: 'single_line_text_field',
        value: 'Test',
        dryRun: false,
        maxItems: 10,
        inputHash: 'test-hash-4',
      },
    });

    // Mock bulk query to throw error
    vi.mocked(bulkQuery.runBulkQuery).mockRejectedValue(
      new Error('Invalid query syntax')
    );

    const { processJob } = await import('../worker-test-helper.js');

    // Expect processJob to throw
    await expect(processJob(job.id, testShopId)).rejects.toThrow('Invalid query syntax');

    // Verify job was marked as FAILED
    const updatedJob = await prisma.job.findUnique({ where: { id: job.id } });
    expect(updatedJob!.status).toBe('FAILED');
    expect(updatedJob!.errorPreview).toContain('Invalid query syntax');

    // Verify failure event was logged
    const events = await prisma.jobEvent.findMany({
      where: { jobId: job.id },
    });
    expect(events.some(e => e.eventType === 'JOB_FAILED')).toBe(true);
  });
});

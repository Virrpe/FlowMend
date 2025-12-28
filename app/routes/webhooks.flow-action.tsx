/**
 * Flow Action Webhook Endpoint
 * Receives Shopify Flow action triggers
 *
 * CRITICAL: Must return 200 OK within 10 seconds to avoid retries
 */

import { json, type ActionFunctionArgs } from '@remix-run/node';
import { z } from 'zod';
import { verifyHmac } from '~/utils/hmac.server';
import { createJob, DuplicateJobError } from '~/jobs/creator.server';
import { enqueueJob } from '~/jobs/enqueuer.server';
import logger from '~/utils/logger.server';
import prisma from '~/db/client.server';

// Zod schema for Flow action input validation
const FlowActionInputSchema = z.object({
  query_string: z.string().min(1).max(500),
  namespace: z.string().regex(/^[a-z0-9_]+$/).max(50),
  key: z.string().regex(/^[a-z0-9_]+$/).max(50),
  type: z.enum(['single_line_text_field', 'boolean', 'number_integer', 'json']),
  value: z.string().max(1024),
  dry_run: z.boolean().optional().default(true),
  max_items: z.number().int().min(1).max(100000).optional().default(10000),
  action_run_id: z.string().optional(), // For idempotency
});

export async function action({ request }: ActionFunctionArgs) {
  const startTime = Date.now();

  try {
    // Extract headers
    const hmacSignature = request.headers.get('X-Shopify-Hmac-Sha256');
    const shopDomain = request.headers.get('X-Shopify-Shop-Domain');

    if (!hmacSignature || !shopDomain) {
      logger.warn({ shopDomain }, 'Missing required headers in Flow action request');
      return json({ error: 'Missing required headers' }, { status: 400 });
    }

    // Verify HMAC
    const bodyRaw = await request.text();
    const isValid = verifyHmac(
      bodyRaw,
      hmacSignature,
      process.env.SHOPIFY_API_SECRET!
    );

    if (!isValid) {
      logger.warn({ shopDomain }, 'HMAC validation failed');
      return json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse and validate body
    const body = JSON.parse(bodyRaw);
    const validationResult = FlowActionInputSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn({ shopDomain, errors: validationResult.error.errors }, 'Input validation failed');
      return json({
        error: 'Invalid input',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const input = validationResult.data;

    // Verify shop is installed
    const shop = await prisma.shop.findUnique({ where: { id: shopDomain } });
    if (!shop || shop.uninstalledAt) {
      logger.warn({ shopDomain }, 'Shop not found or uninstalled');
      return json({ error: 'Shop not authorized' }, { status: 403 });
    }

    // Create job with idempotency check
    let job;
    let deduped = false;

    try {
      job = await createJob({
        shopId: shopDomain,
        queryString: input.query_string,
        namespace: input.namespace,
        key: input.key,
        type: input.type,
        value: input.value,
        dryRun: input.dry_run,
        maxItems: input.max_items,
      });
    } catch (error) {
      if (error instanceof DuplicateJobError) {
        // Job already exists - return existing job ID
        deduped = true;
        const existingJob = await prisma.job.findFirst({
          where: { id: error.existingJobId },
          select: { id: true, status: true },
        });

        logger.info({
          jobId: error.existingJobId,
          shopDomain,
          elapsed: Date.now() - startTime
        }, 'Deduped Flow action request');

        // CRITICAL: Return 200 OK, not 409
        return json({
          ok: true,
          jobId: error.existingJobId,
          status: existingJob?.status || 'PENDING',
          deduped: true,
        }, { status: 200 });
      }
      throw error;
    }

    // Enqueue job for processing
    await enqueueJob(job.id, shopDomain);

    logger.info({
      jobId: job.id,
      shopDomain,
      dryRun: input.dry_run,
      elapsed: Date.now() - startTime
    }, 'Flow action job enqueued');

    // CRITICAL: Return 200 OK immediately (not 202)
    return json({
      ok: true,
      jobId: job.id,
      status: 'PENDING',
      deduped: false,
    }, { status: 200 });

  } catch (error) {
    logger.error({
      error,
      elapsed: Date.now() - startTime
    }, 'Flow action handler error');

    // Return 200 with error info to avoid retries
    return json({
      ok: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

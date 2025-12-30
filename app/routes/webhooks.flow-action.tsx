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

// Zod schema for Flow action input validation (from properties object)
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
    const shopDomainHeader = request.headers.get('X-Shopify-Shop-Domain');

    // Verify HMAC first
    const bodyRaw = await request.text();
    if (!hmacSignature) {
      logger.warn({}, 'Missing HMAC signature in Flow action request');
      return json({ error: 'Missing required headers' }, { status: 400 });
    }

    const isValid = verifyHmac(
      bodyRaw,
      hmacSignature,
      process.env.SHOPIFY_API_SECRET!
    );

    if (!isValid) {
      logger.warn({}, 'HMAC validation failed');
      return json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse body
    const body = JSON.parse(bodyRaw);

    // Extract shop context from top-level fields or headers
    const shopifyDomain =
      body?.shopify_domain ??
      body?.shopifyDomain ??
      shopDomainHeader ??
      null;
    const shopIdRaw =
      body?.shop_id ??
      body?.shopId ??
      body?.shopID ??
      null;

    if (!shopifyDomain) {
      logger.warn({}, 'shopify_domain is required');
      return json({ ok: false, error: 'shopify_domain is required' }, { status: 400 });
    }

    // Extract action inputs from properties object
    const props = body?.properties ?? {};
    const query_string = props?.query_string ?? props?.product_query ?? null;
    const namespace = props?.namespace ?? null;
    const key = props?.key ?? null;
    const type = props?.type ?? null;
    const value = props?.value ?? null;
    const dry_run = props?.dry_run ?? false;
    const max_items = props?.max_items ?? 100;

    if (!query_string) {
      logger.warn({ shopifyDomain }, 'query_string is required');
      return json({ ok: false, error: 'query_string is required' }, { status: 400 });
    }

    // Build input object for validation
    const input = {
      query_string,
      namespace: namespace || '',
      key: key || '',
      type: type || 'single_line_text_field',
      value: value || '',
      dry_run,
      max_items,
      action_run_id: body?.action_run_id ?? null,
    };

    // Validate input
    const validationResult = FlowActionInputSchema.safeParse(input);
    if (!validationResult.success) {
      logger.warn({ shopifyDomain, errors: validationResult.error.errors }, 'Input validation failed');
      return json({
        ok: false,
        error: 'Invalid input',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const validatedInput = validationResult.data;

    // Verify shop is installed
    const shopRow = await prisma.shop.findUnique({ where: { id: shopifyDomain } });
    if (!shopRow || shopRow.uninstalledAt) {
      logger.warn({ shopifyDomain }, 'Shop not installed');
      return json({ ok: false, error: 'shop not installed' }, { status: 401 });
    }

    console.log(`Flow action received`, {
      shopifyDomain,
      action_run_id: body?.action_run_id,
      action_definition_id: body?.action_definition_id,
    });

    // Create job with idempotency check
    let job;
    let deduped = false;

    try {
      job = await createJob({
        shopId: shopRow.id,
        queryString: validatedInput.query_string,
        namespace: validatedInput.namespace,
        key: validatedInput.key,
        type: validatedInput.type,
        value: validatedInput.value,
        dryRun: validatedInput.dry_run,
        maxItems: validatedInput.max_items,
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
          shopifyDomain,
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
    await enqueueJob(job.id, shopifyDomain);

    logger.info({
      jobId: job.id,
      shopifyDomain,
      dryRun: validatedInput.dry_run,
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

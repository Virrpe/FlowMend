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
  namespace: z.string().regex(/^[a-z0-9_]*$/).max(50),
  key: z.string().regex(/^[a-z0-9_]*$/).max(50),
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
      return json({ error: 'Missing required headers' }, { status: 400 });
    }

    const isValid = verifyHmac(
      bodyRaw,
      hmacSignature,
      process.env.SHOPIFY_API_SECRET!
    );

    if (!isValid) {
      logger.warn({ shop: shopDomainHeader || 'unknown', error: 'hmac_invalid' }, 'Flow webhook HMAC validation failed');
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
    const actionRunId = body?.action_run_id ?? null;

    const props = body?.properties ?? {};
    const dry_run = props?.dry_run ?? false;
    const max_items = props?.max_items ?? 100;

    if (!shopifyDomain) {
      logger.warn({ error: 'missing_shop_domain' }, 'Flow webhook missing shopify_domain');
      return json({ ok: false, error: 'shopify_domain is required' }, { status: 400 });
    }

    // Extract action inputs from properties object
    const query_string = props?.query_string ?? props?.product_query ?? null;
    const namespace = props?.namespace ?? null;
    const key = props?.key ?? null;
    const type = props?.type ?? null;
    const value = props?.value ?? null;

    if (!query_string) {
      logger.warn({ shop: shopifyDomain, error: 'missing_query_string' }, 'Flow webhook missing query_string');
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
      logger.warn({
        shop: shopifyDomain,
        error: 'validation_failed',
        details: validationResult.error.errors,
      }, 'Flow webhook validation failed');
      return json({
        ok: false,
        error: 'Invalid input',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    const validatedInput = validationResult.data;

    // Verify shop is installed
    const shopRow = await prisma.shop.findUnique({ where: { id: shopifyDomain } });

    if (!shopRow) {
      logger.warn({ shop: shopifyDomain, error: 'shop_not_found' }, 'Flow webhook shop not found');
      return json({ ok: false, error: 'shop not installed' }, { status: 401 });
    }

    if (shopRow.uninstalledAt) {
      logger.warn({ shop: shopifyDomain, error: 'shop_uninstalled' }, 'Flow webhook shop uninstalled');
      return json({ ok: false, error: 'shop not installed' }, { status: 401 });
    }

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
        actionRunId: validatedInput.action_run_id,
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

        // CRITICAL: Return 200 OK, not 409
        return json({
          ok: true,
          jobId: error.existingJobId,
          status: existingJob?.status || 'PENDING',
          deduped: true,
        }, { status: 200 });
      }

      logger.error({
        shop: shopifyDomain,
        error: 'createJob_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }, 'Flow webhook job creation failed');
      throw error;
    }

    // Enqueue job for processing
    await enqueueJob(job.id, shopifyDomain);

    // CRITICAL: Return 200 OK immediately (not 202)
    return json({
      ok: true,
      jobId: job.id,
      status: 'PENDING',
      deduped: false,
    }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error({
      error: 'handler_error',
      message: errorMessage,
      elapsed: Date.now() - startTime,
    }, 'Flow webhook internal error');

    // Return 200 with error info to avoid retries
    return json({
      ok: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

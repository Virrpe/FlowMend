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
  const timestamp = new Date().toISOString();

  try {
    // Extract headers
    const hmacSignature = request.headers.get('X-Shopify-Hmac-Sha256');
    const shopDomainHeader = request.headers.get('X-Shopify-Shop-Domain');

    // [FLOW_WEBHOOK] Entry point logging
    logger.info({
      prefix: '[FLOW_WEBHOOK]',
      timestamp,
      shop: shopDomainHeader || 'unknown',
      hasHmac: !!hmacSignature,
    }, '[FLOW_WEBHOOK] Received webhook request');

    // Verify HMAC first
    const bodyRaw = await request.text();

    // [FLOW_WEBHOOK] Log raw payload keys (sanitized - never values)
    let payloadKeys: string[] = [];
    try {
      const parsedForKeys = JSON.parse(bodyRaw);
      payloadKeys = Object.keys(parsedForKeys);
    } catch {
      payloadKeys = ['parse_error'];
    }
    logger.info({
      prefix: '[FLOW_WEBHOOK]',
      payloadKeys,
      hasBody: bodyRaw.length > 0,
    }, '[FLOW_WEBHOOK] Payload keys extracted');

    if (!hmacSignature) {
      logger.warn({ prefix: '[FLOW_WEBHOOK]', error: 'missing_hmac' }, '[FLOW_WEBHOOK] Missing HMAC signature');
      return json({ error: 'Missing required headers' }, { status: 400 });
    }

    const isValid = verifyHmac(
      bodyRaw,
      hmacSignature,
      process.env.SHOPIFY_API_SECRET!
    );

    if (!isValid) {
      logger.warn({ prefix: '[FLOW_WEBHOOK]', error: 'hmac_invalid' }, '[FLOW_WEBHOOK] HMAC validation failed');
      return json({ error: 'Invalid signature' }, { status: 401 });
    }

    // [FLOW_WEBHOOK] Log HMAC success
    logger.info({ prefix: '[FLOW_WEBHOOK]', step: 'hmac_valid' }, '[FLOW_WEBHOOK] HMAC validation passed');

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
    const actionRunId = body?.action_run_id ?? null;

    // [FLOW_WEBHOOK] Log extracted values before validation (sanitized)
    const props = body?.properties ?? {};
    const hasQuery = !!props?.query_string || !!props?.product_query;
    const hasNamespace = !!props?.namespace;
    const hasKey = !!props?.key;
    const hasType = !!props?.type;
    const hasValue = !!props?.value;
    const dry_run = props?.dry_run ?? false;
    const max_items = props?.max_items ?? 100;

    logger.info({
      prefix: '[FLOW_WEBHOOK]',
      shop: shopifyDomain || 'missing',
      action_run_id: actionRunId,
      extracted: {
        hasQuery,
        hasNamespace,
        hasKey,
        hasType,
        hasValue,
        dry_run,
        max_items,
        propsKeys: Object.keys(props),
      },
    }, '[FLOW_WEBHOOK] Extracted values before validation');

    if (!shopifyDomain) {
      logger.warn({ prefix: '[FLOW_WEBHOOK]', error: 'missing_shop_domain' }, '[FLOW_WEBHOOK] shopify_domain is required');
      return json({ ok: false, error: 'shopify_domain is required' }, { status: 400 });
    }

    // Extract action inputs from properties object
    const query_string = props?.query_string ?? props?.product_query ?? null;
    const namespace = props?.namespace ?? null;
    const key = props?.key ?? null;
    const type = props?.type ?? null;
    const value = props?.value ?? null;

    if (!query_string) {
      logger.warn({ prefix: '[FLOW_WEBHOOK]', shop: shopifyDomain, error: 'missing_query_string' }, '[FLOW_WEBHOOK] query_string is required');
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

    // [FLOW_WEBHOOK] Log validation result
    if (!validationResult.success) {
      const errorPaths = validationResult.error.errors.map(e => e.path.join('.'));
      logger.warn({
        prefix: '[FLOW_WEBHOOK]',
        shop: shopifyDomain,
        validation: 'FAILED',
        errorPaths,
        errorCount: validationResult.error.errors.length,
      }, '[FLOW_WEBHOOK] Validation FAILED');
      return json({
        ok: false,
        error: 'Invalid input',
        details: validationResult.error.errors
      }, { status: 400 });
    }

    logger.info({
      prefix: '[FLOW_WEBHOOK]',
      shop: shopifyDomain,
      validation: 'SUCCESS',
    }, '[FLOW_WEBHOOK] Validation SUCCESS');

    const validatedInput = validationResult.data;

    // Verify shop is installed
    const shopRow = await prisma.shop.findUnique({ where: { id: shopifyDomain } });

    // [FLOW_WEBHOOK] Log shop lookup result
    if (!shopRow) {
      logger.warn({
        prefix: '[FLOW_WEBHOOK]',
        shop: shopifyDomain,
        lookup: 'NOT_FOUND',
      }, '[FLOW_WEBHOOK] Shop lookup NOT_FOUND');
      return json({ ok: false, error: 'shop not installed' }, { status: 401 });
    }

    if (shopRow.uninstalledAt) {
      logger.warn({
        prefix: '[FLOW_WEBHOOK]',
        shop: shopifyDomain,
        lookup: 'UNINSTALLED',
        uninstalledAt: shopRow.uninstalledAt.toISOString(),
      }, '[FLOW_WEBHOOK] Shop lookup UNINSTALLED');
      return json({ ok: false, error: 'shop not installed' }, { status: 401 });
    }

    logger.info({
      prefix: '[FLOW_WEBHOOK]',
      shop: shopifyDomain,
      lookup: 'FOUND',
    }, '[FLOW_WEBHOOK] Shop lookup FOUND');

    // Create job with idempotency check
    let job;
    let deduped = false;

    // [FLOW_WEBHOOK] Log createJob attempt
    logger.info({
      prefix: '[FLOW_WEBHOOK]',
      shop: shopifyDomain,
      action_run_id: validatedInput.action_run_id,
      dry_run: validatedInput.dry_run,
      step: 'createJob_attempt',
    }, '[FLOW_WEBHOOK] Creating job attempt');

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

      // [FLOW_WEBHOOK] Log successful job creation
      logger.info({
        prefix: '[FLOW_WEBHOOK]',
        shop: shopifyDomain,
        jobId: job.id,
        action_run_id: validatedInput.action_run_id,
        step: 'createJob_success',
      }, '[FLOW_WEBHOOK] Job created successfully');
    } catch (error) {
      if (error instanceof DuplicateJobError) {
        // Job already exists - return existing job ID
        deduped = true;
        const existingJob = await prisma.job.findFirst({
          where: { id: error.existingJobId },
          select: { id: true, status: true },
        });

        // [FLOW_WEBHOOK] Log duplicate job
        logger.info({
          prefix: '[FLOW_WEBHOOK]',
          shop: shopifyDomain,
          jobId: error.existingJobId,
          status: 'DUPLICATE',
          elapsed: Date.now() - startTime,
        }, '[FLOW_WEBHOOK] Duplicate job - returning existing');

        // CRITICAL: Return 200 OK, not 409
        return json({
          ok: true,
          jobId: error.existingJobId,
          status: existingJob?.status || 'PENDING',
          deduped: true,
        }, { status: 200 });
      }

      // [FLOW_WEBHOOK] Log createJob error before re-throwing
      logger.error({
        prefix: '[FLOW_WEBHOOK]',
        shop: shopifyDomain,
        step: 'createJob_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: error?.constructor?.name || 'Unknown',
      }, '[FLOW_WEBHOOK] Job creation failed');
      throw error;
    }

    // Enqueue job for processing
    await enqueueJob(job.id, shopifyDomain);

    // [FLOW_WEBHOOK] Log successful enqueue and final response
    logger.info({
      prefix: '[FLOW_WEBHOOK]',
      shop: shopifyDomain,
      jobId: job.id,
      status: 'ENQUEUED',
      elapsed: Date.now() - startTime,
    }, '[FLOW_WEBHOOK] Response: status=200 job enqueued');

    // CRITICAL: Return 200 OK immediately (not 202)
    return json({
      ok: true,
      jobId: job.id,
      status: 'PENDING',
      deduped: false,
    }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // [FLOW_WEBHOOK] Log final error response
    logger.error({
      prefix: '[FLOW_WEBHOOK]',
      step: 'handler_error',
      errorMessage,
      errorType: error?.constructor?.name || 'Unknown',
      elapsed: Date.now() - startTime,
    }, '[FLOW_WEBHOOK] Response: status=500 internal error');

    // Return 200 with error info to avoid retries
    return json({
      ok: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

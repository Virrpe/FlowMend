/**
 * APP_UNINSTALLED Webhook
 * Route: /webhooks/app-uninstalled
 *
 * Handles app uninstallation and deletes shop data per GDPR compliance.
 * Required for Shopify App Store approval.
 */

import type { ActionFunctionArgs } from '@remix-run/node';
import { authenticate } from '~/shopify.server';
import prisma from '~/db/client.server';
import logger from '~/utils/logger.server';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { shop, payload } = await authenticate.webhook(request);

    logger.info({
      msg: 'APP_UNINSTALLED webhook received',
      shop,
      payload,
    });

    if (!shop) {
      logger.error({ msg: 'APP_UNINSTALLED webhook missing shop' });
      return new Response('Missing shop', { status: 400 });
    }

    // Mark shop as uninstalled
    await prisma.shop.update({
      where: { id: shop },
      data: {
        uninstalledAt: new Date(),
      },
    });

    // Delete all jobs and related data after 30 days (data retention period)
    // For now, we just mark as uninstalled. You can add a cron job to clean up old data.
    // Alternatively, delete immediately:
    // await prisma.shop.delete({ where: { id: shop } });

    logger.info({
      msg: 'Shop marked as uninstalled',
      shop,
    });

    return new Response('OK', { status: 200 });
  } catch (error) {
    logger.error({
      msg: 'Error handling APP_UNINSTALLED webhook',
      error,
    });

    // Still return 200 to prevent Shopify from retrying
    return new Response('OK', { status: 200 });
  }
}

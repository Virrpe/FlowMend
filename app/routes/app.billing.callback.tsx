/**
 * Billing Callback
 * Route: /app/billing/callback
 *
 * Handles redirect after merchant approves subscription on Shopify billing page.
 * Shopify adds a `charge_id` query parameter on success.
 */

import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticate } from '~/shopify.server';
import { activateSubscription } from '~/billing/subscription.server';
import logger from '~/utils/logger.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;

  const url = new URL(request.url);
  const chargeId = url.searchParams.get('charge_id');

  if (!chargeId) {
    logger.warn({
      msg: 'Billing callback missing charge_id',
      shopDomain,
    });
    return redirect('/app/billing?error=missing_charge_id');
  }

  try {
    // Convert charge_id to full GID format
    const subscriptionId = `gid://shopify/AppSubscription/${chargeId}`;

    await activateSubscription(shopDomain, subscriptionId);

    logger.info({
      msg: 'Subscription activated via callback',
      shopDomain,
      chargeId,
    });

    // Redirect to jobs page with success message
    return redirect('/app/jobs?billing=success');
  } catch (error) {
    logger.error({
      msg: 'Failed to activate subscription',
      shopDomain,
      chargeId,
      error,
    });

    return redirect('/app/billing?error=activation_failed');
  }
}

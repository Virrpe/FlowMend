/**
 * Billing Enforcement Middleware
 *
 * Protects app routes and requires active billing subscription.
 * Dev stores and partner test stores bypass this requirement.
 */

import { redirect } from '@remix-run/node';
import type { AppLoadContext } from '@remix-run/node';
import { getSubscriptionStatus } from './subscription.server';
import { BILLING_CONFIG, isDevStore } from './config.server';
import logger from '../utils/logger.server';

export interface BillingCheck {
  hasActiveSubscription: boolean;
  requiresPayment: boolean;
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
}

/**
 * Check if billing is required for the current request
 * Returns billing status and redirects if payment is required
 */
export async function requireBilling(
  request: Request,
  shopDomain: string,
  accessToken: string
): Promise<BillingCheck> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Check if this route requires billing
  const isProtectedRoute = BILLING_CONFIG.protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isFreeRoute = BILLING_CONFIG.freeRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Free routes are always accessible
  if (isFreeRoute || !isProtectedRoute) {
    return {
      hasActiveSubscription: false,
      requiresPayment: false,
      subscriptionStatus: null,
      trialEndsAt: null,
    };
  }

  // Dev stores bypass billing
  if (isDevStore(shopDomain)) {
    logger.info({
      msg: 'Billing bypassed for dev store',
      shopDomain,
      pathname,
    });

    return {
      hasActiveSubscription: true,
      requiresPayment: false,
      subscriptionStatus: 'DEV_BYPASS',
      trialEndsAt: null,
    };
  }

  // Check subscription status
  const subscription = await getSubscriptionStatus(shopDomain, accessToken);

  if (!subscription.hasActiveSubscription) {
    logger.warn({
      msg: 'Billing required - redirecting to billing page',
      shopDomain,
      pathname,
      subscriptionStatus: subscription.status,
    });

    // Redirect to billing page
    throw redirect('/app/billing');
  }

  return {
    hasActiveSubscription: true,
    requiresPayment: false,
    subscriptionStatus: subscription.status,
    trialEndsAt: subscription.trialEndsAt,
  };
}

/**
 * Helper to check if shop needs to set up billing
 * Used in loaders to determine UI state
 */
export async function checkBillingStatus(
  shopDomain: string,
  accessToken: string
): Promise<BillingCheck> {
  // Dev stores bypass billing
  if (isDevStore(shopDomain)) {
    return {
      hasActiveSubscription: true,
      requiresPayment: false,
      subscriptionStatus: 'DEV_BYPASS',
      trialEndsAt: null,
    };
  }

  const subscription = await getSubscriptionStatus(shopDomain, accessToken);

  return {
    hasActiveSubscription: subscription.hasActiveSubscription,
    requiresPayment: !subscription.hasActiveSubscription,
    subscriptionStatus: subscription.status,
    trialEndsAt: subscription.trialEndsAt,
  };
}

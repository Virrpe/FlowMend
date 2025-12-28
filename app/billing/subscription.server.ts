/**
 * Shopify Billing Subscription Management
 *
 * Handles subscription creation, cancellation, and status checks using
 * Shopify's AppSubscription API.
 */

import { GraphQLClient } from 'graphql-request';
import db from '../db/client.server';
import { BILLING_CONFIG, isDevStore } from './config.server';
import logger from '../utils/logger.server';

/**
 * Create a new app subscription with trial period
 */
export async function createSubscription(
  shopDomain: string,
  accessToken: string,
  returnUrl: string
): Promise<{ confirmationUrl: string; subscriptionId: string }> {
  const client = new GraphQLClient(
    `https://${shopDomain}/admin/api/2024-10/graphql.json`,
    {
      headers: {
        'X-Shopify-Access-Token': accessToken,
      },
    }
  );

  const mutation = `
    mutation CreateAppSubscription($name: String!, $price: Decimal!, $currencyCode: CurrencyCode!, $interval: AppPricingInterval!, $trialDays: Int!, $returnUrl: URL!) {
      appSubscriptionCreate(
        name: $name
        returnUrl: $returnUrl
        test: ${process.env.NODE_ENV === 'development'}
        lineItems: [{
          plan: {
            appRecurringPricingDetails: {
              price: { amount: $price, currencyCode: $currencyCode }
              interval: $interval
            }
          }
        }]
        trialDays: $trialDays
      ) {
        userErrors {
          field
          message
        }
        confirmationUrl
        appSubscription {
          id
          status
          trialDays
        }
      }
    }
  `;

  const variables = {
    name: BILLING_CONFIG.plan.name,
    price: BILLING_CONFIG.plan.price,
    currencyCode: BILLING_CONFIG.plan.currencyCode,
    interval: BILLING_CONFIG.plan.interval,
    trialDays: BILLING_CONFIG.plan.trialDays,
    returnUrl,
  };

  try {
    const response: any = await client.request(mutation, variables);

    if (response.appSubscriptionCreate.userErrors.length > 0) {
      const errors = response.appSubscriptionCreate.userErrors
        .map((e: any) => e.message)
        .join(', ');
      throw new Error(`Subscription creation failed: ${errors}`);
    }

    const subscription = response.appSubscriptionCreate.appSubscription;
    const confirmationUrl = response.appSubscriptionCreate.confirmationUrl;

    logger.info({
      msg: 'Subscription created',
      shopDomain,
      subscriptionId: subscription.id,
      status: subscription.status,
    });

    return {
      confirmationUrl,
      subscriptionId: subscription.id,
    };
  } catch (error) {
    logger.error({ msg: 'Failed to create subscription', shopDomain, error });
    throw error;
  }
}

/**
 * Get the current subscription status for a shop
 */
export async function getSubscriptionStatus(
  shopDomain: string,
  accessToken: string
): Promise<{
  hasActiveSubscription: boolean;
  status: string | null;
  subscriptionId: string | null;
  trialEndsAt: Date | null;
}> {
  // Development stores bypass billing
  if (isDevStore(shopDomain)) {
    return {
      hasActiveSubscription: true,
      status: 'DEV_BYPASS',
      subscriptionId: null,
      trialEndsAt: null,
    };
  }

  // Check database first
  const shop = await db.shop.findUnique({
    where: { id: shopDomain },
    select: {
      subscriptionId: true,
      subscriptionStatus: true,
      trialEndsAt: true,
    },
  });

  if (!shop) {
    throw new Error(`Shop not found: ${shopDomain}`);
  }

  // If we have a subscription ID, verify it's still active with Shopify
  if (shop.subscriptionId) {
    try {
      const client = new GraphQLClient(
        `https://${shopDomain}/admin/api/2024-10/graphql.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
          },
        }
      );

      const query = `
        query GetCurrentSubscription {
          currentAppInstallation {
            activeSubscriptions {
              id
              status
              trialDays
              currentPeriodEnd
            }
          }
        }
      `;

      const response: any = await client.request(query);
      const subscriptions =
        response.currentAppInstallation?.activeSubscriptions || [];

      if (subscriptions.length > 0) {
        const subscription = subscriptions[0];

        // Update database with latest status
        await db.shop.update({
          where: { id: shopDomain },
          data: {
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
          },
        });

        return {
          hasActiveSubscription: subscription.status === 'ACTIVE',
          status: subscription.status,
          subscriptionId: subscription.id,
          trialEndsAt: shop.trialEndsAt,
        };
      }
    } catch (error) {
      logger.error({
        msg: 'Failed to fetch subscription status',
        shopDomain,
        error,
      });
    }
  }

  // No active subscription found
  return {
    hasActiveSubscription: false,
    status: shop.subscriptionStatus,
    subscriptionId: shop.subscriptionId,
    trialEndsAt: shop.trialEndsAt,
  };
}

/**
 * Activate a subscription after merchant approval
 * Called via webhook or redirect callback
 */
export async function activateSubscription(
  shopDomain: string,
  subscriptionId: string
): Promise<void> {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + BILLING_CONFIG.plan.trialDays);

  await db.shop.update({
    where: { id: shopDomain },
    data: {
      subscriptionId,
      subscriptionStatus: 'ACTIVE',
      planName: BILLING_CONFIG.plan.name,
      trialEndsAt,
      billingInterval: BILLING_CONFIG.plan.interval,
    },
  });

  logger.info({
    msg: 'Subscription activated',
    shopDomain,
    subscriptionId,
    trialEndsAt,
  });
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  shopDomain: string,
  accessToken: string,
  subscriptionId: string
): Promise<void> {
  const client = new GraphQLClient(
    `https://${shopDomain}/admin/api/2024-10/graphql.json`,
    {
      headers: {
        'X-Shopify-Access-Token': accessToken,
      },
    }
  );

  const mutation = `
    mutation CancelSubscription($id: ID!) {
      appSubscriptionCancel(id: $id) {
        userErrors {
          field
          message
        }
        appSubscription {
          id
          status
        }
      }
    }
  `;

  try {
    const response: any = await client.request(mutation, { id: subscriptionId });

    if (response.appSubscriptionCancel.userErrors.length > 0) {
      const errors = response.appSubscriptionCancel.userErrors
        .map((e: any) => e.message)
        .join(', ');
      throw new Error(`Subscription cancellation failed: ${errors}`);
    }

    // Update database
    await db.shop.update({
      where: { id: shopDomain },
      data: {
        subscriptionStatus: 'CANCELLED',
      },
    });

    logger.info({
      msg: 'Subscription cancelled',
      shopDomain,
      subscriptionId,
    });
  } catch (error) {
    logger.error({ msg: 'Failed to cancel subscription', shopDomain, error });
    throw error;
  }
}

/**
 * Billing Configuration
 *
 * Defines the billing plans, pricing, and trial settings for Flowmend.
 */

export const BILLING_CONFIG = {
  /**
   * Single paid plan for MVP
   */
  plan: {
    name: 'Pro',
    price: 29.99,
    currencyCode: 'USD',
    interval: 'EVERY_30_DAYS' as const,
    trialDays: 7,
  },

  /**
   * Features included in the Pro plan
   */
  features: [
    'Unlimited bulk metafield operations',
    'Up to 100,000 products per job',
    'Dry-run mode for safe testing',
    'Full audit logs and error tracking',
    'Priority support',
  ],

  /**
   * Routes that require active billing
   * Excludes: auth, billing page itself, webhooks
   */
  protectedRoutes: [
    '/app/jobs',
    '/app/templates',
  ],

  /**
   * Free routes accessible without billing
   */
  freeRoutes: [
    '/app/billing',
    '/app/support',
    '/app/privacy',
  ],
} as const;

/**
 * Check if a shop is in a development/test environment
 * Development stores and partner test stores should bypass billing
 */
export function isDevStore(shopDomain: string): boolean {
  // Shopify dev stores have specific patterns
  // You may need to adjust this based on your testing setup
  return (
    process.env.NODE_ENV === 'development' ||
    shopDomain.includes('.myshopify.io') || // Test stores
    process.env.BYPASS_BILLING === 'true'
  );
}

/**
 * Shopify API Configuration for Remix App
 *
 * This file sets up the Shopify App Bridge and OAuth for embedded admin UI.
 * Reference: https://shopify.dev/docs/apps/auth/oauth
 */

import '@shopify/shopify-app-remix/adapters/node';
import { shopifyApp, LATEST_API_VERSION, DeliveryMethod } from '@shopify/shopify-app-remix/server';
import prisma from './db/client.server';
import { sessionStorage } from './session.server';
import { encryptToken } from '../server/utils/encryption.js';

// Initialize Shopify app
const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SHOPIFY_SCOPES?.split(',') || ['read_products', 'write_products'],
  appUrl: process.env.SHOPIFY_APP_URL!,
  apiVersion: (process.env.SHOPIFY_API_VERSION as typeof LATEST_API_VERSION) || LATEST_API_VERSION,
  sessionStorage,
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: '/webhooks/app-uninstalled',
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      // Store or update shop record in database
      const shop = await prisma.shop.upsert({
        where: { id: session.shop },
        create: {
          id: session.shop,
          accessToken: encryptToken(session.accessToken!),
          scopes: session.scope || '',
          installedAt: new Date(),
        },
        update: {
          accessToken: encryptToken(session.accessToken!),
          scopes: session.scope || '',
          uninstalledAt: null, // Mark as reinstalled if was previously uninstalled
        },
      });

      console.log('[Shopify Auth] Shop installed:', shop.id);
    },
  },
});

export default shopify;
export const authenticate = shopify.authenticate;
export const storage = sessionStorage;

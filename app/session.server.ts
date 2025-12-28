/**
 * Custom Prisma Session Storage for Shopify App
 */

import type { Session } from '@shopify/shopify-api';
import prisma from './db/client.server';
import { encryptToken } from '../server/utils/encryption.js';

interface SessionStorage {
  storeSession(session: Session): Promise<boolean>;
  loadSession(id: string): Promise<Session | undefined>;
  deleteSession(id: string): Promise<boolean>;
  deleteSessions(ids: string[]): Promise<boolean>;
  findSessionsByShop(shop: string): Promise<Session[]>;
}

export const sessionStorage: SessionStorage = {
  async storeSession(session: Session): Promise<boolean> {
    try {
      // Store session in a JSON field in the Shop model or create a separate Session model
      // For MVP, we'll just update the Shop record
      const encryptedToken = session.accessToken ? encryptToken(session.accessToken) : '';

      await prisma.shop.upsert({
        where: { id: session.shop },
        create: {
          id: session.shop,
          accessToken: encryptedToken,
          scopes: session.scope || '',
          installedAt: new Date(),
        },
        update: {
          accessToken: encryptedToken,
          scopes: session.scope || '',
        },
      });
      return true;
    } catch (error) {
      console.error('Failed to store session:', error);
      return false;
    }
  },

  async loadSession(id: string): Promise<Session | undefined> {
    try {
      const shop = await prisma.shop.findUnique({
        where: { id: id.replace('offline_', '') }, // Handle both online and offline sessions
      });

      if (!shop) return undefined;

      // Reconstruct a minimal session object
      return {
        id,
        shop: shop.id,
        state: '',
        isOnline: false,
        accessToken: shop.accessToken,
        scope: shop.scopes,
      } as Session;
    } catch (error) {
      console.error('Failed to load session:', error);
      return undefined;
    }
  },

  async deleteSession(id: string): Promise<boolean> {
    try {
      // Mark shop as uninstalled instead of deleting
      await prisma.shop.update({
        where: { id: id.replace('offline_', '') },
        data: { uninstalledAt: new Date() },
      });
      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  },

  async deleteSessions(ids: string[]): Promise<boolean> {
    try {
      const shopIds = ids.map(id => id.replace('offline_', ''));
      await prisma.shop.updateMany({
        where: { id: { in: shopIds } },
        data: { uninstalledAt: new Date() },
      });
      return true;
    } catch (error) {
      console.error('Failed to delete sessions:', error);
      return false;
    }
  },

  async findSessionsByShop(shop: string): Promise<Session[]> {
    try {
      const shopRecord = await prisma.shop.findUnique({
        where: { id: shop },
      });

      if (!shopRecord) return [];

      return [{
        id: `offline_${shop}`,
        shop: shopRecord.id,
        state: '',
        isOnline: false,
        accessToken: shopRecord.accessToken,
        scope: shopRecord.scopes,
      } as Session];
    } catch (error) {
      console.error('Failed to find sessions:', error);
      return [];
    }
  },
};

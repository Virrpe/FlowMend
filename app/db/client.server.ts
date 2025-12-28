/**
 * Prisma Client for Remix (Server-side only)
 */

import { PrismaClient } from '@prisma/client';

// Prevent multiple instances in development
declare global {
  // eslint-disable-next-line no-var
  var __db: PrismaClient | undefined;
}

const prisma = global.__db || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__db = prisma;
}

export default prisma;

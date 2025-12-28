#!/usr/bin/env tsx
/**
 * Token Migration Script
 * Encrypts plaintext tokens already in the database
 *
 * Usage: npx tsx scripts/migrate-encrypt-tokens.ts
 */

import { PrismaClient } from '@prisma/client';
import { encryptToken, decryptToken } from '../server/utils/encryption.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Token Encryption Migration\n');

  const shops = await prisma.shop.findMany({
    where: {
      uninstalledAt: null, // Only active shops
    },
  });

  console.log(`Found ${shops.length} active shops\n`);

  let encryptedCount = 0;
  let alreadyEncryptedCount = 0;
  let errorCount = 0;

  for (const shop of shops) {
    try {
      // Test if token is already encrypted
      // Encrypted tokens have format "iv:encryptedData" (contains ':')
      if (shop.accessToken.includes(':')) {
        // Try to decrypt - if successful, already encrypted
        try {
          decryptToken(shop.accessToken);
          console.log(`✅ ${shop.id}: Already encrypted`);
          alreadyEncryptedCount++;
          continue;
        } catch {
          // Decryption failed, might be plaintext with ':' char
          // Proceed to encrypt
        }
      }

      // Encrypt the token
      const encryptedToken = encryptToken(shop.accessToken);

      await prisma.shop.update({
        where: { id: shop.id },
        data: { accessToken: encryptedToken },
      });

      console.log(`🔒 ${shop.id}: Encrypted`);
      encryptedCount++;

    } catch (error) {
      console.error(`❌ ${shop.id}: Error - ${error}`);
      errorCount++;
    }
  }

  console.log('\n📊 Migration Summary:');
  console.log(`   Encrypted: ${encryptedCount}`);
  console.log(`   Already encrypted: ${alreadyEncryptedCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`   Total: ${shops.length}\n`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});

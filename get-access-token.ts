#!/usr/bin/env tsx
/**
 * Simple script to help get Shopify access token
 * This creates a minimal OAuth server to capture the token
 */

import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';

const app = express();
const PORT = 3001; // Different port to avoid conflicts

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY!;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;
const SCOPES = 'read_products,write_products';
const REDIRECT_URI = `http://localhost:${PORT}/auth/callback`;

console.log('\n🔐 Shopify Access Token Helper\n');
console.log('This will help you get an access token for testing.\n');

// Step 1: Ask for store domain
console.log('📝 STEP 1: Enter your development store domain');
console.log('   Example: my-test-store.myshopify.com\n');

process.stdout.write('Store domain: ');
process.stdin.once('data', (data) => {
  const storeDomain = data.toString().trim();

  if (!storeDomain.includes('.myshopify.com')) {
    console.error('\n❌ Invalid store domain. Must be a .myshopify.com domain.');
    process.exit(1);
  }

  console.log(`\n✅ Store domain: ${storeDomain}\n`);

  // Generate nonce for security
  const nonce = crypto.randomBytes(16).toString('hex');

  // Build install URL
  const installUrl = `https://${storeDomain}/admin/oauth/authorize?` +
    `client_id=${SHOPIFY_API_KEY}&` +
    `scope=${SCOPES}&` +
    `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
    `state=${nonce}`;

  let accessToken = '';

  // Set up OAuth callback server
  app.get('/auth/callback', async (req, res) => {
    const { code, state } = req.query;

    if (state !== nonce) {
      res.status(400).send('Invalid state parameter');
      return;
    }

    try {
      // Exchange code for access token
      const tokenUrl = `https://${storeDomain}/admin/oauth/access_token`;
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: SHOPIFY_API_KEY,
          client_secret: SHOPIFY_API_SECRET,
          code,
        }),
      });

      const data = await response.json() as { access_token: string };
      accessToken = data.access_token;

      res.send(`
        <html>
          <body style="font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px;">
            <h1 style="color: #008060;">✅ Success!</h1>
            <p>Access token obtained. You can close this window and return to your terminal.</p>
          </body>
        </html>
      `);

      // Print credentials to console
      console.log('\n\n✅ SUCCESS! Got your access token!\n');
      console.log('📋 Add these to your .env file:\n');
      console.log(`SHOPIFY_STORE_DOMAIN=${storeDomain}`);
      console.log(`TEST_SHOP_ACCESS_TOKEN=${accessToken}\n`);

      // Auto-update .env file
      console.log('🔄 Updating .env file automatically...\n');

      const fs = await import('fs');
      let envContent = fs.readFileSync('.env', 'utf-8');

      // Add or update SHOPIFY_STORE_DOMAIN
      if (envContent.includes('SHOPIFY_STORE_DOMAIN=')) {
        envContent = envContent.replace(/SHOPIFY_STORE_DOMAIN=.*/g, `SHOPIFY_STORE_DOMAIN=${storeDomain}`);
      } else {
        envContent += `\nSHOPIFY_STORE_DOMAIN=${storeDomain}`;
      }

      // Update TEST_SHOP_ACCESS_TOKEN
      envContent = envContent.replace(/TEST_SHOP_ACCESS_TOKEN=.*/g, `TEST_SHOP_ACCESS_TOKEN=${accessToken}`);

      fs.writeFileSync('.env', envContent);

      console.log('✅ .env file updated!\n');
      console.log('🎉 You can now run: npx tsx test-shopify-credentials.ts\n');

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 2000);

    } catch (error) {
      console.error('\n❌ Error getting access token:', error);
      res.status(500).send('Error getting access token');
      setTimeout(() => {
        server.close();
        process.exit(1);
      }, 2000);
    }
  });

  const server = app.listen(PORT, () => {
    console.log(`📡 OAuth server running on http://localhost:${PORT}\n`);
    console.log('📝 STEP 2: Open this URL in your browser to authorize:\n');
    console.log(`   ${installUrl}\n`);
    console.log('👉 This will redirect you to Shopify to authorize the app.\n');
    console.log('⏳ Waiting for authorization...\n');
  });
});

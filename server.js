#!/usr/bin/env node
/**
 * Production Express server for FlowMend
 * Integrates custom OAuth/webhooks with Remix app serving
 */

import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Create BullMQ queue
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const jobQueue = new Queue('flowmend-jobs', { connection });

// Parse JSON for webhooks
app.use(express.json());
app.get("/", (req,res)=> {
  const hasQuery = typeof req.originalUrl==="string" && req.originalUrl.includes("?");
  const hasShopParam = (req.query && req.query.shop) || (typeof req.originalUrl==="string" && req.originalUrl.includes("shop="));
  if (hasShopParam) {
    const qs = hasQuery ? req.originalUrl.slice(1) : "";
    return res.redirect(302, `/auth${qs}`);
  }
  return res.redirect(302, "/app");
});

// ============================================================================
// SESSION TOKEN VERIFICATION MIDDLEWARE
// ============================================================================

function verifySessionToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify JWT signature
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    if (!apiSecret) {
      throw new Error('SHOPIFY_API_SECRET not configured');
    }

    const payload = jwt.verify(token, apiSecret, {
      algorithms: ['HS256'],
    });

    // Extract shop domain from 'dest' field (format: "https://shop.myshopify.com")
    const shopDomain = payload.dest.replace('https://', '');

    // Attach shop domain to request
    req.shopDomain = shopDomain;

    next();
  } catch (error) {
    console.error('Session token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

// ============================================================================
// API ROUTES (Protected by Session Token)
// ============================================================================

// GET /api/me - Get current shop info
app.get('/api/me', verifySessionToken, async (req, res) => {
  try {
    const shop = await prisma.shop.findUnique({
      where: { id: req.shopDomain },
      select: {
        id: true,
        installedAt: true,
        subscriptionStatus: true,
        planName: true,
      },
    });

    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    res.json(shop);
  } catch (error) {
    console.error('Error fetching shop:', error);
    res.status(500).json({ error: 'Failed to fetch shop info' });
  }
});

// GET /api/jobs - List jobs for current shop
app.get('/api/jobs', verifySessionToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const jobs = await prisma.job.findMany({
      where: { shopId: req.shopDomain },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.job.count({
      where: { shopId: req.shopDomain },
    });

    res.json({ jobs, total });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/:id - Get job detail with events
app.get('/api/jobs/:id', verifySessionToken, async (req, res) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findFirst({
      where: {
        id,
        shopId: req.shopDomain, // Ensure shop owns this job
      },
      include: {
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// GET /api/templates - Get query templates
app.get('/api/templates', verifySessionToken, async (req, res) => {
  // Static template list for now
  const templates = [
    {
      id: 'clearance-items',
      name: 'Tag Clearance Items',
      description: 'Add a clearance tag to products on sale',
      queryString: 'price:<10 AND inventory_total:>0',
      namespace: 'custom',
      key: 'clearance',
      type: 'single_line_text_field',
      example: 'true',
    },
    {
      id: 'seasonal-collection',
      name: 'Mark Seasonal Products',
      description: 'Add season metadata to products in a collection',
      queryString: 'collection:winter-2024',
      namespace: 'custom',
      key: 'season',
      type: 'single_line_text_field',
      example: 'Winter 2024',
    },
    {
      id: 'bulk-availability',
      name: 'Update Product Availability',
      description: 'Set custom availability status based on inventory',
      queryString: 'inventory_total:>100',
      namespace: 'custom',
      key: 'availability',
      type: 'single_line_text_field',
      example: 'In Stock',
    },
    {
      id: 'featured-products',
      name: 'Mark Featured Products',
      description: 'Add featured flag to specific products',
      queryString: 'tag:featured',
      namespace: 'custom',
      key: 'is_featured',
      type: 'boolean',
      example: 'true',
    },
  ];

  res.json({ templates });
});

// POST /api/query/validate - Test query syntax
app.post('/api/query/validate', verifySessionToken, async (req, res) => {
  try {
    const { query_string } = req.body;

    // Validation
    if (!query_string || typeof query_string !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'query_string is required',
        warnings: [],
      });
    }

    const trimmedQuery = query_string.trim();

    // Block empty queries
    if (trimmedQuery === '') {
      return res.status(400).json({
        ok: false,
        error: 'Query cannot be empty - would match all products',
        warnings: [],
      });
    }

    // Block dangerous wildcards
    if (trimmedQuery === '*' || trimmedQuery === '**') {
      return res.status(400).json({
        ok: false,
        error: 'Wildcard-only queries not allowed - would match all products',
        warnings: [],
      });
    }

    // Get shop and decrypt token
    const shop = await prisma.shop.findUnique({
      where: { id: req.shopDomain },
    });

    if (!shop) {
      return res.status(404).json({
        ok: false,
        error: 'Shop not found',
        warnings: [],
      });
    }

    // Decrypt token for GraphQL call
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const [ivHex, encryptedHex] = shop.accessToken.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    const accessToken = decrypted;

    // Test query with first 5 products
    const testQuery = `
      query($query: String!) {
        products(first: 5, query: $query) {
          edges {
            node {
              id
            }
          }
        }
      }
    `;

    const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-01';
    const graphqlUrl = `https://${shop.id}/admin/api/${apiVersion}/graphql.json`;

    const graphqlResponse = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: testQuery,
        variables: { query: trimmedQuery },
      }),
    });

    const result = await graphqlResponse.json();

    // Check for GraphQL errors
    if (result.errors && result.errors.length > 0) {
      const errorMsg = result.errors[0].message;
      return res.json({
        ok: false,
        error: `Invalid query syntax: ${errorMsg}`,
        warnings: [],
      });
    }

    const sampleCount = result.data?.products?.edges?.length || 0;
    const warnings = [];

    // Warning for very broad queries (heuristic: if we got 5 results immediately)
    if (sampleCount === 5) {
      warnings.push('Query may match many products - consider adding more filters');
    }

    res.json({
      ok: true,
      sampleCount,
      warnings,
    });
  } catch (error) {
    console.error('Query validation error:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to validate query',
      warnings: [],
    });
  }
});

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// Health check (custom route, takes precedence)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Privacy Policy (standalone HTML for App Store compliance)
app.get('/app/privacy', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Privacy Policy - FlowMend</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #333; }
        h1 { color: #008060; }
        h2 { color: #333; margin-top: 30px; }
        ul { margin: 10px 0; }
        li { margin: 8px 0; }
        a { color: #008060; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .header { border-bottom: 2px solid #008060; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>FlowMend Privacy Policy</h1>
        <p><em>Last updated: December 27, 2025</em></p>
      </div>

      <div class="section">
        <h2>Overview</h2>
        <p>Flowmend is committed to protecting your privacy and handling your data responsibly. This policy explains what data we collect, how we use it, and how long we retain it.</p>
      </div>

      <div class="section">
        <h2>What Data We Collect</h2>
        <ul>
          <li><strong>Shop Information:</strong> Your Shopify shop domain, OAuth access token (encrypted), and granted API scopes.</li>
          <li><strong>Job Records:</strong> Query strings, metafield namespace/key/value, job status, and result counts (matched, updated, failed products).</li>
          <li><strong>Job Events:</strong> Audit logs of job processing steps with timestamps and status messages.</li>
          <li><strong>Billing Information:</strong> Subscription status, plan name, and trial dates (managed by Shopify).</li>
        </ul>
      </div>

      <div class="section">
        <h2>What Data We Do NOT Collect</h2>
        <ul>
          <li><strong>No Product Data:</strong> We do not store product titles, descriptions, prices, or inventory levels.</li>
          <li><strong>No Customer PII:</strong> We do not access or store customer names, emails, addresses, or payment information.</li>
          <li><strong>No Order Data:</strong> We do not access order information.</li>
          <li><strong>No Tracking:</strong> We do not use analytics, cookies, or third-party tracking scripts.</li>
        </ul>
      </div>

      <div class="section">
        <h2>How We Use Your Data</h2>
        <ul>
          <li><strong>Execute Bulk Operations:</strong> We use your OAuth token to query products and set metafields via Shopify's Bulk Operations API.</li>
          <li><strong>Show Job History:</strong> We display your job history in the admin UI so you can track bulk operations.</li>
          <li><strong>Error Reporting:</strong> We store the first 50 error lines from failed jobs to help you debug issues.</li>
          <li><strong>Billing:</strong> We use Shopify's native billing API to manage subscriptions.</li>
        </ul>
      </div>

      <div class="section">
        <h2>Data Retention</h2>
        <ul>
          <li><strong>Active Shops:</strong> Job records are retained indefinitely while your shop is installed.</li>
          <li><strong>Uninstalled Shops:</strong> When you uninstall Flowmend, your shop record is marked as uninstalled. All job data is deleted after 30 days.</li>
          <li><strong>Error Logs:</strong> Error previews are limited to 10KB per job and deleted with the job record.</li>
        </ul>
      </div>

      <div class="section">
        <h2>Data Security</h2>
        <ul>
          <li><strong>Encryption:</strong> OAuth access tokens are encrypted at rest in our database.</li>
          <li><strong>HTTPS Only:</strong> All communication with Flowmend uses TLS encryption.</li>
          <li><strong>Access Control:</strong> Only your shop can access your job data. Shop isolation is enforced at the database level.</li>
          <li><strong>No Third-Party Sharing:</strong> We do not share your data with third parties.</li>
        </ul>
      </div>

      <div class="section">
        <h2>Your Rights</h2>
        <ul>
          <li><strong>Access Your Data:</strong> View all job records in the admin UI at any time.</li>
          <li><strong>Delete Your Data:</strong> Uninstall Flowmend to trigger automatic deletion after 30 days.</li>
          <li><strong>Export Your Data:</strong> Contact support for a data export (JSONL format).</li>
        </ul>
      </div>

      <div class="section">
        <h2>Contact & Support</h2>
        <p>If you have questions about this privacy policy or data handling practices, please contact us:</p>
        <ul>
          <li>Email: <a href="mailto:support@flowmend.app">support@flowmend.app</a></li>
          <li>Support Page: <a href="/app/support">/app/support</a></li>
        </ul>
      </div>

      <div class="section">
        <h2>Updates to This Policy</h2>
        <p>We may update this privacy policy from time to time. We will notify you of material changes via email or in-app notification.</p>
      </div>
    </body>
    </html>
  `);
});

// Support Page (standalone HTML for App Store compliance)
app.get('/app/support', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Support & Help - FlowMend</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #333; }
        h1 { color: #008060; }
        h2 { color: #333; margin-top: 30px; }
        h3 { color: #555; margin-top: 20px; }
        ul { margin: 10px 0; }
        li { margin: 8px 0; }
        a { color: #008060; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .header { border-bottom: 2px solid #008060; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .faq { background: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>FlowMend Support & Help</h1>
        <p><em>Get help with Flowmend</em></p>
      </div>

      <div class="section">
        <h2>Contact Support</h2>
        <ul>
          <li><strong>Email:</strong> <a href="mailto:support@flowmend.app">support@flowmend.app</a></li>
          <li><strong>Response Time:</strong> We typically respond within 24 hours on business days.</li>
        </ul>
      </div>

      <div class="section">
        <h2>Common Questions</h2>

        <div class="faq">
          <h3>How do I use Flowmend with Shopify Flow?</h3>
          <p>Flowmend adds a custom action to Shopify Flow called "Bulk Set Metafield (by query)". Create a new Flow, add a trigger, then search for Flowmend in the actions list.</p>
        </div>

        <div class="faq">
          <h3>What's the difference between dry-run and live mode?</h3>
          <p><strong>Dry-run mode</strong> (default) counts how many products match your query without modifying anything. <strong>Live mode</strong> actually sets the metafield values. Always test with dry-run first!</p>
        </div>

        <div class="faq">
          <h3>What if my job fails?</h3>
          <p>Check the job detail page for an error preview. Common issues include invalid query syntax, network timeouts, or metafield type mismatches. Jobs automatically retry up to 3 times with backoff.</p>
        </div>

        <div class="faq">
          <h3>How many products can I update at once?</h3>
          <p>Flowmend can handle up to 100,000 products per job. The default limit is 10,000. Large jobs may take 30-60 minutes to complete.</p>
        </div>

        <div class="faq">
          <h3>What API scopes does Flowmend require?</h3>
          <p>Flowmend requires <code>read_products</code> and <code>write_products</code> to query products and set metafields via Shopify's Bulk Operations API.</p>
        </div>
      </div>

      <div class="section">
        <h2>Additional Resources</h2>
        <ul>
          <li><a href="/app/privacy">Privacy Policy & Data Handling</a> - How we protect your data</li>
          <li><a href="https://shopify.dev/docs/api/usage/search-syntax" target="_blank" rel="noopener">Shopify Search Syntax Guide</a> - Learn how to write product queries</li>
          <li><a href="https://shopify.dev/docs/apps/custom-data/metafields" target="_blank" rel="noopener">Shopify Metafields Documentation</a> - Understand metafield types and structure</li>
        </ul>
      </div>
    </body>
    </html>
  `);
});

// OAuth initiation
app.get('/auth', (req, res) => {
  const shop = req.query.shop;
  if (!shop) {
    return res.status(400).send('Missing shop parameter');
  }

  const scopes = process.env.SHOPIFY_SCOPES || 'read_products,write_products';
  const redirectUri = `${process.env.SHOPIFY_APP_URL}/auth/callback`;
  const state = crypto.randomBytes(16).toString('hex');

  const authUrl = `https://${shop}/admin/oauth/authorize?` +
    `client_id=${process.env.SHOPIFY_API_KEY}&` +
    `scope=${scopes}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${state}`;

  res.redirect(authUrl);
});

// OAuth callback
app.get('/auth/callback', async (req, res) => {
  const { code, shop, hmac } = req.query;

  if (!code || !shop || !hmac) {
    return res.status(400).send('Missing required parameters');
  }

  // Validate HMAC using raw query string
  // Get raw query string from URL (after the '?')
  const queryString = req.url.split('?')[1];

  console.log(`🔐 HMAC Validation for ${shop}:`);
  console.log(`Raw query string: ${queryString}`);
  console.log(`API Secret set: ${!!process.env.SHOPIFY_API_SECRET}, length: ${process.env.SHOPIFY_API_SECRET?.length}`);

  // Parse parameters manually without URL decoding
  const params = queryString.split('&').map(param => {
    const [key, value] = param.split('=');
    return { key, value };
  });

  // Find and extract HMAC
  const hmacParam = params.find(p => p.key === 'hmac');
  const receivedHmac = hmacParam?.value;

  // Remove HMAC and sort remaining params
  const sortedParams = params
    .filter(p => p.key !== 'hmac')
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(p => `${p.key}=${p.value}`)
    .join('&');

  console.log(`Sorted params: ${sortedParams}`);
  console.log(`Received HMAC: ${receivedHmac}`);

  const calculatedHmac = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(sortedParams)
    .digest('hex');

  console.log(`Calculated HMAC: ${calculatedHmac}`);

  if (calculatedHmac !== receivedHmac) {
    console.error(`❌ HMAC validation failed for ${shop}`);
    console.error(`Expected: ${receivedHmac}`);
    console.error(`Got: ${calculatedHmac}`);
    return res.status(403).send('HMAC validation failed');
  }

  console.log(`✅ HMAC validation passed for ${shop}`);

  try {
    // Exchange code for access token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    const params = {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    };

    console.log(`🔄 Exchanging OAuth code for ${shop}`);
    console.log(`Token URL: ${tokenUrl}`);
    console.log(`Params: client_id=${params.client_id?.substring(0, 8)}..., code=${code?.substring(0, 8)}...`);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
    });

    // Check response status before parsing
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OAuth token exchange failed for ${shop}:`);
      console.error(`Status: ${response.status} ${response.statusText}`);
      console.error(`Response body: ${errorText.substring(0, 500)}`);
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const accessToken = data.access_token;

    // Encrypt token
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(accessToken, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const encryptedToken = iv.toString('hex') + ':' + encrypted;

    // Store in database
    await prisma.shop.upsert({
      where: { id: shop },
      create: {
        id: shop,
        accessToken: encryptedToken,
        scopes: data.scope,
      },
      update: {
        accessToken: encryptedToken,
        scopes: data.scope,
        uninstalledAt: null,
      },
    });

    console.log(`✅ OAuth successful for ${shop}`);
    const adminUrl = `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`;
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html>
<head><title>Redirecting to FlowMend App...</title></head>
<body>
  <div>Installation complete. Redirecting...</div>
  <script>window.top.location.href = ${JSON.stringify(adminUrl)};</script>
  <noscript><a href="${adminUrl.replace(/"/g, '"')}">Open FlowMend in Shopify Admin</a></noscript>
</body>
</html>`);
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('OAuth failed: ' + error.message);
  }
});

// B2: Webhook deduplication constants
const WEBHOOK_ID_TTL_SECONDS = 48 * 60 * 60; // 48 hours
const WEBHOOK_ID_PREFIX = 'webhook:processed:';

// Webhook endpoint (Flow Action)
app.post('/webhooks/flow-action', async (req, res) => {
  const body = req.body;
  // Parse shopifyDomain from multiple sources (header first, then body fields)
  const shopifyDomain =
    req.headers['x-shopify-shop-domain'] ||
    body.shopify_domain ||
    body.shopifyDomain ||
    null;
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const webhookId = req.headers['x-shopify-webhook-id']; // B2: Capture webhook ID
  const bodyString = JSON.stringify(body);

  // Verify HMAC
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(bodyString, 'utf8')
    .digest('base64');

  if (hash !== hmac) {
    console.log(`❌ HMAC verification failed for ${shopifyDomain}`);
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  // Validate shopifyDomain is present
  if (!shopifyDomain) {
    console.log(`Missing shopify_domain in flow-action webhook`);
    return res.status(400).json({ ok: false, error: 'shopify_domain is required' });
  }

  // Lookup shop to get valid relation ID
  const shopRow = await prisma.shop.findUnique({
    where: { id: shopifyDomain },
  });

  if (!shopRow) {
    console.log(`Shop not installed: ${shopifyDomain}`);
    return res.status(401).json({ ok: false, error: 'shop not installed' });
  }

  console.log(`✅ Webhook received from ${shopifyDomain} (webhookId: ${webhookId || 'none'})`);

  try {
    // B2: Check for duplicate webhook by X-Shopify-Webhook-Id
    if (webhookId) {
      const webhookKey = `${WEBHOOK_ID_PREFIX}${webhookId}`;
      const existingJobId = await connection.get(webhookKey);

      if (existingJobId) {
        console.log(`⚠️  Duplicate webhook detected (webhookId: ${webhookId}, jobId: ${existingJobId})`);
        return res.status(200).json({
          ok: true,
          jobId: existingJobId,
          deduped: true,
          reason: 'webhook_id_duplicate',
        });
      }
    }

    // Extract from properties first, with fallback to req.body for backwards compatibility
    const payload = req.body.properties || req.body;
    const {
      query_string,
      namespace,
      key,
      type,
      value,
      dry_run,
      max_items
    } = payload;

    // Defensive query_string extraction with fallbacks
    const rawQuery =
      req.body.properties?.query_string ??
      req.body.properties?.product_query ??
      req.body.properties?.queryString ??
      req.body.query_string ??
      req.body.product_query;

    const query_string_final = String(rawQuery ?? '').trim();

    // Validate required fields
    if (!query_string_final || query_string_final.trim() === '') {
      console.log(`❌ Empty query_string rejected for ${shopifyDomain}`);
      return res.status(400).json({
        ok: false,
        error: 'query_string is required and cannot be empty'
      });
    }

    // Create input hash for idempotency using the validated query_string_final
    const inputString = `${shopifyDomain}|${query_string_final}|${namespace}|${key}|${type}|${value}|${dry_run}|${max_items}`;
    const inputHash = crypto.createHash('sha256').update(inputString).digest('hex');

    // Check for duplicate PENDING or RUNNING jobs
    const existingJob = await prisma.job.findFirst({
      where: {
        inputHash,
        status: { in: ['PENDING', 'RUNNING'] },
      },
    });

    if (existingJob) {
      console.log(`⚠️  Duplicate job detected: ${existingJob.id}`);

      // B2: Mark webhook as processed with existing job
      if (webhookId) {
        await connection.setex(`${WEBHOOK_ID_PREFIX}${webhookId}`, WEBHOOK_ID_TTL_SECONDS, existingJob.id);
      }

      return res.status(200).json({
        ok: true,
        jobId: existingJob.id,
        status: existingJob.status,
        deduped: true,
        reason: 'input_hash_duplicate',
      });
    }

    // Create Job record in database using connect pattern
    const job = await prisma.job.create({
      data: {
        shop: { connect: { id: shopRow.id } },
        queryString: query_string_final,
        namespace,
        key,
        type,
        value,
        dryRun: dry_run ?? true,
        maxItems: max_items ?? 10000,
        inputHash,
      },
    });

    // B2: Mark webhook as processed
    if (webhookId) {
      await connection.setex(`${WEBHOOK_ID_PREFIX}${webhookId}`, WEBHOOK_ID_TTL_SECONDS, job.id);
    }

    // Create job event
    await prisma.jobEvent.create({
      data: {
        jobId: job.id,
        eventType: 'JOB_CREATED',
        message: `Job created via Flow webhook${webhookId ? ` (webhookId: ${webhookId})` : ''}`,
      },
    });

    // Enqueue to BullMQ
    await jobQueue.add('process-job', { jobId: job.id, shopId: shopRow.id }, { jobId: job.id });

    console.log(`✅ Job created and enqueued: ${job.id}`);
    res.status(200).json({
      ok: true,
      jobId: job.id,
      status: 'PENDING',
      deduped: false,
    });
  } catch (error) {
    console.error(`❌ Failed to enqueue job:`, error);
    res.status(500).json({ ok: false, error: 'Failed to enqueue job' });
  }
});

// APP_UNINSTALLED webhook
app.post('/webhooks/app-uninstalled', async (req, res) => {
  const shop = req.headers['x-shopify-shop-domain'];
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const body = JSON.stringify(req.body);

  // Verify HMAC
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  if (hash !== hmac) {
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  try {
    await prisma.shop.update({
      where: { id: shop },
      data: { uninstalledAt: new Date() },
    });
    console.log(`✅ App uninstalled from ${shop}`);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Uninstall webhook error:', error);
    res.status(500).json({ ok: false });
  }
});

// GDPR Compliance Webhooks (Required for App Store)
// https://shopify.dev/docs/apps/build/privacy-law-compliance

// CUSTOMERS_DATA_REQUEST webhook
app.post('/webhooks/customers/data_request', async (req, res) => {
  const shop = req.headers['x-shopify-shop-domain'];
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const body = JSON.stringify(req.body);

  // Verify HMAC
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  if (hash !== hmac) {
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  try {
    const payload = req.body;

    // Log the compliance request
    await prisma.complianceRequest.create({
      data: {
        shopDomain: shop,
        requestType: 'customers/data_request',
        customerId: payload.customer?.id?.toString(),
        ordersUrl: payload.orders_url,
        payload: body,
      },
    });

    console.log(`✅ GDPR data request logged for ${shop}, customer: ${payload.customer?.id}`);

    // FlowMend does not store customer PII - only job records linked to shops
    // No customer data to export
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('GDPR data request error:', error);
    res.status(500).json({ ok: false });
  }
});

// CUSTOMERS_REDACT webhook
app.post('/webhooks/customers/redact', async (req, res) => {
  const shop = req.headers['x-shopify-shop-domain'];
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const body = JSON.stringify(req.body);

  // Verify HMAC
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  if (hash !== hmac) {
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  try {
    const payload = req.body;

    // Log the compliance request
    await prisma.complianceRequest.create({
      data: {
        shopDomain: shop,
        requestType: 'customers/redact',
        customerId: payload.customer?.id?.toString(),
        ordersUrl: payload.orders_url,
        payload: body,
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });

    console.log(`✅ GDPR customer redact logged for ${shop}, customer: ${payload.customer?.id}`);

    // FlowMend does not store customer PII - no action needed
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('GDPR customer redact error:', error);
    res.status(500).json({ ok: false });
  }
});

// SHOP_REDACT webhook (triggered 48 hours after uninstall)
app.post('/webhooks/shop/redact', async (req, res) => {
  const shop = req.headers['x-shopify-shop-domain'];
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const body = JSON.stringify(req.body);

  // Verify HMAC
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  if (hash !== hmac) {
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  try {
    // Log the compliance request FIRST (before deletion)
    await prisma.complianceRequest.create({
      data: {
        shopDomain: shop,
        requestType: 'shop/redact',
        payload: body,
      },
    });

    // Delete all shop data (cascades to Jobs and JobEvents via Prisma schema)
    await prisma.shop.delete({
      where: { id: shop },
    });

    console.log(`✅ GDPR shop redact completed for ${shop} - all data deleted`);
    res.status(200).json({ ok: true });
  } catch (error) {
    // If shop doesn't exist, that's OK - already deleted
    if (error.code === 'P2025') {
      console.log(`⚠️  GDPR shop redact for ${shop} - shop already deleted`);
      return res.status(200).json({ ok: true });
    }

    console.error('GDPR shop redact error:', error);
    res.status(500).json({ ok: false });
  }
});

// ============================================================================
// SERVE EMBEDDED UI
// ============================================================================

// Serve static UI files
app.use('/assets', express.static(path.join(__dirname, 'public', 'ui', 'assets')));
app.get(/^\/app$/, (req, res) => {
  if (req.path === '/app') {
    const qs = req.originalUrl.split('?')[1] || '';
    return res.redirect(302, qs ? `/app/?${qs}` : '/app/');
  }
});
app.use('/app', express.static(path.join(__dirname, 'public/ui'), { redirect: false }));

// SPA fallback - serve index.html for all /app/* routes (client-side routing)
app.get('/app/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/ui/index.html'));
});

// Note: Remix integration disabled due to ES module import assertion incompatibility
// with @shopify/shopify-app-remix in Node 22. Privacy and support pages are served
// as standalone HTML above for App Store compliance.

app.listen(PORT, () => {
  console.log(`\n🚀 FlowMend server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   OAuth: http://localhost:${PORT}/auth?shop=<shop>`);
  console.log(`   App UI: http://localhost:${PORT}/app/jobs`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

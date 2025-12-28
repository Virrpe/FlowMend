#!/usr/bin/env node
/**
 * Production Express server for FlowMend
 * Handles OAuth + webhooks without Remix ESM issues
 */

import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Create BullMQ queue
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const jobQueue = new Queue('flowmend-jobs', { connection });

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body style="font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px;">
        <h1 style="color: #008060;">FlowMend</h1>
        <p>Safe bulk metafield operations at scale for Shopify Flow</p>
        <p><a href="/health">Health Check</a></p>
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
  const { code, shop } = req.query;

  if (!code || !shop) {
    return res.status(400).send('Missing required parameters');
  }

  try {
    // Exchange code for access token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });

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
    res.send(`
      <html>
        <body style="font-family: system-ui; max-width: 600px; margin: 100px auto; padding: 20px;">
          <h1 style="color: #008060;">✅ Installation Complete!</h1>
          <p>FlowMend has been successfully installed to <strong>${shop}</strong></p>
          <p>You can close this window and return to your admin.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('OAuth failed: ' + error.message);
  }
});

// Webhook endpoint (Flow Action)
app.post('/webhooks/flow-action', async (req, res) => {
  const shop = req.headers['x-shopify-shop-domain'];
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const body = JSON.stringify(req.body);

  // Verify HMAC
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  if (hash !== hmac) {
    console.log(`❌ HMAC verification failed for ${shop}`);
    return res.status(401).json({ error: 'Invalid HMAC signature' });
  }

  console.log(`✅ Webhook received from ${shop}`);

  try {
    const { query_string, namespace, key, type, value, dry_run, max_items } = req.body;

    // Create input hash for idempotency
    const inputString = `${shop}|${query_string}|${namespace}|${key}|${type}|${value}|${dry_run}|${max_items}`;
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
      return res.status(200).json({
        ok: true,
        jobId: existingJob.id,
        status: existingJob.status,
        deduped: true,
      });
    }

    // Create Job record in database
    const job = await prisma.job.create({
      data: {
        shopId: shop,
        queryString: query_string,
        namespace,
        key,
        type,
        value,
        dryRun: dry_run ?? true,
        maxItems: max_items ?? 10000,
        inputHash,
      },
    });

    // Create job event
    await prisma.jobEvent.create({
      data: {
        jobId: job.id,
        eventType: 'JOB_CREATED',
        message: 'Job created via Flow webhook',
      },
    });

    // Enqueue to BullMQ
    await jobQueue.add('process-job', { jobId: job.id, shopId: shop }, { jobId: job.id });

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

app.listen(PORT, () => {
  console.log(`\n🚀 FlowMend server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

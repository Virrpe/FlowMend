# Viktor's Railway Deployment Checklist

**Status:** ✅ READY TO DEPLOY

---

## What Was Fixed

🚨 **CRITICAL BLOCKER RESOLVED:**
- The Express server was missing privacy and support pages (required for App Store)
- **Fixed:** Added standalone HTML routes at `/app/privacy` and `/app/support`
- **Verified:** Both return 200 OK with comprehensive content

---

## Quick Start: Deploy to Railway in 10 Minutes

### Step 1: Generate Encryption Key

```bash
openssl rand -hex 32
```

Copy the output. You'll need this for both services.

---

### Step 2: Create Railway Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select **`Virrpe/FlowMend`**
4. Add **PostgreSQL** (click "+ New" → "Add PostgreSQL")
5. Add **Redis** (click "+ New" → "Add Redis")

---

### Step 3: Configure Web Service

**Name:** `flowmend-web`

**Environment Variables:**
```bash
NODE_ENV=production
SHOPIFY_API_KEY=<from Shopify Partner Dashboard>
SHOPIFY_API_SECRET=<from Shopify Partner Dashboard>
SHOPIFY_APP_URL=https://<your-railway-domain>
SHOPIFY_SCOPES=read_products,write_products
ENCRYPTION_KEY=<from Step 1>
```

**Build Command:** `npm run build`
**Start Command:** `npm run start`

---

### Step 4: Configure Worker Service

1. Click **"+ New"** → **"Empty Service"**
2. Name: `flowmend-worker`
3. Connect to **same repo**: `Virrpe/FlowMend`

**Environment Variables:** (same as web service above)

**Build Command:** `npm run worker:build`
**Start Command:** `npm run worker:start`

⚠️ **CRITICAL:** `ENCRYPTION_KEY` must be identical in both services!

---

### Step 5: Run Database Migration

Use Railway CLI:
```bash
railway login
railway link
railway run npm run db:push
```

Or run once via Railway dashboard (Settings → One-time command).

---

### Step 6: Get Your Railway URL

1. Click on `flowmend-web` service
2. Go to **Settings** → **Networking**
3. Copy the public domain (e.g., `flowmend-web-production-xxx.up.railway.app`)

---

### Step 7: Update Shopify Partner Dashboard

1. Go to https://partners.shopify.com → Your App → **Configuration**

2. **App URL:**
   ```
   https://<your-railway-domain>/
   ```

3. **Allowed redirection URL(s):**
   ```
   https://<your-railway-domain>/auth/callback
   ```

4. **Flow Action Endpoint:**
   ```
   https://<your-railway-domain>/webhooks/flow-action
   ```

5. **App Uninstalled Webhook:**
   ```
   https://<your-railway-domain>/webhooks/app-uninstalled
   ```

6. Click **Save**

---

### Step 8: Install to Dev Store

Visit in browser:
```
https://<your-railway-domain>/auth?shop=flowmend.myshopify.com
```

Complete OAuth consent. You should see "Installation Complete!" page.

---

### Step 9: Validate Production

Run the validation script:
```bash
./scripts/validate-production.sh <your-railway-domain> <SHOPIFY_API_SECRET>
```

All tests should pass. ✅

---

## What to Update Before App Store Submission

1. **Support Email:** Replace `support@flowmend.app` with your real email in:
   - [server.js:139](server.js:139)
   - [server.js:185](server.js:185)

2. **Privacy Policy:** Review and customize if needed ([server.js:46-151](server.js:46-151))

3. **Support Page:** Review FAQ section ([server.js:154-230](server.js:154-230))

---

## Known Limitations (Non-Blocking)

❌ **No Embedded Polaris Admin UI** (job list, templates)
- **Why:** `@shopify/shopify-app-remix` has Node 22 ES module incompatibility
- **Impact:** Merchants can't view job history in Shopify admin
- **Workaround:** Jobs still process correctly; data viewable via Prisma Studio
- **Not Required:** Privacy/support pages are sufficient for App Store approval

✅ **This does NOT block submission.** All required pages are present and functional.

---

## App Store Pre-Submission Checklist

Before clicking "Submit for Review":

- [ ] Railway deployment complete (both services running)
- [ ] Shopify Partner Dashboard URLs updated
- [ ] OAuth flow tested (install to dev store)
- [ ] Test Flow action (trigger webhook, verify job processes)
- [ ] Update support email to real address
- [ ] Run `./scripts/validate-production.sh` (all tests pass)
- [ ] Take screenshots for App Store listing
- [ ] Write app description
- [ ] Set pricing plan (suggest 30-day free trial)

---

## Troubleshooting

**Problem:** Web service won't start
- **Check:** All environment variables set correctly
- **Check:** PostgreSQL and Redis provisioned
- **Fix:** Review Railway deployment logs

**Problem:** Worker service won't start
- **Check:** `ENCRYPTION_KEY` matches web service exactly
- **Check:** `REDIS_URL` and `DATABASE_URL` injected automatically

**Problem:** OAuth fails
- **Check:** `SHOPIFY_APP_URL` in Railway matches Partner Dashboard
- **Check:** Allowed redirect URL includes `/auth/callback`
- **Check:** `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` correct

**Problem:** Webhooks return 401
- **Check:** `SHOPIFY_API_SECRET` matches Partner Dashboard
- **Check:** HMAC header present in webhook request

---

## Support

For detailed documentation, see:
- **Full Report:** [docs/review/PRODUCTION_READINESS_REPORT.md](docs/review/PRODUCTION_READINESS_REPORT.md)
- **Validation Script:** [scripts/validate-production.sh](scripts/validate-production.sh)

**Verdict:** ✅ READY FOR SHOPIFY APP STORE SUBMISSION

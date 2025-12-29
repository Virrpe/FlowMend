# Railway Deployment Click-Sheet

**DO NOT SKIP STEPS. Follow this exact sequence.**

---

## Prerequisites

1. **GitHub repo:** `Virrpe/FlowMend` (must be accessible)
2. **Railway account:** https://railway.app (with billing enabled)
3. **Encryption key generated:**
   ```bash
   openssl rand -hex 32
   ```
   Save this value. You'll need it for BOTH services.

---

## Part 1: Create Railway Project

### Step 1.1: New Project from GitHub

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose repository: **`Virrpe/FlowMend`**
5. Railway creates initial service (this will be your web service)

---

### Step 1.2: Add PostgreSQL Database

1. In project dashboard, click **"+ New"**
2. Select **"Database"**
3. Click **"Add PostgreSQL"**
4. Railway provisions database automatically
5. **DO NOT configure anything** - `DATABASE_URL` is auto-injected into all services

---

### Step 1.3: Add Redis

1. Click **"+ New"**
2. Select **"Database"**
3. Click **"Add Redis"**
4. Railway provisions Redis automatically
5. **DO NOT configure anything** - `REDIS_URL` is auto-injected into all services

---

## Part 2: Configure Web Service

### Step 2.1: Service Settings

1. Click on the initial service Railway created
2. Click **"Settings"** tab
3. Set **Service Name:** `flowmend-web`

---

### Step 2.2: Build & Start Commands

Still in Settings:

**Build Command:**
```
npm run build
```

**Start Command:**
```
npm run start
```

Click **"Save"** (if there's a save button, otherwise changes auto-save)

---

### Step 2.3: Environment Variables

1. Click **"Variables"** tab
2. Click **"+ New Variable"**
3. Add the following variables **one by one**:

| Variable Name | Value | Notes |
|---------------|-------|-------|
| `NODE_ENV` | `production` | Exact value |
| `SHOPIFY_API_KEY` | `<from Partner Dashboard>` | Client ID from Shopify |
| `SHOPIFY_API_SECRET` | `<from Partner Dashboard>` | Client secret from Shopify |
| `SHOPIFY_APP_URL` | `https://<will-fill-later>` | Placeholder, update in Step 2.5 |
| `SHOPIFY_SCOPES` | `read_products,write_products` | Exact value |
| `ENCRYPTION_KEY` | `<from openssl command>` | 64-character hex string |

**DO NOT add `DATABASE_URL` or `REDIS_URL` - Railway injects these automatically.**

---

### Step 2.4: Get Public Domain

1. Still in web service, click **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"** (if not already generated)
4. Copy the domain (e.g., `flowmend-web-production-xxx.up.railway.app`)

---

### Step 2.5: Update SHOPIFY_APP_URL

1. Go back to **"Variables"** tab
2. Find `SHOPIFY_APP_URL` variable
3. Click to edit
4. Set value to: `https://<your-railway-domain>` (the domain from Step 2.4)
5. Save

---

### Step 2.6: Run Database Migration

Railway doesn't auto-run migrations. You must trigger it manually:

**Option A: Railway CLI** (recommended)
```bash
# Install Railway CLI if not installed
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migration
railway run npm run db:migrate:deploy
```

**Option B: One-time Service Command**
1. In Railway dashboard, click on `flowmend-web` service
2. Click **"Settings"** → **"Deploy"**
3. Add a **"Custom Start Command"** temporarily: `npm run db:migrate:deploy && npm run start`
4. Wait for deployment to complete
5. Change back to `npm run start` after first successful deploy

---

## Part 3: Create Worker Service

### Step 3.1: Add Second Service

1. In project dashboard, click **"+ New"**
2. Select **"Empty Service"**
3. Connect to **same GitHub repo**: `Virrpe/FlowMend`
4. Set **Service Name:** `flowmend-worker`

---

### Step 3.2: Build & Start Commands

In worker service Settings:

**Build Command:**
```
npm run worker:build
```

**Start Command:**
```
npm run worker:start
```

---

### Step 3.3: Environment Variables

1. Click **"Variables"** tab on worker service
2. Add **IDENTICAL variables** as web service:

| Variable Name | Value | Notes |
|---------------|-------|-------|
| `NODE_ENV` | `production` | Must match web service |
| `SHOPIFY_API_KEY` | `<same as web>` | Must match web service |
| `SHOPIFY_API_SECRET` | `<same as web>` | Must match web service |
| `SHOPIFY_APP_URL` | `<same as web>` | Must match web service |
| `SHOPIFY_SCOPES` | `read_products,write_products` | Must match web service |
| `ENCRYPTION_KEY` | `<same as web>` | **CRITICAL: MUST MATCH WEB SERVICE EXACTLY** |

**DO NOT add `DATABASE_URL` or `REDIS_URL` - Railway injects these automatically.**

⚠️ **CRITICAL:** `ENCRYPTION_KEY` must be **byte-for-byte identical** in both services. Mismatch will break token decryption.

---

## Part 4: Verify Deployment

### Step 4.1: Check Web Service

1. Click on `flowmend-web` service
2. Click **"Deployments"** tab
3. Wait for status: **"Active"** (green checkmark)
4. If failed, click deployment → **"View Logs"** to debug

---

### Step 4.2: Check Worker Service

1. Click on `flowmend-worker` service
2. Click **"Deployments"** tab
3. Wait for status: **"Active"** (green checkmark)
4. If failed, click deployment → **"View Logs"** to debug

---

### Step 4.3: Test Endpoints

Open browser or use curl:

**Health Check:**
```
https://<your-railway-domain>/health
```
Expected: `{"status":"ok","timestamp":"..."}`

**Privacy Page:**
```
https://<your-railway-domain>/app/privacy
```
Expected: HTML page with "FlowMend Privacy Policy" heading

**Support Page:**
```
https://<your-railway-domain>/app/support
```
Expected: HTML page with "Support & Help" heading

---

## Part 5: Configure Shopify Partner Dashboard

### Step 5.1: Update App URLs

1. Go to https://partners.shopify.com
2. Navigate to **Apps** → Your app → **Configuration**

**App URL:**
```
https://<your-railway-domain>/
```
⚠️ Include trailing slash `/`

**Allowed redirection URL(s):**
```
https://<your-railway-domain>/auth/callback
```

---

### Step 5.2: Configure Webhooks

Under **Configuration** → **Webhooks**:

**App Uninstalled:**
```
URL: https://<your-railway-domain>/webhooks/app-uninstalled
Version: 2024-10 (or latest stable)
```

---

### Step 5.3: Configure Flow Action Extension

Under **Configuration** → **Extensions**:

**Action Endpoint URL:**
```
https://<your-railway-domain>/webhooks/flow-action
```

Click **"Save"** at top right.

---

## Part 6: Test OAuth Install

### Step 6.1: Install to Dev Store

Visit in browser:
```
https://<your-railway-domain>/auth?shop=flowmend.myshopify.com
```

Replace `flowmend.myshopify.com` with your actual dev store domain.

Expected flow:
1. Redirects to Shopify OAuth consent screen
2. Shows app name, scopes, permissions
3. Click **"Install"**
4. Redirects back to your app
5. Shows "Installation Complete!" page

---

### Step 6.2: Verify in Database

Use Railway CLI:
```bash
railway run -- npx prisma studio
```

Or use Railway dashboard:
1. Click PostgreSQL service
2. Click **"Data"** tab (if available)

Query:
```sql
SELECT id, scopes, "uninstalledAt" FROM "Shop";
```

Expected: Row with your shop domain, `uninstalledAt` = null

---

## Part 7: Run Production Validation

From your local machine:

```bash
./scripts/validate-production.sh <your-railway-domain> <SHOPIFY_API_SECRET>
```

Example:
```bash
./scripts/validate-production.sh flowmend-web-production-xxx.up.railway.app abc123...
```

All tests should pass ✅

---

## Troubleshooting

### Web service won't start

**Check logs:**
1. Click `flowmend-web` → **"Deployments"** → Latest deployment → **"View Logs"**

**Common issues:**
- Missing `SHOPIFY_API_KEY` or `SHOPIFY_API_SECRET`
- `ENCRYPTION_KEY` not set or wrong length (must be 64 hex chars)
- Database migration not run (see Step 2.6)

---

### Worker service won't start

**Check logs:**
1. Click `flowmend-worker` → **"Deployments"** → Latest deployment → **"View Logs"**

**Common issues:**
- `ENCRYPTION_KEY` doesn't match web service
- Worker build failed (check `npm run worker:build` command)
- Redis not connected (verify `REDIS_URL` is injected)

---

### OAuth fails with "redirect_uri mismatch"

1. Go to Shopify Partner Dashboard → **Configuration**
2. Verify **Allowed redirection URL(s)** includes:
   ```
   https://<your-railway-domain>/auth/callback
   ```
3. Ensure `SHOPIFY_APP_URL` env var matches Railway domain exactly

---

### Webhooks return 401 Unauthorized

1. Verify `SHOPIFY_API_SECRET` is correct in both services
2. Check webhook logs in Railway for HMAC verification errors
3. Ensure webhook is sending `X-Shopify-Hmac-Sha256` header

---

### Database connection errors

1. Verify PostgreSQL service is **"Active"** in Railway
2. Check that `DATABASE_URL` is NOT manually set (should be auto-injected)
3. Verify database migration ran successfully (Step 2.6)

---

## Environment Variable Checklist

Before marking deployment complete, verify:

**Web Service:**
- [ ] `NODE_ENV=production`
- [ ] `SHOPIFY_API_KEY` (set)
- [ ] `SHOPIFY_API_SECRET` (set)
- [ ] `SHOPIFY_APP_URL` (Railway domain)
- [ ] `SHOPIFY_SCOPES=read_products,write_products`
- [ ] `ENCRYPTION_KEY` (64 hex chars)
- [ ] `DATABASE_URL` (auto-injected, don't set manually)
- [ ] `REDIS_URL` (auto-injected, don't set manually)

**Worker Service:**
- [ ] All variables identical to web service
- [ ] `ENCRYPTION_KEY` matches web service **exactly**

---

## Next Steps After Deployment

1. Test Flow action (trigger webhook from Shopify Flow)
2. Verify job processing (check worker logs)
3. Update support email in code from `support@flowmend.app` to real email
4. Take screenshots for App Store listing
5. Submit app for review

---

**Deployment Complete! 🚀**

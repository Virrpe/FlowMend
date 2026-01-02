# Railway Environment Variables Checklist

This document lists all required environment variables for deploying FlowMend on Railway.

## Prerequisites

You need **TWO Railway services**:
1. **flowmend-web** - Web server (Express + Remix)
2. **flowmend-worker** - Background job processor (BullMQ)

Both services share the same PostgreSQL database and Redis instance.

---

## Service 1: flowmend-web

### Database & Cache
- `DATABASE_URL` - **Auto-provisioned by Railway PostgreSQL plugin**
- `REDIS_URL` - **Auto-provisioned by Railway Redis plugin** (format: `redis://default:password@host:port`)

### Encryption
- `ENCRYPTION_KEY` - 64-character hex string for encrypting OAuth tokens
  - Generate with: `openssl rand -hex 32`
  - **CRITICAL**: Use the same value in both web and worker services

### Shopify App Credentials
- `SHOPIFY_API_KEY` - Your app's API key from Shopify Partners dashboard
- `VITE_SHOPIFY_API_KEY`: Shopify Partner Dashboard > Apps > [your app] > App setup > API key (same value as `SHOPIFY_API_KEY`, required for embedded UI Vite build)
- `SHOPIFY_API_SECRET` - Your app's API secret from Shopify Partners dashboard
- `SHOPIFY_SCOPES` - OAuth scopes (set to: `read_products,write_products`)
- `SHOPIFY_APP_URL` - Your Railway web service URL (e.g., `https://flowmend-web-production.up.railway.app`)
- `SHOPIFY_API_VERSION` - Shopify API version (recommended: `2024-10`)

### Runtime Configuration
- `NODE_ENV` - Set to: `production`
- `PORT` - **Auto-set by Railway** (usually `3000`)
- `LOG_LEVEL` - Set to: `info` (or `debug` for troubleshooting)

### Build Commands
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **Install Command**: `npm install`

---

## Service 2: flowmend-worker

### Database & Cache
- `DATABASE_URL` - **Same as web service** (link to PostgreSQL plugin)
- `REDIS_URL` - **Same as web service** (link to Redis plugin)

### Encryption
- `ENCRYPTION_KEY` - **MUST match the web service value exactly**

### Shopify App Credentials (needed for API calls)
- `SHOPIFY_API_SECRET` - **Same as web service**
- `SHOPIFY_API_VERSION` - **Same as web service** (e.g., `2024-10`)

### Runtime Configuration
- `NODE_ENV` - Set to: `production`
- `LOG_LEVEL` - Set to: `info`

### Build Commands
- **Build Command**: `npm run worker:build`
- **Start Command**: `npm run worker:start`
- **Install Command**: `npm install`

---

## Railway Plugins Required

1. **PostgreSQL** - Provision once, link to both services
2. **Redis** - Provision once, link to both services

---

## Deployment Checklist

### Before First Deploy
- [ ] Create `flowmend-web` service on Railway
- [ ] Create `flowmend-worker` service on Railway
- [ ] Add PostgreSQL plugin and link to **both** services
- [ ] Add Redis plugin and link to **both** services
- [ ] Generate `ENCRYPTION_KEY` with `openssl rand -hex 32`

### Configure flowmend-web Service
- [ ] Set all variables listed in "Service 1" section above
- [ ] Set `SHOPIFY_APP_URL` to Railway-provided domain (e.g., `https://flowmend-web-production-xyz.up.railway.app`)
- [ ] Set build command: `npm run build`
- [ ] Set start command: `npm run start`

### Configure flowmend-worker Service
- [ ] Set all variables listed in "Service 2" section above
- [ ] **CRITICAL**: Ensure `ENCRYPTION_KEY` matches web service exactly
- [ ] Set build command: `npm run worker:build`
- [ ] Set start command: `npm run worker:start`

### After First Deploy
- [ ] Run database migrations on web service: `npx prisma migrate deploy`
- [ ] Verify web service health: `curl https://YOUR_DOMAIN/health`
- [ ] Check worker logs for "Job worker started" message
- [ ] Test OAuth flow: `https://YOUR_DOMAIN/auth?shop=YOUR_SHOP.myshopify.com`

### Update Shopify Partners Dashboard
- [ ] Set App URL to Railway web service domain
- [ ] Set Redirect URL to `https://YOUR_DOMAIN/auth/callback`
- [ ] Configure all webhook URLs (see SHOPIFY_PARTNERS_CONFIG.md)

---

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly in both services
- Check Railway PostgreSQL plugin is linked to both services
- Ensure migrations ran successfully: `npx prisma migrate deploy`

### Redis Connection Issues
- Verify `REDIS_URL` is set correctly in both services
- Check Railway Redis plugin is linked to both services
- Format should be: `redis://default:PASSWORD@HOST:PORT`

### Worker Not Processing Jobs
- Check worker service logs for errors
- Verify `REDIS_URL` matches between web and worker
- Ensure worker service is running (not crashed)

### OAuth Token Decryption Errors
- **CRITICAL**: Ensure `ENCRYPTION_KEY` is identical in both services
- Length must be exactly 64 hex characters (32 bytes)
- Do not change this value after shops are installed (tokens become unreadable)

---

## Security Notes

1. **Never commit .env files** - All secrets should be set via Railway dashboard
2. **Rotate SHOPIFY_API_SECRET** - If compromised, regenerate in Shopify Partners dashboard
3. **ENCRYPTION_KEY rotation** - Requires re-encrypting all existing shop tokens (not trivial)
4. **Database backups** - Enable Railway automatic backups for PostgreSQL

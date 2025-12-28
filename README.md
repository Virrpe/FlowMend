# Flowmend

**Safe bulk metafield operations at scale for Shopify Flow**

Flowmend is a Shopify app that enables merchants to execute bulk metafield backfills on thousands of products via a Flow-native action, with dry-run mode, guardrails, and full audit logs.

---

## 📋 Product Overview

**Core Value:** Shopify Flow caps "Get data" and "For each" actions at 100 items. Flowmend unlocks bulk operations at scale (10k–100k+ products) using Shopify's Bulk Operations API behind the scenes.

**Key Features:**
- **Flow Action:** "Bulk Set Metafield (by query)" — accepts a search query string, not a list
- **Dry-Run Mode:** Test queries without mutating data (default: ON)
- **Job Management UI:** Track job status, view timelines, download error logs
- **Idempotent:** Duplicate triggers with identical params do not create duplicate jobs
- **Audit Trail:** Full event log for every job

**MVP Scope:**
- Product metafields only
- 4 metafield types: `single_line_text_field`, `boolean`, `number_integer`, `json`
- Shopify Billing integrated (7-day free trial, $29.99/month)
- App Store ready (webhooks, privacy policy, GDPR compliance)
- No tags, variants, customers (deferred to v1.1+)

**Documentation:**
- [PRD.md](./PRD.md) — Product requirements
- [docs/launch/](./docs/launch/) — App Store listing kit
  - [APP_STORE_COPY.md](./docs/launch/APP_STORE_COPY.md) — App Store listing copy
  - [SCREENSHOT_SHOTLIST.md](./docs/launch/SCREENSHOT_SHOTLIST.md) — Screenshot requirements
  - [ONBOARDING_SCRIPT.md](./docs/launch/ONBOARDING_SCRIPT.md) — 2-minute merchant onboarding
- [scripts/verify-checklist.md](./scripts/verify-checklist.md) — Pre-launch verification checklist

---

## 🏗️ Architecture

**Stack:**
- **Runtime:** Node.js 20+
- **Framework:** Remix 2.x (Shopify App Template)
- **Database:** Prisma + SQLite (dev) / PostgreSQL (prod)
- **Job Queue:** BullMQ + Redis
- **API:** Shopify Admin GraphQL 2024-10

**Key Modules:**
- `server/jobs/` — Job creator, enqueuer, worker
- `server/shopify/` — Bulk query/mutation runners, JSONL builder
- `server/db/` — Prisma client & schema
- `app/routes/` — Remix routes (admin UI + webhooks)
- `app/billing/` — Subscription management, billing enforcement
- `docs/launch/` — App Store submission materials
- `scripts/` — Verification and deployment scripts

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** ([Download](https://nodejs.org/))
- **npm or pnpm**
- **Redis 7.0+** (Docker or local install)
- **Shopify Partner Account** ([Sign up](https://partners.shopify.com/))
- **Development Store** (created via Partners dashboard)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

**Required Variables:**

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `SHOPIFY_API_KEY` | App API key | Partners Dashboard → Apps → [Your App] → Client credentials |
| `SHOPIFY_API_SECRET` | App API secret | Partners Dashboard → Apps → [Your App] → Client credentials |
| `SHOPIFY_APP_URL` | Public app URL | Use ngrok or Cloudflare Tunnel for local dev |
| `DATABASE_URL` | PostgreSQL connection string | For local dev: `file:./dev.db` (SQLite) |
| `REDIS_URL` | Redis connection string | For local dev: `redis://localhost:6379` |
| `ENCRYPTION_KEY` | 32-byte hex key for token encryption | Generate: `openssl rand -hex 32` |

**Example `.env` for Local Dev:**

```env
SHOPIFY_API_KEY=abc123...
SHOPIFY_API_SECRET=xyz789...
SHOPIFY_SCOPES=read_products,write_products
SHOPIFY_APP_URL=https://your-ngrok-url.ngrok.io
SHOPIFY_API_VERSION=2024-10

DATABASE_URL=file:./dev.db
REDIS_URL=redis://localhost:6379

ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

### 3. Start Redis (Docker)

If you don't have Redis installed locally, use Docker:

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

Verify Redis is running:

```bash
redis-cli ping
# Should output: PONG
```

### 4. Initialize Database

Run Prisma migrations to create tables:

```bash
npm run db:push
```

Generate Prisma client:

```bash
npm run db:generate
```

### 5. Start Development Servers

You need to run **3 processes** concurrently:

#### Terminal 1: Remix App (Admin UI + Webhooks)

```bash
npm run dev
```

This starts the Remix development server on `http://localhost:3000`.

#### Terminal 2: BullMQ Worker (Job Processor)

```bash
npm run worker:dev
```

This starts the job worker that processes jobs from the Redis queue.

#### Terminal 3: Shopify CLI (ngrok Tunnel)

```bash
npx shopify app dev
```

This starts an ngrok tunnel and opens your app in a development store.

**Note:** The first time you run `shopify app dev`, you'll be prompted to:
1. Select a Shopify Partner organization
2. Create or select an app
3. Choose a development store

---

## 🧪 Testing the App

### Manual Testing (No Shopify Flow Required)

You can test the Flow action endpoint directly with `curl`:

```bash
# 1. Compute HMAC signature (use a test secret)
export SHOPIFY_API_SECRET="your_secret_here"
export BODY='{"query_string":"status:active","namespace":"custom","key":"test","type":"single_line_text_field","value":"Test Value","dry_run":true,"max_items":100}'

# 2. Compute HMAC-SHA256 signature
export HMAC=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SHOPIFY_API_SECRET" -binary | base64)

# 3. Send POST request
curl -X POST http://localhost:3000/webhooks/flow-action \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -H "X-Shopify-Shop-Domain: your-dev-store.myshopify.com" \
  -d "$BODY"

# Expected response (202 Accepted):
# {"job_id":"550e8400-e29b-41d4-a716-446655440000","status":"PENDING","message":"Job enqueued successfully"}
```

### Testing with Shopify Flow

1. In your development store, go to **Settings → Apps and sales channels → Flow**
2. Create a new workflow
3. Add a trigger (e.g., "Scheduled" for daily runs)
4. Add an action → Search for "Flowmend"
5. Select **"Bulk Set Metafield (by query)"**
6. Fill in the action fields:
   - **Query:** `tag:test`
   - **Namespace:** `custom`
   - **Key:** `test_metafield`
   - **Type:** `single_line_text_field`
   - **Value:** `Test Value`
   - **Dry run:** `true` (recommended for first test)
   - **Max items:** `10`
7. Save and run the workflow manually
8. Check the Flowmend admin UI at `/app/jobs` to see the job status

---

## 📂 Project Structure

```
flowmend/
├── app/                          # Remix app (admin UI)
│   ├── routes/
│   │   ├── app.jobs._index.tsx           # Jobs list
│   │   ├── app.jobs.$id.tsx              # Job detail
│   │   ├── app.templates._index.tsx      # Flow templates
│   │   ├── app.guide._index.tsx          # Getting started guide
│   │   ├── app.billing._index.tsx        # Billing/subscription page
│   │   ├── app.billing.callback.tsx      # Billing redirect handler
│   │   ├── app.support._index.tsx        # Support & FAQ
│   │   ├── app.privacy._index.tsx        # Privacy policy
│   │   ├── app.scopes._index.tsx         # Scopes justification
│   │   ├── webhooks.flow-action.tsx      # Flow action endpoint
│   │   └── webhooks.app-uninstalled.tsx  # APP_UNINSTALLED webhook
│   ├── billing/
│   │   ├── config.server.ts              # Billing configuration
│   │   ├── subscription.server.ts        # Subscription management
│   │   └── middleware.server.ts          # Billing enforcement
│   └── components/                       # React components
│
├── server/                       # Business logic
│   ├── jobs/
│   │   ├── creator.ts               # Job creation + idempotency
│   │   ├── enqueuer.ts              # BullMQ producer
│   │   └── worker.ts                # BullMQ consumer
│   ├── shopify/
│   │   ├── client.ts                # GraphQL client
│   │   ├── bulk-query.ts            # Bulk query executor
│   │   ├── bulk-mutation.ts         # Bulk mutation executor
│   │   └── jsonl-builder.ts         # JSONL generator
│   ├── db/
│   │   ├── schema.prisma            # Prisma schema
│   │   └── client.ts                # Prisma client singleton
│   ├── utils/
│   │   ├── hmac.ts                  # HMAC validation
│   │   ├── idempotency.ts           # Input hash generator
│   │   └── logger.ts                # Structured logging
│   └── types/
│       └── index.ts                 # TypeScript types
│
├── docs/
│   └── launch/                   # App Store submission
│       ├── APP_STORE_COPY.md        # Listing copy & keywords
│       ├── SCREENSHOT_SHOTLIST.md   # Screenshot requirements
│       └── ONBOARDING_SCRIPT.md     # 2-min merchant flow
│
├── scripts/
│   ├── verify-checklist.md       # Pre-launch checklist
│   └── verify.sh                 # Automated verification script
│
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Migration files
│
├── .env.example                  # Environment variables template
├── package.json
├── tsconfig.json
├── shopify.app.toml              # Shopify CLI config
└── README.md
```

---

## 🔧 Common Tasks

### Pre-Launch Verification

Before deploying or submitting to the App Store, run the verification script:

```bash
# Make script executable (first time only)
chmod +x scripts/verify.sh

# Run verification
./scripts/verify.sh
```

This checks:

- ✅ Linting and type checking
- ✅ Tests pass
- ✅ Prisma schema is valid
- ✅ Environment variables are set
- ✅ Encryption key is correct length
- ✅ Shopify scopes are configured
- ✅ Database connection works

See [scripts/verify-checklist.md](./scripts/verify-checklist.md) for the full manual checklist.

### Database Management

```bash
# Push schema changes to database (local dev)
npm run db:push

# Create a new migration (production)
npm run db:migrate

# Open Prisma Studio (GUI for viewing data)
npm run db:studio
```

### Viewing Jobs in Database

```bash
# Open Prisma Studio
npm run db:studio

# Then navigate to:
# - Shops: View installed shops
# - Jobs: View all jobs
# - JobEvents: View audit logs
```

### Monitoring BullMQ Queue

Use the BullMQ CLI or a GUI like [Bull Board](https://github.com/felixmosh/bull-board):

```bash
# Install Bull Board (optional)
npm install @bull-board/express

# Access at http://localhost:3000/admin/queues (TODO: implement route)
```

### Logs

All logs are output to stdout using Pino:

```bash
# View logs in development (pretty-printed)
npm run dev

# View logs in production (JSON format)
npm start
```

---

## 🧑‍💻 Development Workflow

### 1. Create a New Feature

1. Read [PRD.md](./PRD.md) and [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Check [ROADMAP.md](./ROADMAP.md) to see if it's in scope
3. Create a new branch: `git checkout -b feature/my-feature`
4. Implement the feature
5. Write tests (see "Testing" below)
6. Submit a PR

### 2. Testing

**Unit Tests:**

```bash
npm test
```

**Test Coverage:**

```bash
npm run test:coverage
```

**Manual Testing Checklist:**

- [ ] Dry-run job completes and shows matched_count
- [ ] Live job successfully sets metafield on products
- [ ] Duplicate job triggers return 409 Conflict
- [ ] Invalid HMAC signature returns 401 Unauthorized
- [ ] Job with invalid query fails with clear error message
- [ ] Jobs list UI loads and displays jobs correctly
- [ ] Job detail UI shows timeline and error preview

### 3. Debugging

**Enable Debug Logs:**

```env
LOG_LEVEL=debug
```

**Inspect Shopify API Requests:**

Check Prisma query logs:

```env
# In .env
DATABASE_URL=file:./dev.db?connection_limit=1&socket_timeout=10&log_queries=true
```

**Check Redis Queue:**

```bash
redis-cli
> KEYS flowmend:*
> LRANGE flowmend:jobs:wait 0 -1
```

---

## 🚢 Deployment

### Option 1: Railway (Recommended)

1. Create a Railway account: [railway.app](https://railway.app)
2. Install Railway CLI: `npm install -g @railway/cli`
3. Login: `railway login`
4. Create a new project: `railway init`
5. Add PostgreSQL: `railway add postgresql`
6. Add Redis: `railway add redis`
7. Set environment variables in Railway dashboard
8. Deploy: `railway up`

**Environment Variables (Railway):**

Set these in the Railway dashboard:

```env
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SHOPIFY_APP_URL=https://your-app.railway.app
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
ENCRYPTION_KEY=...
NODE_ENV=production
```

### Option 2: Render

1. Create a Render account: [render.com](https://render.com)
2. Create a PostgreSQL database
3. Create a Redis instance
4. Create a new Web Service (Node.js)
5. Connect to GitHub repo
6. Set environment variables
7. Deploy

### Option 3: Fly.io

1. Install Fly CLI: `brew install flyctl`
2. Login: `fly auth login`
3. Launch app: `fly launch`
4. Create PostgreSQL: `fly postgres create`
5. Attach Redis: `fly redis create`
6. Set secrets: `fly secrets set SHOPIFY_API_KEY=...`
7. Deploy: `fly deploy`

---

## 📊 Monitoring (Production)

### Health Checks

Create a `/health` endpoint to monitor app status:

```typescript
// app/routes/health.tsx
export async function loader() {
  // Check Redis connection
  // Check database connection
  // Return 200 OK if healthy
}
```

### Metrics to Track

- **Job Success Rate:** `jobs_completed / (jobs_completed + jobs_failed)`
- **Queue Depth:** Number of pending jobs per shop
- **API Error Rate:** 4xx/5xx responses from Shopify API
- **Avg Job Duration:** P50, P95, P99 latency

### Alerting (Future)

- Job failure rate >5% in 1 hour → Email/Slack alert
- Queue depth >100 for any shop → Email/Slack alert
- Shopify API error rate >10% in 10 minutes → Email/Slack alert

---

## 🛠️ Troubleshooting

### Issue: "HMAC validation failed"

**Cause:** Incorrect SHOPIFY_API_SECRET or request body was modified.

**Fix:**
1. Verify `SHOPIFY_API_SECRET` matches Partners Dashboard
2. Ensure request body is raw string (not parsed JSON) when computing HMAC
3. Check for trailing newlines or whitespace in body

### Issue: "Bulk operation timed out"

**Cause:** Shopify bulk operation took >30 minutes (query) or >2 hours (mutation).

**Fix:**
1. Reduce `max_items` to process fewer products
2. Narrow the search query to match fewer products
3. Check Shopify API status page for outages

### Issue: "Rate limited (429)"

**Cause:** Too many API requests to Shopify.

**Fix:**
1. Reduce job concurrency in BullMQ worker
2. Increase poll interval for bulk operation status checks
3. Implement exponential backoff in GraphQL client

### Issue: "Worker not processing jobs"

**Cause:** Redis connection issue or worker process not running.

**Fix:**
1. Check Redis is running: `redis-cli ping`
2. Check worker logs: `npm run worker:dev`
3. Verify `REDIS_URL` in `.env` is correct

---

## 📖 API Reference

### Flow Action Endpoint

**POST** `/webhooks/flow-action`

**Headers:**
- `Content-Type: application/json`
- `X-Shopify-Hmac-Sha256: <base64_signature>`
- `X-Shopify-Shop-Domain: <shop_domain>`

**Request Body:**
```json
{
  "query_string": "status:active tag:winter",
  "namespace": "custom",
  "key": "seasonal_badge",
  "type": "single_line_text_field",
  "value": "Winter Collection",
  "dry_run": true,
  "max_items": 5000
}
```

**Response (202 Accepted):**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "message": "Job enqueued successfully"
}
```

**Error Responses:**
- `400 Bad Request` — Missing required fields
- `401 Unauthorized` — Invalid HMAC signature
- `409 Conflict` — Duplicate job already exists
- `500 Internal Server Error` — Server failure

---

## 🤝 Contributing

Contributions are welcome! Please read [ARCHITECTURE.md](./ARCHITECTURE.md) and [PSEUDOCODE.md](./PSEUDOCODE.md) before making changes.

**Development Process:**
1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a PR

---

## 📄 License

MIT License (TODO: Add LICENSE file)

---

## 🙋 Support

- **Issues:** [GitHub Issues](https://github.com/your-username/flowmend/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-username/flowmend/discussions)
- **Email:** support@flowmend.app (TODO: Set up)

---

## 📚 Additional Resources

- [Shopify Flow Docs](https://help.shopify.com/en/manual/shopify-flow)
- [Shopify Bulk Operations](https://shopify.dev/docs/api/usage/bulk-operations)
- [Shopify Search Syntax](https://shopify.dev/docs/api/usage/search-syntax)
- [metafieldsSet Mutation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldsSet)
- [Remix Docs](https://remix.run/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [BullMQ Docs](https://docs.bullmq.io)

---

**Built with ❤️ for Shopify merchants who need to scale their metafield operations.**

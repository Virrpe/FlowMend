# FlowMend Testing Guide

Quick reference for testing the FlowMend implementation.

## Prerequisites

Ensure you have:
- ✅ Redis running (Docker container or local)
- ✅ Database migrated (`npm run db:migrate`)
- ✅ Dependencies installed (`npm install`)
- ✅ Environment variables configured (`.env`)

## Quick Start

### 1. Run All Tests
```bash
npm test
```

This runs all 19 tests:
- 4 HMAC verification tests
- 4 Idempotency tests
- 7 JSONL builder tests
- 4 Worker integration tests

### 2. Run Tests with Coverage
```bash
npm run test:coverage
```

### 3. Run Specific Test File
```bash
npm test -- server/jobs/__tests__/worker.test.ts
```

## Manual Testing (Without Real Shopify Store)

Since you don't have a real Shopify store yet, you can test the worker logic using the test suite:

### Test Dry-Run Job Processing
```typescript
// See: server/jobs/__tests__/worker.test.ts
// This test verifies:
// - Job status transitions (PENDING → RUNNING → COMPLETED)
// - Product query execution
// - Event logging
// - Matched count tracking
```

### Test Live Job Processing
```typescript
// See: server/jobs/__tests__/worker.test.ts
// This test verifies:
// - Bulk mutation execution
// - Updated/failed counts
// - Error handling
// - Bulk operation ID tracking
```

## Manual Testing (With Real Shopify Store)

### Step 1: Set Up Shopify Development Store

1. Create a [Shopify Partner account](https://partners.shopify.com/)
2. Create a development store
3. Create a custom app in your store:
   - Go to Settings → Apps and sales channels → Develop apps
   - Click "Create an app"
   - Configure Admin API scopes: `read_products`, `write_products`
   - Install the app and get the access token

### Step 2: Configure Environment
```bash
# Update .env with real credentials
SHOPIFY_API_KEY=<your-api-key>
SHOPIFY_API_SECRET=<your-api-secret>
TEST_SHOP_ACCESS_TOKEN=<your-access-token>
```

### Step 3: Update Dev Harness
Edit `scripts/dev-harness.ts`:
```typescript
const testJob = {
  shopId: 'your-store.myshopify.com', // ← Change this
  queryString: 'status:active',
  namespace: 'custom',
  key: 'test_badge',
  type: 'single_line_text_field',
  value: 'Dev Test',
  dryRun: true, // ← Start with dry-run
  maxItems: 10,
};
```

### Step 4: Start Worker
```bash
# Terminal 1: Start the worker
npm run worker:dev
```

### Step 5: Enqueue Test Job
```bash
# Terminal 2: Run dev harness
tsx scripts/dev-harness.ts
```

### Step 6: Monitor Execution

**Watch logs in Terminal 1:**
```
Job processing started
Bulk query started
Bulk query completed: 5 products matched
Dry-run completed: 5 products matched
```

**View in Prisma Studio:**
```bash
npx prisma studio
```

Navigate to:
- `Job` table → See job status and results
- `JobEvent` table → See execution timeline

### Step 7: Test Live Run

Once dry-run succeeds:

1. Edit `scripts/dev-harness.ts`:
   ```typescript
   dryRun: false, // ← Change to false
   ```

2. Run again:
   ```bash
   tsx scripts/dev-harness.ts
   ```

3. Verify metafields in Shopify Admin:
   - Go to Products → Select a product
   - Scroll to Metafields section
   - Look for `custom.test_badge` = "Dev Test"

## Testing Specific Components

### Test JSONL Builder
```bash
npm test -- server/shopify/__tests__/jsonl-builder.test.ts
```

**What it tests:**
- JSONL format correctness
- Value parsing (boolean, integer, JSON, text)
- Chunking for large datasets (>95MB)
- Newline termination

### Test HMAC Verification
```bash
npm test -- server/utils/__tests__/hmac.test.ts
```

**What it tests:**
- Valid signature acceptance
- Invalid signature rejection
- Tampered body detection
- Secret key validation

### Test Worker Logic
```bash
npm test -- server/jobs/__tests__/worker.test.ts
```

**What it tests:**
- Dry-run flow
- Live mutation flow
- Zero-match handling
- Error handling and retries

## Debugging Tips

### 1. Check Redis Connection
```bash
docker ps | grep redis
# Should show: flowmend-redis ... Up
```

If not running:
```bash
docker start flowmend-redis
# Or start a new container:
docker run -d -p 6379:6379 --name flowmend-redis redis:7-alpine
```

### 2. Check Database
```bash
sqlite3 prisma/dev.db ".tables"
# Should show: Job  JobEvent  Shop  _prisma_migrations
```

If empty:
```bash
npm run db:migrate
```

### 3. Check TypeScript Compilation
```bash
npm run typecheck
# Should show no errors
```

### 4. View Logs
Worker logs go to stdout. To save them:
```bash
npm run worker:dev 2>&1 | tee worker.log
```

### 5. Clear Redis Queue (if stuck)
```bash
# Connect to Redis
docker exec -it flowmend-redis redis-cli

# List all keys
KEYS *

# Delete queue
DEL bull:flowmend:jobs:*

# Or flush all
FLUSHALL
```

### 6. Reset Database (if needed)
```bash
rm prisma/dev.db
npm run db:migrate
```

## Common Issues

### Issue: Worker not processing jobs
**Check:**
1. Redis is running: `docker ps | grep redis`
2. Worker is running: Should see "Job worker started" in logs
3. Queue name matches: `flowmend:jobs` in both enqueuer and worker

### Issue: Tests failing
**Check:**
1. Run `npm install` to ensure dependencies are up to date
2. Run `npm run db:generate` to regenerate Prisma client
3. Check Redis is running (tests don't use Redis, but worker does)

### Issue: "Job or shop not found" error
**Check:**
1. Shop exists in database: `npx prisma studio` → Check Shop table
2. Job exists in database: Check Job table
3. shopId matches exactly (case-sensitive)

### Issue: Shopify API errors (429, 5xx)
**Solution:**
- Rate limit (429): Worker has automatic retry with exponential backoff
- Server error (5xx): Worker retries up to 5 times
- Check Shopify API status: https://www.shopifystatus.com/

## Test Scenarios

### Scenario 1: Small Batch (Recommended for first test)
```typescript
{
  queryString: 'status:active',
  maxItems: 10,
  dryRun: true
}
```

### Scenario 2: Large Batch
```typescript
{
  queryString: 'status:active',
  maxItems: 1000,
  dryRun: false
}
```

### Scenario 3: Zero Matches
```typescript
{
  queryString: 'title:nonexistent',
  maxItems: 100,
  dryRun: true
}
```

### Scenario 4: Different Metafield Types
```typescript
// Boolean
{
  type: 'boolean',
  value: 'true'
}

// Integer
{
  type: 'number_integer',
  value: '42'
}

// JSON
{
  type: 'json',
  value: '{"featured": true, "priority": 1}'
}
```

## Performance Testing

### Test 1: 100 Products
```bash
# Expected time: ~30 seconds (bulk query ~10s, mutation ~20s)
```

### Test 2: 1,000 Products
```bash
# Expected time: ~2-3 minutes
```

### Test 3: 10,000 Products
```bash
# Expected time: ~10-15 minutes
```

### Test 4: Large Values (JSONL Chunking)
```typescript
{
  value: 'x'.repeat(100000), // 100KB per product
  maxItems: 1000              // Total: ~100MB
}
// Should create multiple chunks
```

## Next Steps After Testing

Once all tests pass and manual testing succeeds:

1. **Deploy to Staging**
   - Set up Railway/Render/Fly.io
   - Configure environment variables
   - Test in production-like environment

2. **Implement Admin UI**
   - Set up Shopify App Bridge authentication
   - Test Jobs List and Job Detail pages

3. **Test Flow Integration**
   - Create Flow in Shopify admin
   - Test webhook endpoint
   - Verify HMAC verification

4. **Security Hardening**
   - Implement access token encryption
   - Add rate limiting
   - Enable CSRF protection

5. **Monitoring**
   - Set up error tracking (Sentry)
   - Add health check endpoint
   - Configure alerts

---

**Questions?** Check:
- [TEST_REPORT.md](TEST_REPORT.md) - Detailed test results
- [README.md](README.md) - General documentation
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design
- [NEXT_STEPS.md](NEXT_STEPS.md) - Implementation roadmap

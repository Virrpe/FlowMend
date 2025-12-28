# Flowmend - Pre-Launch Verification Checklist

Run these checks before submitting to the Shopify App Store or deploying to production.

---

## 1. Code Quality ✅

### Linting
```bash
npm run lint
```
**Expected:** No errors, warnings are acceptable if documented.

### Type Checking
```bash
npm run typecheck
```
**Expected:** No TypeScript errors.

### Tests
```bash
npm test
```
**Expected:** All tests pass. Minimum coverage: 70%.

---

## 2. Database ✅

### Migrations
```bash
# Check migration status
npx prisma migrate status

# Generate Prisma client
npx prisma generate

# Verify schema is valid
npx prisma validate
```

**Expected:**
- All migrations applied
- Prisma client generated successfully
- Schema validates without errors

### Schema Review
- [ ] Shop model includes billing fields (subscriptionId, subscriptionStatus, trialEndsAt)
- [ ] Job model includes all required fields
- [ ] JobEvent model configured correctly
- [ ] Indexes on shopId, status, createdAt, inputHash

---

## 3. Environment Variables ✅

### Required Variables
```bash
# Copy from .env.example
cp .env.example .env

# Verify all required variables are set
```

**Check `.env` contains:**
- [ ] SHOPIFY_API_KEY
- [ ] SHOPIFY_API_SECRET
- [ ] SHOPIFY_SCOPES="read_products,write_products"
- [ ] SHOPIFY_APP_URL
- [ ] SHOPIFY_API_VERSION="2024-10"
- [ ] DATABASE_URL
- [ ] REDIS_URL
- [ ] ENCRYPTION_KEY (32-byte hex)
- [ ] NODE_ENV="production"
- [ ] PORT="3000"
- [ ] LOG_LEVEL="info"

### Security Check
- [ ] SHOPIFY_API_SECRET is secure (not default/example value)
- [ ] ENCRYPTION_KEY is 32 bytes (64 hex chars)
- [ ] DATABASE_URL uses SSL in production (`?sslmode=require`)
- [ ] REDIS_URL uses TLS in production

---

## 4. Local Development Test ✅

### Start Services
```bash
# Terminal 1: Start Redis (if not running)
redis-server

# Terminal 2: Start dev server
npm run dev

# Terminal 3: Start worker
npm run worker:dev
```

### Verify Endpoints
```bash
# Health check
curl http://localhost:3000/

# OAuth flow (open in browser)
open http://localhost:3000/auth
```

**Expected:**
- Dev server starts without errors
- Worker connects to Redis successfully
- OAuth flow redirects to Shopify

---

## 5. Development Store Test ✅

### Setup
1. Create a Shopify Partner account (if needed)
2. Create a development store
3. Install Flowmend on the dev store
4. Add test products (at least 50)
5. Tag some products with "test"

### Test Scenarios

#### Test 1: Dry-Run Job
1. Create a Flow with "Run manually" trigger
2. Add Flowmend action with:
   - query_string: `tag:test`
   - namespace: `custom`
   - key: `test_badge`
   - type: `single_line_text_field`
   - value: `Test`
   - dry_run: `true`
   - max_items: `10000`
3. Run the Flow
4. Check `/app/jobs` - job should complete in <30 seconds
5. Verify matched count is correct

**Expected:**
- Job status: COMPLETED
- Matched count matches tagged products
- No products modified
- Timeline shows QUERY_STARTED → QUERY_COMPLETED → JOB_COMPLETED

#### Test 2: Live Job (Small Scale)
1. Edit the Flow
2. Change dry_run to `false`
3. Change max_items to `10`
4. Run the Flow
5. Check job detail page

**Expected:**
- Job status: COMPLETED
- Updated count: 10 (or fewer if less than 10 tagged)
- Failed count: 0
- Metafield visible in Shopify admin

#### Test 3: Live Job (Larger Scale)
1. Tag 100+ products with "bulk-test"
2. Create a new Flow
3. Set dry_run: `false`, max_items: `100`
4. Run the Flow
5. Monitor job progress

**Expected:**
- Job completes in 1-3 minutes
- Updated count: 100
- Failed count: <5% (network errors acceptable)
- Error preview shows any failures

#### Test 4: Idempotency
1. Run the same Flow twice in a row
2. Check jobs page

**Expected:**
- Second request returns existing job ID
- No duplicate job created
- Response includes `deduped: true`

#### Test 5: Billing (if enabled)
1. Navigate to `/app/billing`
2. Verify trial banner appears (if not dev store)
3. Click "Start Trial"
4. Complete Shopify billing flow
5. Verify subscription activated

**Expected:**
- Subscription status: ACTIVE
- Trial ends date set correctly
- Can access protected routes

#### Test 6: Webhooks
1. Uninstall Flowmend from dev store
2. Check database

**Expected:**
- Shop record marked with `uninstalledAt` timestamp
- APP_UNINSTALLED webhook logged

---

## 6. UI/UX Review ✅

### Pages to Review
- [ ] `/app/jobs` - Jobs list
- [ ] `/app/jobs/:id` - Job detail
- [ ] `/app/templates` - Templates
- [ ] `/app/guide` - Getting started
- [ ] `/app/billing` - Billing page
- [ ] `/app/support` - Support page
- [ ] `/app/privacy` - Privacy policy
- [ ] `/app/scopes` - Scopes justification

### UI Checks
- [ ] All pages use Polaris components consistently
- [ ] No "TODO" or placeholder text
- [ ] Branding uses "Flowmend" (not "Your App" or placeholders)
- [ ] Links work (no 404s)
- [ ] Back buttons navigate correctly
- [ ] Tables and lists display data properly
- [ ] Error states show helpful messages
- [ ] Loading states display (if applicable)

---

## 7. Security Review ✅

### HMAC Verification
```bash
# Test Flow webhook with invalid HMAC
curl -X POST http://localhost:3000/webhooks/flow-action \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-SHA256: invalid" \
  -d '{"query_string":"tag:test","namespace":"custom","key":"test","type":"single_line_text_field","value":"Test"}'
```

**Expected:** 401 Unauthorized

### OAuth Scopes
- [ ] Only requests `read_products,write_products`
- [ ] No unnecessary scopes
- [ ] Scopes documented in `/app/scopes`

### Data Encryption
- [ ] Access tokens encrypted in database
- [ ] ENCRYPTION_KEY is secure and unique
- [ ] No PII stored (product titles, customer data, etc.)

### Rate Limiting
- [ ] Flow webhook handles 10 req/sec
- [ ] Admin routes have CSRF protection (handled by Shopify App Bridge)

---

## 8. Error Handling ✅

### Test Error Scenarios

#### Invalid Query
1. Create Flow with query: `invalid::syntax::`
2. Run Flow

**Expected:**
- Job status: FAILED
- Error preview shows GraphQL error
- Error logged to job_events

#### Invalid Metafield Type
1. Create Flow with type: `boolean`, value: `not-a-boolean`
2. Run Flow

**Expected:**
- Job status: FAILED or COMPLETED with failures
- Error preview shows type mismatch

#### Network Timeout (Hard to Test)
- Verify retry logic in code
- Check BullMQ retry configuration (max 3 retries)

---

## 9. Performance ✅

### Metrics to Check
- [ ] Dry-run job completes in <30 seconds
- [ ] 100-product live job completes in <3 minutes
- [ ] 1,000-product job completes in <10 minutes
- [ ] Jobs page loads in <2 seconds
- [ ] Job detail loads in <1 second

### Database Queries
```bash
# Check for N+1 queries
npm run dev
# Monitor logs for excessive DB queries
```

---

## 10. Documentation ✅

### README
- [ ] Installation instructions
- [ ] Environment setup
- [ ] Development commands
- [ ] Deployment guide

### Privacy Policy
- [ ] Accessible at `/app/privacy`
- [ ] Lists data collected
- [ ] Explains retention (30 days post-uninstall)
- [ ] Contact email provided

### Support
- [ ] Support page at `/app/support`
- [ ] FAQs address common issues
- [ ] Contact email provided

### App Store Listing
- [ ] APP_STORE_COPY.md complete
- [ ] SCREENSHOT_SHOTLIST.md detailed
- [ ] ONBOARDING_SCRIPT.md tested

---

## 11. Shopify App Store Requirements ✅

### Mandatory Requirements
- [x] APP_UNINSTALLED webhook implemented
- [x] Privacy policy accessible
- [x] GDPR compliance (data deletion after uninstall)
- [x] OAuth scopes justified
- [x] No hardcoded shop domains
- [x] HTTPS enforced
- [x] Error handling implemented
- [x] Billing implemented (if monetized)

### Optional But Recommended
- [ ] App embeds (not required for Flowmend MVP)
- [ ] GraphQL webhooks (using REST for MVP)
- [ ] Email notifications (not in MVP scope)

---

## 12. Pre-Submission Checklist ✅

Before submitting to Shopify App Store:

- [ ] All tests pass
- [ ] App tested on dev store end-to-end
- [ ] UI screenshots captured (1600×1200px)
- [ ] App Store copy finalized
- [ ] Privacy policy reviewed by legal (if needed)
- [ ] Support email set up and monitored
- [ ] Billing tested (trial activation, cancellation)
- [ ] No console errors in browser
- [ ] No server errors in logs
- [ ] Database migrations applied
- [ ] Production environment variables set
- [ ] Domain/hosting configured
- [ ] SSL certificate active
- [ ] Monitoring/logging configured (optional)

---

## Quick Verification Script

Run this script to check common issues:

```bash
#!/bin/bash
# scripts/verify.sh

echo "🔍 Running Flowmend verification checks..."

echo "\n✅ Linting..."
npm run lint || exit 1

echo "\n✅ Type checking..."
npm run typecheck || exit 1

echo "\n✅ Running tests..."
npm test || exit 1

echo "\n✅ Validating Prisma schema..."
npx prisma validate || exit 1

echo "\n✅ Checking environment variables..."
if [ ! -f .env ]; then
  echo "❌ .env file not found!"
  exit 1
fi

required_vars=("SHOPIFY_API_KEY" "SHOPIFY_API_SECRET" "DATABASE_URL" "REDIS_URL" "ENCRYPTION_KEY")
for var in "${required_vars[@]}"; do
  if ! grep -q "^$var=" .env; then
    echo "❌ Missing required variable: $var"
    exit 1
  fi
done

echo "\n✅ All checks passed! Ready for launch 🚀"
```

Make it executable:
```bash
chmod +x scripts/verify.sh
```

Run it:
```bash
./scripts/verify.sh
```

---

## Final Sign-Off

- [ ] Developer sign-off: All technical requirements met
- [ ] QA sign-off: All test scenarios passed
- [ ] Product sign-off: UX meets requirements
- [ ] Legal sign-off: Privacy policy approved (if needed)
- [ ] Ready for Shopify App Store submission

**Date:** _______________
**Version:** v1.0 MVP

# Flowmend Changelog

## [1.0.0] - 2025-12-27 - App Store Ready Release

### 🎉 Major Features Added

#### A) Billing & Monetization
- ✅ Implemented Shopify Billing API integration
  - Single paid plan: "Pro" at $29.99/month
  - 7-day free trial (no credit card required)
  - Development store bypass for testing
- ✅ Created billing enforcement middleware
  - Protected routes require active subscription
  - Automatic redirect to billing page
  - Free routes: billing, support, privacy
- ✅ Built billing UI pages
  - `/app/billing` - Subscription management
  - `/app/billing/callback` - Post-approval redirect handler
  - Shows trial status, plan details, cancel subscription

#### B) App Store Compliance
- ✅ Implemented required webhooks
  - `APP_UNINSTALLED` webhook with data deletion
  - Shop marked as uninstalled, data retained for 30 days
- ✅ Created privacy & legal documentation
  - Privacy Policy page (`/app/privacy`)
  - Data handling transparency
  - No PII collection statement
  - GDPR compliance (30-day retention)
- ✅ Added scopes justification
  - Detailed explanation page (`/app/scopes`)
  - Why `read_products` and `write_products` are required
  - What data is NOT accessed
- ✅ Created support infrastructure
  - Support & FAQ page (`/app/support`)
  - Contact email placeholder
  - Common questions answered

#### C) UX & Merchant Experience
- ✅ Finalized Flowmend branding
  - Consistent naming throughout UI
  - Professional copy and messaging
- ✅ Created Getting Started Guide (`/app/guide`)
  - Step-by-step walkthrough
  - Parameter explanations with examples
  - Dry-run best practices
  - Query syntax help
- ✅ Enhanced Templates page
  - 5 copy-paste Flow examples
  - Formatted parameter blocks
  - Next steps guidance
- ✅ Improved Job Detail page
  - Better status banners
  - Duration calculation
  - Bulk operation ID display
  - Secondary actions (guide, templates)

#### D) App Store Listing Materials
- ✅ Created comprehensive launch kit in `/docs/launch/`
  - `APP_STORE_COPY.md` - Complete listing copy
    - App description, features, FAQs
    - SEO keywords
    - Pricing details
  - `SCREENSHOT_SHOTLIST.md` - Screenshot requirements
    - 8 detailed screenshot specifications
    - Visual guidelines and annotations
    - Submission order
  - `ONBOARDING_SCRIPT.md` - 2-minute merchant flow
    - Step-by-step onboarding
    - Time breakdown
    - Success moments

#### E) Developer Tools & Verification
- ✅ Created verification scripts in `/scripts/`
  - `verify-checklist.md` - Comprehensive manual checklist
    - Code quality checks
    - Database verification
    - Security review
    - Performance metrics
    - Pre-submission checklist
  - `verify.sh` - Automated verification script
    - Linting and type checking
    - Test execution
    - Environment validation
    - Prisma schema validation
    - Database connection test

### 📊 Database Changes
- ✅ Updated Shop model with billing fields
  - `subscriptionId` - Shopify AppSubscription GID
  - `subscriptionStatus` - ACTIVE | CANCELLED | DECLINED | EXPIRED | FROZEN | PENDING
  - `planName` - Plan name (e.g., "Pro")
  - `trialEndsAt` - Trial expiration timestamp
  - `billingInterval` - MONTHLY | ANNUAL
  - Added index on `subscriptionStatus`

### 🔧 Technical Improvements
- ✅ Billing middleware for route protection
- ✅ Subscription management utilities
  - Create subscription
  - Get subscription status
  - Activate subscription
  - Cancel subscription
- ✅ Billing configuration
  - Centralized plan settings
  - Dev store detection
  - Protected route definitions
- ✅ Webhook registration in Shopify app config
- ✅ Import fixes for billing modules

### 📝 Documentation Updates
- ✅ Updated README.md
  - Added billing information
  - Added App Store readiness notes
  - Reorganized documentation links
  - Added verification script instructions
  - Updated project structure diagram
- ✅ Created launch documentation
- ✅ Created verification checklist

### 🎨 UI Pages Added
1. `/app/billing` - Billing & subscription management
2. `/app/billing/callback` - Post-approval redirect
3. `/app/guide` - Getting Started guide
4. `/app/support` - Support & FAQ
5. `/app/privacy` - Privacy policy & data handling
6. `/app/scopes` - API scopes justification

### 🔐 Security & Compliance
- ✅ HMAC verification on all Flow webhooks
- ✅ APP_UNINSTALLED webhook implemented
- ✅ Data retention policy (30 days post-uninstall)
- ✅ No PII storage
- ✅ Encrypted access tokens
- ✅ Minimal OAuth scopes (`read_products`, `write_products`)

### ⚙️ Configuration Changes
- ✅ Billing plan configuration in `app/billing/config.server.ts`
- ✅ Protected routes defined
- ✅ Dev store bypass logic
- ✅ Webhook endpoints registered

### 📋 Files Created
**Billing System:**
- `app/billing/config.server.ts`
- `app/billing/subscription.server.ts`
- `app/billing/middleware.server.ts`

**UI Routes:**
- `app/routes/app.billing._index.tsx`
- `app/routes/app.billing.callback.tsx`
- `app/routes/app.guide._index.tsx`
- `app/routes/app.support._index.tsx`
- `app/routes/app.privacy._index.tsx`
- `app/routes/app.scopes._index.tsx`
- `app/routes/webhooks.app-uninstalled.tsx`

**Documentation:**
- `docs/launch/APP_STORE_COPY.md`
- `docs/launch/SCREENSHOT_SHOTLIST.md`
- `docs/launch/ONBOARDING_SCRIPT.md`
- `scripts/verify-checklist.md`
- `scripts/verify.sh`
- `CHANGELOG.md` (this file)

### 📋 Files Modified
- `prisma/schema.prisma` - Added billing fields to Shop model
- `app/shopify.server.ts` - Registered APP_UNINSTALLED webhook
- `app/routes/app.jobs._index.tsx` - Added billing enforcement
- `app/routes/app.jobs.$id.tsx` - Added billing enforcement, improved UI
- `app/routes/app.templates._index.tsx` - Enhanced UI, added billing enforcement
- `app/routes/app.guide._index.tsx` - Added billing enforcement
- `README.md` - Updated documentation

### 🚀 Next Steps for Launch

#### 1. Database Migration (Production)
```bash
npx prisma migrate dev --name add_billing_fields
npx prisma generate
```

#### 2. Environment Variables
Add to production `.env`:
```env
# Billing is enabled by default
# For dev stores, set BYPASS_BILLING=true
```

#### 3. Run Verification
```bash
chmod +x scripts/verify.sh
./scripts/verify.sh
```

#### 4. Manual Testing Checklist
See `scripts/verify-checklist.md` for complete testing guide:
- [ ] Install on dev store
- [ ] Complete billing flow (or verify dev bypass)
- [ ] Create dry-run job
- [ ] Create live job
- [ ] Test all UI pages
- [ ] Verify webhooks
- [ ] Test uninstall

#### 5. App Store Submission
1. Capture screenshots per `docs/launch/SCREENSHOT_SHOTLIST.md`
2. Copy listing text from `docs/launch/APP_STORE_COPY.md`
3. Submit app for review
4. Monitor for approval

### ⚠️ Important Notes

**Before Deploying:**
- [ ] Update support email from `support@flowmend.app` to real email
- [ ] Set up email monitoring
- [ ] Configure production DATABASE_URL with SSL
- [ ] Configure production REDIS_URL with TLS
- [ ] Generate production ENCRYPTION_KEY (32 bytes)
- [ ] Test billing flow on real dev store
- [ ] Verify APP_UNINSTALLED webhook fires

**Placeholders to Replace:**
- Support email: `support@flowmend.app` (appears in support, privacy, scopes pages)
- App Store listing: Review all copy in `docs/launch/APP_STORE_COPY.md`

### 🎯 MVP Scope Maintained
✅ Product metafields only (metafieldsSet)
✅ No tags, no variants, no customers
✅ No email features
✅ Fast Flow responses (async job processing)
✅ Strong idempotency
✅ Minimal OAuth scopes
✅ Billing integrated
✅ App Store compliance

### 📈 Metrics to Track Post-Launch
- Installation rate
- Trial-to-paid conversion
- Jobs created per merchant
- Dry-run adoption rate
- Job success rate
- Support ticket volume
- Cancellation reasons

---

## Version History

### [1.0.0] - 2025-12-27
- Initial App Store ready release
- Full feature set: billing, compliance, UX polish
- Complete documentation and verification tools

### [0.1.0] - Previous
- Initial vertical slice
- Core Flow action functionality
- Job processing and UI

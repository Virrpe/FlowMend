# Shopify Partners Dashboard Configuration Guide

This document provides the **exact values** Viktor must enter in the Shopify Partners dashboard for FlowMend App Store submission.

---

## Prerequisites

- Railway `flowmend-web` service deployed and running
- Railway domain URL (e.g., `https://flowmend-web-production-xyz.up.railway.app`)
- Production database migrations applied
- Both web and worker services healthy

---

## App Setup Section

### App Information

**App name**: FlowMend

**App URL**: `https://YOUR_RAILWAY_DOMAIN`
- Example: `https://flowmend-web-production-xyz.up.railway.app`
- This is the main entry point for the app
- **Must be HTTPS**
- **Must be publicly accessible**

---

## App URLs Section

### Allowed redirection URLs

Add the following URL to the allowlist:

```
https://YOUR_RAILWAY_DOMAIN/auth/callback
```

**Example**: `https://flowmend-web-production-xyz.up.railway.app/auth/callback`

**Notes**:
- This is where Shopify redirects after OAuth consent
- Only ONE redirect URL is needed
- Must match exactly (including trailing path)

---

## App Scopes Section

### Protected customer data access

**Required scopes**:
- `read_products`
- `write_products`

**Why these scopes**:
- `read_products` - Required to query products via Bulk Operations API
- `write_products` - Required to set metafields on products

**No other scopes needed**:
- FlowMend does NOT access customer data, orders, or other resources
- Requesting minimal scopes improves app approval chances

---

## Webhooks Section

### Event subscriptions

Configure the following webhooks:

#### 1. APP_UNINSTALLED
**Event version**: `2024-10` (or latest)
**Webhook URL**: `https://YOUR_RAILWAY_DOMAIN/webhooks/app-uninstalled`
**Format**: JSON

**Purpose**: Marks shop as uninstalled in database

---

#### 2. CUSTOMERS_DATA_REQUEST (GDPR - Required)
**Event version**: `2024-10` (or latest)
**Webhook URL**: `https://YOUR_RAILWAY_DOMAIN/webhooks/customers/data_request`
**Format**: JSON

**Purpose**: GDPR compliance - handles customer data access requests
**Implementation**: Logs request; FlowMend stores no customer PII

---

#### 3. CUSTOMERS_REDACT (GDPR - Required)
**Event version**: `2024-10` (or latest)
**Webhook URL**: `https://YOUR_RAILWAY_DOMAIN/webhooks/customers/redact`
**Format**: JSON

**Purpose**: GDPR compliance - handles customer data deletion requests
**Implementation**: Logs request; FlowMend stores no customer PII to delete

---

#### 4. SHOP_REDACT (GDPR - Required)
**Event version**: `2024-10` (or latest)
**Webhook URL**: `https://YOUR_RAILWAY_DOMAIN/webhooks/shop/redact`
**Format**: JSON

**Purpose**: GDPR compliance - deletes all shop data 48 hours after uninstall
**Implementation**: Deletes Shop record and all related Jobs/JobEvents (cascading)

---

### Webhook Security

**All webhooks use HMAC-SHA256 verification** via `X-Shopify-Hmac-Sha256` header.

**Verification implemented in**: [server.js](../server.js)
- Lines 310-318 (Flow Action webhook)
- Lines 394-402 (APP_UNINSTALLED webhook)
- Lines 426-434 (CUSTOMERS_DATA_REQUEST webhook)
- Lines 467-475 (CUSTOMERS_REDACT webhook)
- Lines 508-516 (SHOP_REDACT webhook)

---

## App Extensions Section

### Shopify Flow Action

**Extension type**: Flow Action
**Configuration**: Handled via `shopify.app.toml` (if using Shopify CLI v3+)

**Action endpoint**: `https://YOUR_RAILWAY_DOMAIN/webhooks/flow-action`

**Action schema** (Fields presented in Flow UI):
- `query_string` (required, string) - Shopify product search query
- `namespace` (required, string) - Metafield namespace
- `key` (required, string) - Metafield key
- `type` (required, string) - Metafield type (e.g., "single_line_text_field")
- `value` (required, string) - Metafield value
- `dry_run` (optional, boolean, default: true) - Preview mode
- `max_items` (optional, integer, default: 10000) - Max products to update

**Action name**: "Bulk Set Metafield (by query)"

**Note**: If not using Shopify CLI extensions, configure this manually in Partners dashboard under "Extensions" tab.

---

## App Listing Section (App Store Submission)

### Privacy & Compliance URLs

**Privacy policy URL**: `https://YOUR_RAILWAY_DOMAIN/app/privacy`
- Example: `https://flowmend-web-production-xyz.up.railway.app/app/privacy`
- **Must be publicly accessible** (no authentication required)
- Implementation: [server.js:33-138](../server.js#L33-L138)

**Support URL**: `https://YOUR_RAILWAY_DOMAIN/app/support`
- Example: `https://flowmend-web-production-xyz.up.railway.app/app/support`
- **Must be publicly accessible** (no authentication required)
- Implementation: [server.js:141-217](../server.js#L141-L217)

**Support email**: `support@flowmend.app`
- Ensure this email is monitored
- Required for App Store approval
- Response time expectation: 24 hours on business days

---

### App Listing Information

**App name**: FlowMend

**Tagline**: "Safe bulk metafield operations at scale via Shopify Flow"

**Description** (suggested):
```
FlowMend brings powerful bulk metafield operations to Shopify Flow. Update thousands
of products with a single Flow action, using Shopify's native search syntax.

Key Features:
• Bulk set metafields on products matching any query
• Dry-run mode to preview changes before applying
• Built on Shopify's Bulk Operations API for safety and scale
• Full audit log of all operations
• Supports all metafield types

Perfect for merchants who need to:
• Tag products for promotions based on inventory levels
• Update product metadata based on Flow triggers
• Automate product organization at scale
• Sync external data to metafields via Flow integrations

No coding required - just add the FlowMend action to any Flow.
```

**App category**: Workflow automation

**Pricing**:
- Free tier: 5 jobs per month (dry-run only)
- Pro tier: $9.99/month (unlimited jobs, live mode enabled)

---

### Screenshots & Assets

**Required assets**:
1. **App icon** (512x512px) - Upload to Partners dashboard
2. **Screenshots** (1600x1000px recommended):
   - Screenshot 1: Flow action configuration UI
   - Screenshot 2: Job history page showing completed jobs
   - Screenshot 3: Job detail page showing matched/updated counts
   - Screenshot 4: Dry-run result preview

**Video demo** (optional but recommended):
- Show creating a Flow with FlowMend action
- Demonstrate dry-run mode
- Show job results and audit log

---

## Testing Before Submission

### Pre-Submission Validation

Run the validation script against your production Railway domain:

```bash
./scripts/validate-production.sh YOUR_RAILWAY_DOMAIN YOUR_SHOPIFY_API_SECRET
```

**Expected results**:
- All basic endpoints: PASS
- All webhook endpoints: PASS
- All GDPR compliance webhooks: PASS
- OAuth flow: Manual test PASS

### Manual OAuth Test

1. Visit: `https://YOUR_RAILWAY_DOMAIN/auth?shop=YOUR_SHOP.myshopify.com`
2. Complete OAuth consent screen
3. Verify "Installation Complete" success page
4. Check database: `SELECT id, scopes FROM "Shop" WHERE id = 'YOUR_SHOP.myshopify.com';`

### Manual Webhook Test

Use Shopify Partners dashboard "Test webhook" feature to send test payloads to:
- `/webhooks/flow-action` - Should create job and return `{"ok":true}`
- `/webhooks/customers/data_request` - Should log request and return `{"ok":true}`
- `/webhooks/customers/redact` - Should log request and return `{"ok":true}`
- `/webhooks/shop/redact` - Should delete shop data and return `{"ok":true}`

---

## Post-Submission Checklist

After Viktor submits the app for review:

- [ ] Monitor support@flowmend.app for Shopify App Review feedback
- [ ] Keep Railway web + worker services running and healthy
- [ ] Monitor Railway logs for any errors during review period
- [ ] Be ready to respond to review feedback within 48 hours
- [ ] Do NOT deploy breaking changes during review period

---

## Common Submission Blockers

### 1. Privacy Policy Not Accessible
**Symptom**: Reviewer reports privacy policy URL is unreachable
**Solution**: Verify `/app/privacy` returns 200 OK without authentication

### 2. GDPR Webhooks Missing
**Symptom**: Reviewer reports missing mandatory webhooks
**Solution**: Verify all three GDPR webhooks are configured in Partners dashboard

### 3. OAuth Redirect Mismatch
**Symptom**: OAuth fails with "redirect_uri mismatch" error
**Solution**: Ensure allowed redirect URL in Partners dashboard exactly matches OAuth callback URL

### 4. App URL Not HTTPS
**Symptom**: Reviewer reports app is not secure
**Solution**: Railway provides HTTPS by default - verify URL starts with `https://`

### 5. Broken Screenshots/Links
**Symptom**: Reviewer reports broken images or links in app listing
**Solution**: Re-upload all screenshots and verify all URLs are accessible

---

## Support Resources

- [Shopify App Store Requirements](https://shopify.dev/docs/apps/launch/app-store-requirements)
- [GDPR Compliance Guide](https://shopify.dev/docs/apps/build/privacy-law-compliance)
- [OAuth Best Practices](https://shopify.dev/docs/apps/auth/oauth)
- [Webhook HMAC Verification](https://shopify.dev/docs/apps/webhooks/configuration/https#verify-a-webhook)

---

## Need Help?

If you encounter issues during submission:
1. Check Railway service logs for errors
2. Run validation script again
3. Review Shopify App Review feedback carefully
4. Update code/config as needed
5. Re-test before resubmitting

**Document version**: 2025-12-28

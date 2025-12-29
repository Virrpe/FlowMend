# Testing FlowMend Embedded UI

Step-by-step guide for testing the embedded Shopify Admin UI.

---

## Prerequisites

1. FlowMend app installed in a development store
2. Server running locally or on Railway
3. UI built (`npm run ui:build`)

---

## Local Testing

### 1. Start Development Environment

```bash
# Terminal 1: Start Redis
docker-compose up -d redis

# Terminal 2: Start server
npm start

# Terminal 3: Start worker
npm run worker:dev

# Terminal 4: Start UI dev server (optional, for hot reload)
cd ui && npm run dev
```

### 2. Build UI for Testing

```bash
# Build production UI
npm run ui:build

# Verify build output
ls -la public/ui/
# Should see: index.html, assets/
```

### 3. Test API Authentication

```bash
# Run auth verification script
bash scripts/verify-api-auth.sh

# Expected output:
# ✅ PASS: /api/me returned 401 (unauthorized)
# ✅ PASS: /api/jobs returned 401 (unauthorized)
# ✅ PASS: /api/templates returned 401 (unauthorized)
# ✅ PASS: /api/me returned 401 for invalid token
```

---

## Embedded App Testing

### 1. Access App in Shopify Admin

```
https://admin.shopify.com/store/<your-store>/apps/<your-app>
```

The app should load in an iframe within Shopify Admin.

### 2. Test Navigation

- [ ] Dashboard page loads
- [ ] Click "Runs" in sidebar → Runs page loads
- [ ] Click "Templates" in sidebar → Templates page loads
- [ ] Click "Settings" in sidebar → Settings page loads
- [ ] Click "Support" in sidebar → Opens /app/support
- [ ] Click "Privacy Policy" in sidebar → Opens /app/privacy

### 3. Test Dashboard Page

- [ ] Stats cards display (Total Jobs, Completed, Failed, Running)
- [ ] Products Processed card displays (Total Matched, Total Updated)
- [ ] Shop Info card displays (Shop Domain, Plan, Installed Since)
- [ ] Recent Jobs list displays (or "No jobs yet" if empty)
- [ ] Clicking a job in Recent Jobs → navigates to Run Detail

### 4. Test Runs Page

**With Jobs:**
- [ ] Job list table displays
- [ ] Table shows: Job ID, Status, Query, Metafield, Mode, Matched, Updated, Created
- [ ] Status badges are color-coded (Completed=green, Running=blue, Failed=red, Pending=gray)
- [ ] Mode badges show "Dry Run" or "Live"
- [ ] Clicking a Job ID → navigates to Run Detail

**Without Jobs:**
- [ ] Empty state displays
- [ ] Message: "No jobs yet"
- [ ] Instructions to use Shopify Flow

### 5. Test Run Detail Page

- [ ] Back button navigates to Runs page
- [ ] Refresh button reloads job data
- [ ] Job ID displayed (first 8 characters)
- [ ] Job Details section shows:
  - Status badge
  - Query String
  - Metafield (namespace.key)
  - Type
  - Value
  - Mode (Dry Run/Live)
  - Max Items
  - Created date
  - Updated date
- [ ] Results section shows:
  - Products Matched (count or "Pending")
  - Products Updated (count or "Pending")
  - Failed (count or "Pending")
- [ ] Error preview shown if job failed
- [ ] Event Timeline displays chronologically
- [ ] Each event shows: Type, Message, Timestamp

### 6. Test Templates Page

- [ ] Template list displays (4 templates)
- [ ] Each template shows:
  - Name
  - Description
  - Query example
  - Metafield namespace.key
  - Type
  - Example value

### 7. Test Settings Page

- [ ] Shop Information section shows:
  - Shop Domain
  - Installed At date
- [ ] Subscription section shows:
  - Plan (Free or plan name)
  - Status
- [ ] Resources section shows links:
  - Privacy Policy (external)
  - Support & Help (external)
  - Shopify Search Syntax Guide (external)

---

## API Testing (DevTools)

### 1. Open Browser DevTools

- Right-click in app → Inspect
- Go to Network tab
- Filter by "Fetch/XHR"

### 2. Verify API Calls

**Dashboard:**
```
GET /api/me
GET /api/jobs
```

**Runs:**
```
GET /api/jobs?limit=100&offset=0
```

**Run Detail:**
```
GET /api/jobs/<job-id>
```

**Templates:**
```
GET /api/templates
```

### 3. Verify Request Headers

Each API request should include:
```
Authorization: Bearer <session-token>
Content-Type: application/json
```

### 4. Verify Response Status

- All API calls should return `200 OK` with valid token
- Should return `401 Unauthorized` if token is missing/invalid

### 5. Verify Response Data

**GET /api/me:**
```json
{
  "id": "your-shop.myshopify.com",
  "installedAt": "2025-12-28T...",
  "subscriptionStatus": null,
  "planName": null
}
```

**GET /api/jobs:**
```json
{
  "jobs": [...],
  "total": 42
}
```

**GET /api/jobs/:id:**
```json
{
  "id": "uuid",
  "shopId": "shop.myshopify.com",
  "status": "COMPLETED",
  "events": [...]
}
```

---

## Error States Testing

### 1. Test Network Errors

- [ ] Disconnect network → Error banner displays
- [ ] Reconnect → Data loads on retry

### 2. Test Invalid Job ID

- [ ] Navigate to `/app/runs/invalid-id`
- [ ] Error banner displays: "Job not found"

### 3. Test Unauthorized Access

- [ ] Clear session token → API returns 401
- [ ] App Bridge re-authenticates

---

## Performance Testing

### 1. Initial Load

- [ ] Dashboard loads in < 2 seconds
- [ ] No console errors
- [ ] No 404s in Network tab

### 2. Navigation

- [ ] Page transitions are instant (client-side routing)
- [ ] No full page reloads

### 3. API Response Times

- [ ] /api/me: < 100ms
- [ ] /api/jobs: < 500ms
- [ ] /api/jobs/:id: < 200ms
- [ ] /api/templates: < 50ms

---

## Accessibility Testing

- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Color contrast sufficient (Polaris defaults)

---

## Mobile Testing

- [ ] Responsive layout (Polaris handles this)
- [ ] Navigation menu collapses on mobile
- [ ] Tables scroll horizontally if needed

---

## Cross-Browser Testing

Test in:
- [ ] Chrome (primary)
- [ ] Firefox
- [ ] Safari
- [ ] Edge

---

## Regression Testing After Changes

When updating the UI or API:

1. Run `npm run ui:build`
2. Run `bash scripts/verify-api-auth.sh`
3. Test all pages in embedded app
4. Check DevTools for errors
5. Verify API calls succeed

---

## Common Issues & Solutions

### Issue: App doesn't load in Shopify Admin
- **Check:** Is server running?
- **Check:** Is UI built? (`ls public/ui/`)
- **Check:** Is SHOPIFY_APP_URL correct in .env?
- **Check:** Is app URL allowlisted in Partners Dashboard?

### Issue: API returns 401
- **Check:** Is session token being sent? (DevTools → Network → Headers)
- **Check:** Is SHOPIFY_API_SECRET correct in .env?
- **Check:** Is shop installed? (Check database)

### Issue: Navigation doesn't work
- **Check:** Is SPA fallback configured? (server.js:731-733)
- **Check:** Are routes defined in App.tsx?
- **Check:** Is basename="/app" set in BrowserRouter?

### Issue: Polaris styles not loading
- **Check:** Is @shopify/polaris CSS imported? (App.tsx:8)
- **Check:** Are assets served correctly? (public/ui/assets/)

---

## Screenshot Checklist

Capture screenshots for documentation:

- [ ] Dashboard (with stats)
- [ ] Runs list (with jobs)
- [ ] Run detail (completed job)
- [ ] Run detail (failed job with errors)
- [ ] Templates page
- [ ] Settings page
- [ ] Empty state (no jobs)
- [ ] Navigation sidebar (expanded)
- [ ] Mobile view

---

## Production Deployment Verification

After deploying to Railway:

1. [ ] Access app in production store
2. [ ] Test all pages load correctly
3. [ ] Verify API calls succeed (check DevTools)
4. [ ] Test job creation via Flow → verify appears in Runs
5. [ ] Test job detail page for new job
6. [ ] Verify no console errors
7. [ ] Verify performance (load times)
8. [ ] Test on mobile device

---

## Sign-Off

- [ ] All navigation works
- [ ] All API calls succeed with valid token
- [ ] All API calls return 401 without token
- [ ] All pages render correctly
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Responsive on mobile
- [ ] Screenshots captured
- [ ] Ready for production

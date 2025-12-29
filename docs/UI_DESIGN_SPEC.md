# FlowMend UI Design Specification

> Version 1.0 | December 2025

---

## 1. Product Promise

**The missing Bulk Update action for Shopify Flow: update thousands of products safely, with an audit trail.**

FlowMend enables merchants and developers to trigger bulk metafield updates from Shopify Flow without hitting Flow's practical item limits. Every operation is tracked with a complete job history, event timeline, and error audit trail—giving teams confidence that bulk updates completed correctly.

---

## 2. UX Principles

### 2.1 Shopify-Native Look
- Use Polaris components exclusively—no custom CSS heroes or branded flourishes
- Match Shopify admin's visual language, spacing, and interaction patterns
- Feel like a natural extension of Shopify, not a third-party bolt-on

### 2.2 Boring-Premium Trust
- Conservative, predictable UI that signals "enterprise-grade reliability"
- No flashy animations or gamification
- Clear typography hierarchy with subdued colors
- Professional empty states that guide without overwhelming

### 2.3 Safety-First Design
- Prevent catastrophic "update everything" mistakes at every level
- Dry-run mode is the default—live mutations require explicit opt-in
- Query validation before execution
- Clear warnings for broad queries or high item counts
- Confirmation dialogs for destructive actions

### 2.4 Evidence-First Operations
- Every run has a clear configuration snapshot
- Complete event timeline from creation to completion
- Error previews with actionable remediation hints
- Job IDs visible for support escalation

---

## 3. Information Architecture

### 3.1 Navigation Structure

```
Left Navigation (App Bridge NavMenu)
├── Dashboard          → /app (default)
├── Runs               → /app/runs
│   └── Run Detail     → /app/runs/:id (deep link)
├── Templates          → /app/templates
├── Settings           → /app/settings
├── ─────────────────
├── Support            → /app/support (external link)
└── Privacy            → /app/privacy (external link)
```

### 3.2 Route Mapping

| Route | Component | Auth Required |
|-------|-----------|---------------|
| `/app` | Dashboard | Yes (session token) |
| `/app/runs` | Runs List | Yes |
| `/app/runs/:id` | Run Detail | Yes |
| `/app/templates` | Templates | Yes |
| `/app/settings` | Settings | Yes |
| `/app/support` | Support Page | No (public HTML) |
| `/app/privacy` | Privacy Policy | No (public HTML) |

---

## 4. Page Specifications

### 4.1 Dashboard

**Purpose:** At-a-glance health of bulk operations with quick actions.

**Hero Section:**
- Headline: "Your bulk actions, verified."
- Subhead: Shop domain displayed

**Stats Cards (Grid - 4 columns):**

| Card | Metric | Calculation |
|------|--------|-------------|
| Jobs (24h) | Count | Jobs created in last 24 hours |
| Completed | Count | Jobs with status=COMPLETED in 24h |
| Failed | Count | Jobs with status=FAILED in 24h |
| Products Affected | Sum | Sum of updatedCount across all jobs |

**Recent Runs Table (last 10):**

| Column | Content |
|--------|---------|
| Status | Badge (success/critical/attention/info) |
| Query | Truncated query string (max 50 chars) |
| Namespace.Key | `{namespace}.{key}` |
| Created | Relative time (e.g., "2 hours ago") |
| Duration | Calculated from events or "—" if running |

**Quick Actions:**
- "Test a Query" button → Opens modal with query validation
- "View All Runs" link → Navigates to /app/runs

**Empty State:**
- Icon: Magnifying glass or checklist
- Title: "No jobs yet"
- Description: "Create a Flow automation to trigger your first bulk update."
- Action: "Learn how to set up Flow" → Links to Templates page

**Error State:**
- Banner (critical): "Failed to load dashboard data"
- Retry button
- Support link

---

### 4.2 Runs (List)

**Purpose:** Paginated, filterable list of all job runs.

**Page Header:**
- Title: "Runs"
- Subtitle: "History of all bulk operations"

**Filters (inline):**

| Filter | Type | Options |
|--------|------|---------|
| Status | Select | All, Completed, Failed, Running, Pending |
| Dry Run | Toggle | All, Dry Run Only, Live Only |
| Search | TextField | Search by namespace or key |

**Table Columns:**

| Column | Width | Content |
|--------|-------|---------|
| Status | 80px | Badge with color |
| Created | 140px | Date/time |
| Query | flex | Truncated query string |
| Namespace.Key | 160px | Combined field |
| Dry Run | 80px | Yes/No badge |
| Matched | 80px | Number or "—" |
| Updated | 80px | Number or "—" |
| Failed | 80px | Number (red if > 0) |
| Duration | 100px | e.g., "45s" or "2m 30s" |

**Pagination:**
- 25 items per page
- "Load more" pattern or traditional pagination

**Row Interaction:**
- Entire row is clickable → Navigates to Run Detail
- Hover state with subtle background change

**Empty State:**
- Icon: Empty inbox
- Title: "No runs yet"
- Description: "Bulk operations triggered from Shopify Flow will appear here."
- Collapsed accordion: "How to get started"
  1. Go to Shopify Admin → Flow
  2. Create a new workflow
  3. Add FlowMend's "Bulk Set Metafield" action
  4. Configure your query and metafield
  5. Activate the workflow

**Error State:**
- Banner (critical): "Failed to load runs"
- Retry button

---

### 4.3 Run Detail

**Purpose:** Complete audit view of a single job run.

**Page Header:**
- Back button → Returns to /app/runs
- Title: Job ID (truncated UUID, e.g., "Run abc123...")
- Status badge (large)
- Created timestamp

**Summary Cards (2-column grid):**

**Configuration Card (read-only):**

| Field | Display |
|-------|---------|
| Query | Full query string in monospace, with copy button |
| Namespace | Text |
| Key | Text |
| Type | Text (e.g., "single_line_text_field") |
| Value | Truncated with expand, copy button |
| Dry Run | Yes/No badge |
| Max Items | Number |

**Results Card:**

| Field | Display |
|-------|---------|
| Matched | Number with "products" label |
| Updated | Number (green if > 0) |
| Failed | Number (red if > 0) |
| Duration | Calculated time |
| Bulk Operation ID | Shopify GID (for support) |

**Error Preview (conditional - only if failedCount > 0):**
- Banner (warning): "Some products failed to update"
- Collapsible section with error lines (max 50)
- "What to try next" suggestions:
  - Check metafield type matches value format
  - Verify products still exist
  - Check API rate limits
  - Contact support with Job ID

**Timeline / Events Card:**
- Vertical timeline with icons
- Event types:
  - `JOB_CREATED` - Job received from Flow
  - `JOB_STARTED` - Worker picked up job
  - `QUERY_STARTED` - Bulk query initiated
  - `QUERY_COMPLETED` - Products matched
  - `MUTATION_STARTED` - Bulk mutation initiated
  - `MUTATION_COMPLETED` - Products updated
  - `JOB_COMPLETED` - Final success
  - `JOB_FAILED` - Final failure with reason

Each event shows:
- Icon (checkmark, spinner, x-mark)
- Event type label
- Message
- Timestamp (relative + absolute on hover)

**Safety Warnings (conditional):**
- If query was empty: Banner (critical) "Empty query matched all products"
- If matchedCount > 10000: Banner (warning) "Large operation: {count} products affected"

---

### 4.4 Templates

**Purpose:** Copy-paste recipes for common bulk operations.

**Page Header:**
- Title: "Templates"
- Subtitle: "Ready-to-use query patterns for Shopify Flow"

**Template List (ResourceList or Card grid):**

Each template displays:
- Name (heading)
- Description (what it does)
- Query string (monospace, copyable)
- Suggested namespace.key
- Recommended settings badge (e.g., "Start with dry-run")

**Built-in Templates:**

| Template | Query | Namespace.Key | Description |
|----------|-------|---------------|-------------|
| Tag Summer Products | `tag:summer` | `custom.season` | Set seasonal metadata |
| Mark Vendor Products | `vendor:Acme` | `custom.needs_review` | Flag products for review |
| Categorize by Type | `product_type:Shoes` | `custom.size_chart` | Add category-specific data |
| Clearance Items | `tag:clearance` | `custom.on_sale` | Mark discounted products |
| New Arrivals | `created_at:>2024-01-01` | `custom.is_new` | Tag recent products |
| Low Stock Alert | `inventory_total:<10` | `custom.restock_priority` | Flag low inventory |
| Featured Products | `tag:featured` | `custom.is_featured` | Highlight featured items |
| Archive Old Products | `status:draft AND updated_at:<2023-01-01` | `custom.archived` | Mark stale drafts |

**Template Card Actions:**
- "Copy Query" button
- "Copy to Flow" instructions link
- "Test Query" button → Opens validation modal

**Test Query Section:**
- TextField for query input
- "Validate" button
- Results display:
  - ✓ Valid query, ~{count} products would match
  - ✗ Invalid syntax: {error message}
  - ⚠ Warning: Query may match many products

**Empty State:** N/A (always shows built-in templates)

**Error State:**
- Banner if API unavailable for test query

---

### 4.5 Settings

**Purpose:** Shop configuration, usage info, and account management.

**Page Header:**
- Title: "Settings"
- Subtitle: "Manage your FlowMend configuration"

**Shop Identity Card:**

| Field | Value |
|-------|-------|
| Shop Domain | `{shop}.myshopify.com` |
| Installed | Date |
| API Scopes | `read_products, write_products` |

**Usage & Limits Card:**
- Current period usage (jobs run, products updated)
- Plan limits display
- Beta notice: "Beta: Unlimited usage during beta period"

**Billing Card (placeholder):**
- Current plan: "Beta (Free)"
- Message: "Billing will be available after app review"
- No action buttons yet

**Data Retention Card:**
- Current policy: "Job history retained for 30 days"
- Note: "Older jobs are automatically deleted to reduce storage"
- Future: Configurable retention slider

**Support Card:**
- Support email: `{SUPPORT_EMAIL}` (env var with fallback to support@flowmend.app)
- Link to /app/support
- Job ID helper: "Include your Job ID when contacting support"

**Danger Zone (collapsed by default):**
- "Request Data Export" button (mailto link)
- "Uninstall App" link → Shopify admin uninstall flow

---

## 5. Embedded App Constraints

### 5.1 App Bridge Integration
- Must use `@shopify/app-bridge-react` for navigation and session tokens
- Session token authentication for all `/api/*` requests
- No cookie-based auth (unreliable in iframe context)

### 5.2 Session Token Flow
```
1. App loads in Shopify admin iframe
2. App Bridge provides session token via getSessionToken()
3. All API requests include: Authorization: Bearer {sessionToken}
4. Server verifies JWT signature using SHOPIFY_API_SECRET
5. Server extracts shop domain from token's 'dest' claim
```

### 5.3 Navigation
- Use App Bridge's NavigationMenu for left nav
- Use react-router-dom for client-side routing
- Preserve query params across navigation

### 5.4 Direct Access
- UI must also work at `/app` direct URL for testing
- Graceful fallback if App Bridge unavailable (dev mode)

---

## 6. Safety & Guardrails

### 6.1 Input Validation (UI)

| Field | Validation | Error Message |
|-------|------------|---------------|
| query_string | Required, non-empty | "Query is required" |
| query_string | Max 1000 chars | "Query too long (max 1000 characters)" |
| namespace | Required, 1-255 chars | "Namespace is required" |
| namespace | Alphanumeric + underscore | "Invalid namespace format" |
| key | Required, 1-255 chars | "Key is required" |
| key | Alphanumeric + underscore | "Invalid key format" |
| max_items | 1 - 100,000 | "Max items must be between 1 and 100,000" |

### 6.2 Input Validation (Backend)

```typescript
// POST /api/query/validate
interface ValidateRequest {
  query_string: string;
}

interface ValidateResponse {
  ok: boolean;
  sampleCount?: number;      // Products matched in sample
  estimatedTotal?: number;   // Estimated total matches
  warnings: string[];        // Non-blocking warnings
  error?: string;            // Blocking error message
}
```

### 6.3 Query Validation Logic
1. Syntax check: Parse query for valid Shopify search syntax
2. Sample query: Run `products(first: 5, query: "...")` to verify
3. Count estimation: Use `productsCount(query: "...")` if available
4. Warning thresholds:
   - > 1,000 products: "This query matches many products"
   - > 10,000 products: "Large operation—consider testing with dry-run first"
   - Empty query: "Empty query will match ALL products" (block)

### 6.4 Dangerous Query Detection
Block or warn for these patterns:
- Empty query string → Block with error
- `*` or `**` wildcards alone → Block with error
- No filter conditions → Warn "Query may match all products"

### 6.5 Rate Limiting
- Max 10 validation requests per minute per shop
- Max 100 job creates per hour per shop
- Return 429 with Retry-After header

---

## 7. Observability

### 7.1 No Secrets in UI
- Never display access tokens
- Never display webhook signatures
- Never log sensitive data to console

### 7.2 Job ID Visibility
- Always show Job ID on Run Detail page
- Include in error messages: "Job ID: {id}"
- Copy button for easy support escalation

### 7.3 Correlation IDs
- Each job event includes correlation ID
- Format: `job:{jobId}:event:{eventId}`
- Logged to server logs for tracing

### 7.4 Client-Side Logging
- Minimal console logging in production
- Error boundary catches React errors
- Report errors to server (optional future enhancement)

---

## 8. Component Library

### 8.1 Required Polaris Components

```
Layout: Page, Layout, Card, Grid
Navigation: NavMenu (App Bridge)
Typography: Text
Forms: TextField, Select, Checkbox, Button
Feedback: Banner, Badge, Spinner, Toast
Data: DataTable, ResourceList, ResourceItem
Overlays: Modal
Utility: Divider, EmptyState
```

### 8.2 Custom Components (minimal)

| Component | Purpose |
|-----------|---------|
| StatusBadge | Standardized job status badge |
| QueryDisplay | Monospace query with copy button |
| EventTimeline | Vertical timeline for job events |
| StatCard | Metric card with label + value |

---

## 9. API Endpoints Summary

### 9.1 Protected Endpoints (require session token)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/me` | Current shop info |
| GET | `/api/jobs` | List jobs (paginated) |
| GET | `/api/jobs/:id` | Job detail with events |
| GET | `/api/templates` | Template list |
| GET | `/api/stats` | Dashboard stats (24h) |
| POST | `/api/query/validate` | Test query syntax |

### 9.2 Public Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| GET | `/app/privacy` | Privacy policy HTML |
| GET | `/app/support` | Support page HTML |

---

## 10. Error Handling

### 10.1 API Error Responses

```typescript
interface APIError {
  error: string;       // Human-readable message
  code?: string;       // Machine-readable code
  details?: object;    // Additional context
}
```

### 10.2 Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid session token |
| `FORBIDDEN` | 403 | Shop doesn't have access |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### 10.3 UI Error Display
- Network errors: Banner with retry
- Validation errors: Inline field errors
- Server errors: Banner with support link
- Never expose stack traces to UI

---

## 11. Accessibility

### 11.1 Requirements
- All interactive elements keyboard accessible
- Proper focus management in modals
- ARIA labels for icon-only buttons
- Color not sole indicator (use badges + text)
- Sufficient color contrast (Polaris handles this)

### 11.2 Screen Reader Support
- Semantic HTML structure
- Live regions for status updates
- Descriptive link text (not "click here")

---

## 12. Performance

### 12.1 Loading States
- Skeleton screens for initial load
- Spinner for action confirmations
- Optimistic updates where safe

### 12.2 Data Fetching
- SWR or React Query for caching (optional)
- Pagination for large lists
- Debounced search inputs

### 12.3 Bundle Size
- Code splitting by route
- Lazy load heavy components
- Polaris tree-shaking

---

## Appendix A: Polaris Version Notes

Using `@shopify/polaris` v12.x:
- `Badge`: Use `tone` prop instead of `status`
- `Banner`: Use `tone` prop instead of `status`
- `Text`: Use `tone` prop for colors

---

## Appendix B: Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SHOPIFY_API_KEY` | Yes | App API key |
| `SHOPIFY_API_SECRET` | Yes | App API secret |
| `SHOPIFY_APP_URL` | Yes | Public app URL |
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `REDIS_URL` | Yes | Redis connection |
| `ENCRYPTION_KEY` | Yes | Token encryption key |
| `SUPPORT_EMAIL` | No | Support email (default: support@flowmend.app) |
| `JOB_RETENTION_DAYS` | No | Days to retain jobs (default: 30) |

---

*End of UI Design Specification*

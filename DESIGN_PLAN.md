# Flowmend UI/UX Design Plan

**Version:** 1.0 MVP
**Last Updated:** 2025-12-27

---

## Table of Contents
1. [Design Principles](#design-principles)
2. [Brand Identity](#brand-identity)
3. [Screen Layouts](#screen-layouts)
4. [Component Library](#component-library)
5. [Copy & Messaging](#copy--messaging)
6. [Trust Signals](#trust-signals)
7. [Accessibility](#accessibility)

---

## Design Principles

### 1. Safety First
- **Default to Dry-Run:** All dangerous actions require explicit opt-in
- **Clear Consequences:** Show exactly what will change before execution
- **Undo-Friendly:** Provide clear error logs so merchants can reverse mistakes manually

### 2. Progressive Disclosure
- **Simple Entry Point:** Start with templates; hide advanced options until needed
- **Contextual Help:** Inline tooltips for technical terms (namespace, metafield type)
- **Graceful Complexity:** Power users can access raw query inputs; beginners use templates

### 3. Trust Through Transparency
- **Real-Time Status:** Show job progress with timeline
- **Honest Error Messages:** No generic "Something went wrong"; show actual Shopify errors
- **Audit Trail:** Full event log for every job

---

## Brand Identity

### Visual Style
- **Aesthetic:** Clean, technical, trustworthy (think Stripe/Linear)
- **Tone:** Professional but approachable (e.g., "Let's backfill some metafields" not "Initiate bulk operation")
- **Colors:**
  - Primary: `#2563EB` (Blue 600) - trust, reliability
  - Success: `#059669` (Green 600) - job completed
  - Warning: `#D97706` (Amber 600) - dry-run reminder
  - Error: `#DC2626` (Red 600) - job failed
  - Neutral: Shopify Polaris grays

### Typography
- **Font:** Shopify Polaris default (Inter)
- **Hierarchy:**
  - H1: 24px, bold
  - H2: 20px, semibold
  - H3: 16px, semibold
  - Body: 14px, regular
  - Code: 13px, monospace (Fira Code)

---

## Screen Layouts

### Screen 1: Jobs List
**Route:** `/app/jobs`
**Purpose:** Dashboard for all bulk jobs

#### Wireframe (ASCII)
```
┌─────────────────────────────────────────────────────────────┐
│  Flowmend                                        [Settings]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Jobs                                                         │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [🎯 View Flow Templates]                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Status    │ Query         │ Metafield      │ Results│   │
│  ├────────────┼───────────────┼────────────────┼────────┤   │
│  │ ✅ DONE    │ status:active │ custom.badge   │ 1520/3 │   │
│  │ ⏳ RUNNING │ tag:winter    │ custom.season  │ -      │   │
│  │ ⚠️ FAILED  │ vendor:Acme   │ custom.vendor  │ 0/152  │   │
│  │ 🔵 PENDING │ type:shoes    │ custom.category│ -      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Showing 4 of 12 jobs                      [← 1 2 3 →]       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Components
1. **Page Header**
   - Title: "Jobs"
   - Action: "Settings" link (future: billing, preferences)

2. **CTA Card** (Top)
   - Icon: 🎯 Target
   - Text: "New to Flowmend? Start with a Flow template"
   - Button: "View Flow Templates" → `/app/templates`
   - Background: Light blue tint

3. **Jobs Table**
   - **Columns:**
     - Status (badge with icon)
     - Query (truncated to 30 chars with tooltip)
     - Metafield (`namespace.key`)
     - Results (`updated/failed` or `-` if pending)
     - Created (relative time, e.g., "2 hours ago")
   - **Row Actions:**
     - Click row → navigate to Job Detail
   - **Empty State:**
     - Illustration: Empty box
     - Text: "No jobs yet. Trigger a Flowmend action from Shopify Flow to get started."
     - Link: "View Flow Templates"

4. **Pagination**
   - 50 jobs per page
   - Simple prev/next buttons + page numbers

---

### Screen 2: Job Detail
**Route:** `/app/jobs/:id`
**Purpose:** Full job audit trail and error debugging

#### Wireframe (ASCII)
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Jobs                                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Job #550e8400                               ✅ COMPLETED    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Job Summary                                          │    │
│  │                                                      │    │
│  │ Query:        status:active tag:winter              │    │
│  │ Metafield:    custom.seasonal_badge                 │    │
│  │ Type:         single_line_text_field                │    │
│  │ Value:        "Winter Collection"                   │    │
│  │ Dry Run:      No                                    │    │
│  │ Max Items:    5000                                  │    │
│  │ Created:      Dec 27, 2025 at 10:30 AM              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Results                                              │    │
│  │                                                      │    │
│  │ Products Matched:    1,523                          │    │
│  │ Successfully Updated: 1,520                         │    │
│  │ Failed:               3                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Timeline                                             │    │
│  │                                                      │    │
│  │ ● JOB_STARTED          10:30:05 AM                  │    │
│  │   Job started processing                            │    │
│  │                                                      │    │
│  │ ● QUERY_COMPLETED      10:31:00 AM                  │    │
│  │   Bulk query completed: 1523 products matched       │    │
│  │                                                      │    │
│  │ ● MUTATION_COMPLETED   10:35:00 AM                  │    │
│  │   Bulk mutation completed: 1520 updated, 3 failed   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ ⚠️ Errors (3)                          [Download]   │    │
│  │                                                      │    │
│  │ {"product_id":"gid://shopify/Product/123",         │    │
│  │  "errors":[{"field":"value","message":"is invalid"}]}│   │
│  │                                                      │    │
│  │ {"product_id":"gid://shopify/Product/456",...}     │    │
│  │ {"product_id":"gid://shopify/Product/789",...}     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Components
1. **Breadcrumb**
   - "← Back to Jobs" link

2. **Page Header**
   - Title: "Job #[short_id]" (first 8 chars of UUID)
   - Status badge (large, prominent)

3. **Job Summary Card**
   - All input parameters in key-value format
   - Read-only, monospace for technical values
   - Copy button for query string

4. **Results Card**
   - Large numbers with labels
   - Success rate: `(updated / matched) × 100%`
   - Color-coded: Green for updated, Red for failed

5. **Timeline Card**
   - Vertical timeline with dots
   - Event type + timestamp + message
   - Expandable metadata (JSON) for advanced debugging

6. **Errors Card** (only if failed_count > 0)
   - Header with count and Download button
   - Preview: First 50 error lines in code block (scrollable, max height 300px)
   - Download button: Fetches full error JSONL (future: generate on-demand)

---

### Screen 3: Flow Templates
**Route:** `/app/templates`
**Purpose:** Educate merchants on how to use Flowmend in Shopify Flow

#### Wireframe (ASCII)
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Jobs                                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Flow Templates                                               │
│                                                               │
│  Copy these examples to use Flowmend in Shopify Flow         │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🏷️ Backfill Product Badge Metafield                 │    │
│  │                                                      │    │
│  │ Use case: Add a badge to featured products for      │    │
│  │ Online Store 2.0 themes.                            │    │
│  │                                                      │    │
│  │ Flow Trigger: Scheduled (daily)                     │    │
│  │ Action: Flowmend > Bulk Set Metafield               │    │
│  │                                                      │    │
│  │ Query:       tag:featured                    [Copy] │    │
│  │ Namespace:   custom                          [Copy] │    │
│  │ Key:         badge                           [Copy] │    │
│  │ Type:        single_line_text_field          [Copy] │    │
│  │ Value:       "Featured"                      [Copy] │    │
│  │ Dry Run:     true (test first!)                     │    │
│  │ Max Items:   10000                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 🔍 Set OS2.0 Filter Metafield                       │    │
│  │ ...                                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 📦 Normalize Vendor into Metafield                  │    │
│  │ ...                                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Components
1. **Page Header**
   - Title: "Flow Templates"
   - Subtitle: "Copy these examples to use Flowmend in Shopify Flow"

2. **Template Cards** (5 total)
   - **Icon + Title:** Emoji + descriptive name
   - **Use Case:** 1-2 sentence explanation
   - **Flow Setup Instructions:**
     - Trigger type (Scheduled, Product created, etc.)
     - Action: "Flowmend > Bulk Set Metafield"
   - **Parameter Table:**
     - Each param with copy button
     - Syntax-highlighted code block for query
   - **Trust Signal:** "💡 Pro Tip: Always run with dry_run=true first!"

---

## Component Library

### 1. Status Badge
**Purpose:** Visual indicator of job status

**Variants:**
```tsx
<Badge tone="success">COMPLETED</Badge>   // Green
<Badge tone="warning">RUNNING</Badge>     // Amber
<Badge tone="critical">FAILED</Badge>     // Red
<Badge tone="info">PENDING</Badge>        // Blue
```

**Usage:**
- Jobs List table
- Job Detail header
- Timeline events

---

### 2. Jobs Table
**Purpose:** Sortable, paginated table for jobs list

**Props:**
```tsx
interface JobsTableProps {
  jobs: Job[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  onRowClick: (jobId: string) => void;
}
```

**Features:**
- Click row to navigate
- Sortable columns (status, created_at)
- Responsive: Stack on mobile

---

### 3. Timeline
**Purpose:** Vertical event timeline with timestamps

**Props:**
```tsx
interface TimelineProps {
  events: JobEvent[];
}
```

**Rendering:**
```tsx
{events.map(event => (
  <TimelineItem
    key={event.id}
    title={event.event_type}
    timestamp={event.created_at}
    message={event.message}
    metadata={event.metadata}  // Expandable JSON
  />
))}
```

---

### 4. Error Preview
**Purpose:** Code block with syntax-highlighted errors

**Props:**
```tsx
interface ErrorPreviewProps {
  errorPreview: string;
  errorCount: number;
  onDownload: () => void;
}
```

**Rendering:**
```tsx
<Card>
  <CardHeader>
    <Text>⚠️ Errors ({errorCount})</Text>
    <Button onClick={onDownload}>Download</Button>
  </CardHeader>
  <CardContent>
    <CodeBlock language="json" maxHeight="300px">
      {errorPreview}
    </CodeBlock>
  </CardContent>
</Card>
```

---

### 5. Template Card
**Purpose:** Copy-paste template for Flow setup

**Props:**
```tsx
interface TemplateCardProps {
  icon: string;
  title: string;
  useCase: string;
  trigger: string;
  params: {
    query: string;
    namespace: string;
    key: string;
    type: string;
    value: string;
  };
}
```

**Features:**
- Individual copy buttons per param
- Syntax highlighting for query
- Collapsible "How to use" section

---

## Copy & Messaging

### Job Status Messages

| Status | Primary Message | Subtext |
|--------|----------------|---------|
| PENDING | "Waiting to start" | "Your job is in the queue" |
| RUNNING | "Processing..." | "This may take a few minutes" |
| COMPLETED (dry-run) | "Dry-run complete" | "X products matched. Ready to run for real?" |
| COMPLETED (live, 100% success) | "Job complete!" | "X products updated successfully" |
| COMPLETED (live, partial) | "Job complete with errors" | "X updated, Y failed. Review errors below." |
| FAILED | "Job failed" | "[Error reason]. Check timeline for details." |

### Empty States

**Jobs List (No Jobs Yet):**
```
┌─────────────────────────────────┐
│         📦                       │
│   No jobs yet                    │
│                                  │
│   Trigger a Flowmend action from │
│   Shopify Flow to get started.   │
│                                  │
│   [View Flow Templates]          │
└─────────────────────────────────┘
```

**Job Detail (No Errors):**
```
✅ All products updated successfully. No errors to display.
```

### Error Messages

**Invalid Query:**
```
❌ Job failed: Invalid search query syntax

Shopify returned: "Unexpected token at position 12"

Need help? Check out Shopify's search syntax guide:
https://shopify.dev/docs/api/usage/search-syntax
```

**Rate Limited:**
```
⏸️ Job paused: Shopify rate limit reached

We'll automatically retry in 30 seconds. No action needed.
```

**Timeout:**
```
⏱️ Job failed: Operation timed out after 2 hours

This usually means the job was too large. Try reducing max_items
or narrowing your query.
```

---

## Trust Signals

### On Every Screen
1. **Dry-Run First Badge**
   - Yellow banner on Jobs List if user has never run a live job
   - "💡 New to Flowmend? All jobs default to dry-run mode. Run a test first!"

2. **Safe by Default**
   - Flow action form shows `dry_run: true` pre-filled
   - Tooltip: "Dry-run mode previews changes without actually updating products"

3. **No PII Stored**
   - Footer text: "Flowmend stores only job metadata (counts, errors). We never store product titles or customer data."

4. **Idempotent Notice**
   - On duplicate job conflict (409): "This job is already running. We prevented a duplicate to keep your data safe."

### On Templates Screen
1. **Step-by-Step Instructions**
   - Each template includes numbered steps
   - Screenshot placeholders (future: actual screenshots)

2. **Common Pitfalls**
   - "⚠️ Don't forget to change dry_run to false after testing!"
   - "⚠️ Check your metafield definition in Shopify Settings > Custom Data"

---

## Accessibility

### WCAG 2.1 AA Compliance
1. **Color Contrast:** All text meets 4.5:1 ratio
2. **Keyboard Navigation:**
   - Tab through all interactive elements
   - Enter to activate buttons/links
   - Escape to close modals
3. **Screen Reader Support:**
   - Semantic HTML (`<table>`, `<nav>`, `<main>`)
   - ARIA labels for icons (e.g., `aria-label="Job completed"`)
   - Live regions for job status updates

### Focus States
- Blue outline (`ring-2 ring-blue-500`) on all focusable elements
- No focus trap in modals (can tab out)

### Responsive Design
- **Mobile:** Stack table rows vertically; hide non-essential columns
- **Tablet:** Truncate long query strings; show tooltip on tap
- **Desktop:** Full table layout

---

## UI Framework

### Shopify Polaris
**Rationale:** Embedded apps should match Shopify admin aesthetic

**Components Used:**
- `Page`, `Card`, `DataTable`, `Badge`, `Button`, `TextField`, `Select`
- `Banner`, `EmptyState`, `SkeletonPage`, `Spinner`

**Customization:**
- Custom Timeline component (Polaris doesn't have one)
- Custom CodeBlock component (syntax highlighting)

---

## Future Enhancements (Post-MVP)

### v1.1: Interactive Job Creation
- **Screen:** `/app/jobs/new`
- **Features:**
  - Query builder UI (dropdown for tag, vendor, type)
  - Metafield autocomplete (fetch from Shopify API)
  - Live query preview (show first 10 matched products)
  - "Save as Template" button

### v1.2: Job Scheduling UI
- **Screen:** `/app/jobs/:id/schedule`
- **Features:**
  - Cron builder (visual picker)
  - Next run preview
  - Pause/resume toggle

### v2.0: Collaboration
- **Feature:** Job approval workflow
- **UI:**
  - "Pending Approval" tab on Jobs List
  - Approve/Reject buttons on Job Detail
  - User avatars (who created, who approved)

---

## Design System Tokens

### Colors (Tailwind Classes)
```css
--color-primary: #2563EB;      /* blue-600 */
--color-success: #059669;      /* green-600 */
--color-warning: #D97706;      /* amber-600 */
--color-error: #DC2626;        /* red-600 */
--color-neutral-50: #F9FAFB;
--color-neutral-100: #F3F4F6;
--color-neutral-900: #111827;
```

### Spacing
```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
```

### Border Radius
```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
```

---

## Appendix: Screen Recording Flow (User Walkthrough)

### Demo Script (for Marketing)
1. **Open Jobs List** → Show empty state
2. **Click "View Flow Templates"** → Browse templates
3. **Copy "Backfill Product Badge" template** → Show copy buttons
4. **Open Shopify Flow** (separate tab) → Create new workflow
5. **Add Flowmend action** → Paste template params
6. **Set dry_run=true** → Run Flow
7. **Return to Flowmend** → Refresh Jobs List → See PENDING job
8. **Wait 30 seconds** → Auto-refresh → Job status changes to RUNNING
9. **Wait 1 minute** → Job status changes to COMPLETED
10. **Click job row** → Show Job Detail with matched_count
11. **Review timeline** → Expand metadata JSON
12. **Change dry_run=false in Flow** → Run again
13. **Return to Flowmend** → See second job RUNNING
14. **Wait for completion** → Show updated_count + failed_count
15. **Expand Errors card** → Preview error JSONL
16. **Click Download** → Download full error file

---

**End of Design Plan**

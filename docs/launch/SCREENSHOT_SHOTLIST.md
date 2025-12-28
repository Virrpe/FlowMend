# Flowmend - App Store Screenshot Shotlist

## Required Screenshots

Shopify App Store requires 3-8 screenshots at **1600×1200px** (4:3 ratio). Use a clean development store with sample data.

---

## Screenshot 1: Jobs List (Primary)
**Purpose:** Show the main dashboard with active jobs

**Setup:**
- Navigate to `/app/jobs`
- Have 5-8 jobs visible with mixed statuses:
  - 2-3 COMPLETED (green badges)
  - 1 RUNNING (yellow badge)
  - 1-2 PENDING (gray badges)
  - 1 FAILED (red badge)
- Include both dry-run and live jobs
- Show varied metafield names (badge, filter_category, is_featured)

**Key Elements:**
- Page title: "Jobs"
- Table columns: Status, Query, Metafield, Results, Created
- "View Templates" button visible
- Clean, professional Polaris UI

**Caption:**
"Track all your bulk metafield operations with detailed status, results, and audit logs"

---

## Screenshot 2: Job Detail - Success
**Purpose:** Show a successful job completion with results

**Setup:**
- Navigate to a COMPLETED job detail page (`/app/jobs/:id`)
- Job should show:
  - Status: COMPLETED (green badge)
  - Query: `tag:featured` or similar readable query
  - Metafield: `custom.badge` (single_line_text_field)
  - Matched: 1,247 products
  - Updated: 1,245 products
  - Failed: 2 products
- Show full timeline with 5-6 events
- Include duration (e.g., "2 minutes 34 seconds")

**Key Elements:**
- Success banner: "Job completed successfully"
- Job Summary card with all parameters visible
- Results card with clear counts
- Timeline showing processing steps

**Caption:**
"View detailed results, timelines, and error logs for every bulk operation"

---

## Screenshot 3: Job Detail - Dry-Run
**Purpose:** Highlight the safety of dry-run mode

**Setup:**
- Navigate to a dry-run job detail page
- Job should show:
  - Status: COMPLETED (green badge)
  - Dry-run badge visible
  - Matched: 3,492 products
  - Updated/Failed: (null - not applicable)
- Success banner: "Dry-run completed - found 3,492 matching products"

**Key Elements:**
- Dry-run badge prominently displayed
- Banner explaining no changes were made
- Matched count clearly visible
- Clean summary card

**Caption:**
"Test your queries safely with dry-run mode - see exactly what will change before going live"

---

## Screenshot 4: Flow Templates
**Purpose:** Show pre-built templates for easy onboarding

**Setup:**
- Navigate to `/app/templates`
- Show 3-4 template cards visible:
  - "🏷️ Backfill Product Badge Metafield"
  - "🔍 Set OS2.0 Filter Metafield"
  - "❄️ Apply Seasonal Flag"
- Each template showing parameters in monospace boxes

**Key Elements:**
- Page title: "Flow Templates"
- Info banner: "Always test with dry_run=true first!"
- Template cards with parameters clearly formatted
- "View Getting Started Guide" button

**Caption:**
"Get started fast with copy-paste templates for common metafield backfill scenarios"

---

## Screenshot 5: Getting Started Guide
**Purpose:** Show comprehensive onboarding documentation

**Setup:**
- Navigate to `/app/guide`
- Show the top section with:
  - Success banner about dry-run testing
  - Step 1: Create a Shopify Flow
  - Step 2: Configure Your Action
  - Parameter details (Query String, Namespace, Key, Type, Value)

**Key Elements:**
- Clear step-by-step instructions
- Warning banners about dry-run safety
- Examples for each parameter
- Professional layout with Polaris cards

**Caption:**
"Built-in guide walks you through creating your first bulk metafield operation step-by-step"

---

## Screenshot 6: Shopify Flow Integration
**Purpose:** Show Flowmend action in Shopify Flow editor

**Setup:**
- Open Shopify Flow in another browser tab
- Create a Flow with:
  - Trigger: "Run manually"
  - Action: "Flowmend: Bulk Set Metafield (by query)"
  - Parameters filled in (use template example)
- Show the Flow editor with Flowmend action expanded

**Key Elements:**
- Shopify Flow UI clearly visible
- Flowmend action card showing all input fields
- Parameters filled with real example values
- Save/Run buttons visible

**Caption:**
"Flowmend integrates natively with Shopify Flow - no complex setup required"

---

## Screenshot 7: Error Handling (Optional)
**Purpose:** Show robust error reporting

**Setup:**
- Navigate to a FAILED job detail page
- Show:
  - Error banner with first error line
  - Error Preview card with monospace error logs
  - Failed count visible
  - Timeline showing where failure occurred

**Key Elements:**
- Clear error messaging
- Monospace error preview
- Failed count prominently displayed
- Professional error handling

**Caption:**
"Comprehensive error logs help you debug issues with detailed JSONL error previews"

---

## Screenshot 8: Billing Page (Optional)
**Purpose:** Show transparent pricing and trial

**Setup:**
- Navigate to `/app/billing`
- Show the subscription CTA card with:
  - Plan name: Pro
  - Price: $29.99/month
  - "7-day free trial" badge
  - Feature list visible
  - "Start 7-Day Free Trial" button

**Key Elements:**
- Clear pricing
- Trial period highlighted
- Feature list
- Professional Polaris UI

**Caption:**
"7-day free trial with no credit card required - cancel anytime"

---

## Screenshot Guidelines

### Image Specs
- **Resolution:** 1600×1200px (4:3 ratio)
- **Format:** PNG or JPG
- **File size:** <5MB each
- **Quality:** High-res, no blurriness

### Visual Guidelines
- Use a clean development store
- Hide real shop domains (use "example-store.myshopify.com")
- Use realistic sample data (product counts, queries, metafield names)
- Consistent Shopify Polaris theme
- No placeholder text ("Lorem ipsum", "TODO", etc.)
- Professional color scheme (Shopify greens, blues, grays)

### Annotations (Optional)
- Add subtle arrows/highlights to key features
- Use Shopify brand colors for annotations
- Keep annotations minimal and clean
- Ensure annotations don't obscure UI

### Testing
- Test all screenshots at 1600×1200px before submission
- Verify text is readable at thumbnail size
- Check that key features are highlighted
- Ensure consistent UI across all screenshots

---

## Screenshot Order for Submission

1. Jobs List (Primary - most important)
2. Job Detail - Success
3. Job Detail - Dry-Run
4. Flow Templates
5. Getting Started Guide
6. Shopify Flow Integration
7. Error Handling (optional)
8. Billing Page (optional)

Submit screenshots in this order to the Shopify App Store.

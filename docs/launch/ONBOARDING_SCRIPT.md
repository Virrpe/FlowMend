# Flowmend - 2-Minute Merchant Onboarding Script

This script outlines the exact steps a merchant follows from app installation to their first successful bulk metafield operation. Total time: **~2 minutes**.

---

## Prerequisites
- Shopify store with Admin access
- At least 10-50 products in the catalog
- Products tagged with "featured" (or use any existing tag)

---

## Step 1: Install Flowmend (30 seconds)

1. Navigate to the Shopify App Store
2. Search for "Flowmend" or visit the app listing directly
3. Click **"Add app"**
4. Review permissions:
   - ✅ Read products
   - ✅ Write products (for metafields only)
5. Click **"Install app"**
6. OAuth redirect → Grant permissions
7. Land on Flowmend jobs page (`/app/jobs`)
   - See empty state: "No jobs yet"
   - See button: "View Flow Templates"

**First Impression:**
Clean, minimal interface. No clutter. Clear next steps.

---

## Step 2: Start Free Trial (Optional - 15 seconds)

**If billing is enabled:**
1. See banner: "Start your 7-day free trial to use Flowmend"
2. Click "Billing" in navigation or banner CTA
3. Review plan:
   - $29.99/month
   - 7-day trial
   - No credit card required (dev stores bypass billing)
4. Click **"Start 7-Day Free Trial"**
5. Redirect to Shopify billing confirmation
6. Click **"Approve"**
7. Return to Flowmend

**If dev store:**
Banner shows: "Development Mode - Billing bypassed"

---

## Step 3: View Templates (20 seconds)

1. Click **"View Templates"** button from jobs page
2. Land on `/app/templates`
3. See 5 pre-built templates
4. Read the info banner: "Always test with dry_run=true first!"
5. Select first template: **"🏷️ Backfill Product Badge Metafield"**
6. Review parameters:
   ```
   query_string: tag:featured
   namespace: custom
   key: badge
   type: single_line_text_field
   value: Featured
   dry_run: true
   max_items: 10000
   ```
7. Keep this tab open (we'll copy these values)

---

## Step 4: Create Shopify Flow (30 seconds)

1. Open new browser tab
2. Navigate to **Settings → Apps and sales channels → Flow**
3. Click **"Create workflow"**
4. Name workflow: **"Flowmend Test - Badge Backfill"**
5. Choose trigger: **"Run manually"** (for testing)
6. Click **"Add action"**
7. Search: **"Flowmend"**
8. Select action: **"Bulk Set Metafield (by query)"**
9. Flow action card opens with input fields

---

## Step 5: Configure Flow Action (30 seconds)

Copy values from the template (or type manually):

1. **query_string:** `tag:featured`
2. **namespace:** `custom`
3. **key:** `badge`
4. **type:** `single_line_text_field`
5. **value:** `Featured`
6. **dry_run:** `true` ✅ (LEAVE ON for first test!)
7. **max_items:** `10000` (default)

**Visual Check:**
All fields filled. Green checkmarks. No validation errors.

---

## Step 6: Run Dry-Run Test (15 seconds)

1. Click **"Save"** on Flow
2. Click **"Run workflow"** (manual trigger)
3. Confirmation: "Workflow has been queued"
4. Switch back to Flowmend tab
5. Refresh `/app/jobs` page
6. See new job appear with:
   - Status: PENDING → RUNNING → COMPLETED (15-30 seconds)
   - Query: `tag:featured`
   - Metafield: `custom.badge`
   - Badge: "Dry-run"

---

## Step 7: Review Dry-Run Results (20 seconds)

1. Click on the job row to open detail page
2. See success banner:
   > "Dry-run completed - found 47 matching products. No changes were made."
3. Review Job Summary:
   - Status: COMPLETED ✅
   - Dry-run: ON ✅
   - Query: `tag:featured`
   - Metafield: `custom.badge`
   - Value: `Featured`
4. Review Results:
   - **Matched:** 47 products
   - Updated: - (not applicable)
   - Failed: - (not applicable)
5. Review Timeline:
   - JOB_CREATED
   - QUERY_STARTED
   - QUERY_COMPLETED - "Matched 47 products"
   - JOB_COMPLETED

**Key Takeaway:**
Merchant now knows exactly how many products will be affected: **47 products**

---

## Step 8: Run Live Job (Optional - 15 seconds)

**If merchant wants to proceed:**

1. Switch back to Shopify Flow tab
2. Edit the workflow
3. Find the Flowmend action
4. Change **dry_run** from `true` to `false`
5. Click **"Save"**
6. Click **"Run workflow"** again
7. Switch to Flowmend tab
8. Refresh jobs page
9. See new job:
   - Status: PENDING → RUNNING → COMPLETED (30-60 seconds for 47 products)
   - No "Dry-run" badge

---

## Step 9: Review Live Results (15 seconds)

1. Click on the live job
2. See success banner:
   > "Job completed successfully - Updated 47 products with metafield custom.badge"
3. Review Results:
   - Matched: 47 products
   - **Updated: 47 products** ✅
   - Failed: 0 products
4. Review Timeline shows mutation steps

**Verification:**
1. Open Shopify Admin → Products
2. Click any product tagged "featured"
3. Scroll to **Metafields**
4. See new metafield: `custom.badge = "Featured"`

**Success! 🎉**

---

## Total Time Breakdown

| Step | Duration | Cumulative |
|------|----------|------------|
| Install app | 30s | 0:30 |
| Start trial (optional) | 15s | 0:45 |
| View templates | 20s | 1:05 |
| Create Flow | 30s | 1:35 |
| Configure action | 30s | 2:05 |
| Run dry-run | 15s | 2:20 |
| Review dry-run | 20s | 2:40 |
| Run live (optional) | 15s | 2:55 |
| Review live | 15s | 3:10 |

**Core onboarding (steps 1-7):** ~2:20 minutes
**Full workflow (steps 1-9):** ~3:10 minutes

---

## Key Success Moments

1. ✅ **First impression** - Clean UI, clear CTAs, no confusion
2. ✅ **Template discovery** - "Oh, I can just copy these values!"
3. ✅ **Dry-run completion** - "It matched 47 products - exactly what I expected"
4. ✅ **Live completion** - "All 47 products updated successfully - this actually works!"
5. ✅ **Metafield verification** - "I can see the metafield in the product admin - perfect!"

---

## Common Questions (Address Proactively)

### "What if I don't have products tagged 'featured'?"
→ Use any tag you have, or use `vendor:YourVendor` or `type:YourProductType`

### "Can I undo a bulk operation?"
→ No automatic undo. Use a second job with `value: ""` (empty string) to clear the metafield if needed.

### "How long do large jobs take?"
→ ~30 seconds for 100 products, ~2 minutes for 1,000 products, ~30 minutes for 10,000 products.

### "What if my job fails?"
→ Check the Error Preview on the job detail page. Common issues: invalid query syntax, network errors, metafield type mismatch.

### "Can I schedule recurring jobs?"
→ Yes! Use a scheduled Flow trigger (daily, weekly) instead of manual trigger.

---

## Post-Onboarding Engagement

After completing the first job, merchants should:

1. **Explore templates** - Try 2-3 more examples
2. **Read the guide** - Understand query syntax and metafield types
3. **Join support** - Bookmark `/app/support` for help
4. **Upgrade workflow** - Convert manual trigger to scheduled/automated

**Goal:** Get merchants to run at least 1 dry-run and 1 live job within the first 7 days (trial period).

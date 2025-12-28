# Shopify Flow Click Sheet

This document provides exact step-by-step instructions to create a Flow workflow that triggers the Flowmend app.

## Prerequisites

- Flowmend app installed on shop
- Shopify Flow app installed (free on Shopify Plus, or trial available)

## Steps

### 1. Open Shopify Flow

1. In Shopify admin, go to **Apps**
2. Click **Flow**
3. Click **Create workflow** button (top right)

### 2. Configure Trigger

1. In the trigger section, click **Select a trigger**
2. Search for: `Product created`
3. Click **Product created** from the list
4. (Trigger is now configured - no additional settings needed)

### 3. Configure Action

1. Click the **+** button below the trigger
2. Click **Action**
3. Search for: `Flowmend`
4. Click **Flowmend** app
5. Click the **Bulk Update Products** action

### 4. Fill Action Parameters

In the action configuration form, enter:

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Query String** | `status:active` | Will match all active products |
| **Namespace** | `custom` | Metafield namespace |
| **Key** | `flowmend_flow` | Metafield key |
| **Type** | `single_line_text_field` | From dropdown |
| **Value** | `flow-test-{{product.id}}` | Use Flow variable for product ID |
| **Dry Run** | `true` (checked) | ✅ Keep checked for testing |
| **Max Items** | `5` | Limit to 5 products for test |

**Screenshot needed:** Action configuration form with all fields filled

### 5. Save and Enable Workflow

1. Click **Save** (top right)
2. Enter workflow name: `Flowmend Test Workflow`
3. Click **Turn on workflow** toggle (top right)
4. Confirm workflow is **ON**

**Screenshot needed:** Workflow overview showing ON status

### 6. Trigger the Workflow

**Option A: Create a test product**
1. Go to **Products** > **Add product**
2. Enter title: `Flow Test Product`
3. Set status: **Active**
4. Click **Save**

**Option B: Duplicate an existing product**
1. Go to **Products**
2. Click on any product
3. Click **Duplicate** button
4. Click **Save**

### 7. Verify Flow Execution

1. Return to **Flow** app
2. Click on **Flowmend Test Workflow**
3. Click **History** tab
4. You should see a workflow run with timestamp matching your product creation
5. Click the run to see details

**Screenshot needed:** Flow history showing successful run

### 8. Verify Flowmend Job Created

Run the verification script:
```bash
npx tsx scripts/verify-latest-job.ts
```

This will show the most recent job in the Flowmend database, confirming the Flow action successfully created a job.

## Troubleshooting

### Workflow doesn't trigger
- Check workflow is ON (toggle in top right)
- Check product was set to Active status
- Check Shopify Flow app is installed

### Action doesn't appear
- Ensure Flowmend app is installed
- Refresh the Flow page
- Try searching for app name exactly: "Flowmend"

### Job not created
- Check app webhook endpoint is reachable
- Check app logs for HMAC validation errors
- Verify SHOPIFY_API_SECRET is correct in .env

## Expected Evidence

For App Store submission, provide:
1. Screenshot of action configuration form (Step 4)
2. Screenshot of workflow ON status (Step 5)
3. Screenshot of Flow history showing run (Step 7)
4. Output of `verify-latest-job.ts` showing job created

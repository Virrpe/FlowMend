# Flowmend Product Roadmap

**Last Updated:** 2025-12-27

---

## Overview

This roadmap defines a phased rollout strategy to ship Flowmend MVP quickly, validate product-market fit, then expand resource types and advanced features.

**Core Principle:** Ship small, validate, iterate.

---

## Phase 0: Pre-Launch (Weeks 1–2)

### Goals
- Complete MVP development
- Internal QA testing
- Development store validation

### Deliverables
- [ ] Complete codebase with all MVP features
- [ ] Shopify app listing submitted (private/unlisted)
- [ ] 3 test shops with 10k+ products each
- [ ] QA test plan executed (50+ test cases)
- [ ] Documentation: README, API contracts, DB schema

### Success Criteria
- All acceptance criteria in PRD met
- 100% test coverage on core modules (job runner, JSONL builder)
- Manual Flow testing on 3 product backfill scenarios

---

## Phase 1: MVP Launch (Public Beta) — v1.0

**Target:** Weeks 3–4
**Status:** PLANNED

### Scope: Products + Metafields Only

#### Features
1. **Flow Action:** Bulk Set Metafield (by query)
   - Resource: Products only
   - Metafield types: `single_line_text_field`, `boolean`, `number_integer`, `json`
   - Inputs: query, namespace, key, type, value, dry_run, max_items
   - Hard cap: 100k products per job

2. **Admin UI**
   - Jobs List (sortable table)
   - Job Detail (timeline + error preview)
   - Flow Templates (5 copy-paste examples)

3. **System**
   - BullMQ job queue (1 job per shop)
   - Shopify Bulk Operations integration
   - Idempotency via input hash
   - HMAC verification on Flow requests
   - Job events audit log

#### Constraints
- **NO tags** (risky; deferred to v1.1 with proper research)
- **NO variants** (deferred to v1.1)
- **NO billing** (free during beta)
- **NO email notifications** (UI-only status)
- **NO scheduled jobs** (manual Flow triggers only)

### Launch Plan
1. Submit app to Shopify App Store (public/unlisted)
2. Beta program: 20 hand-selected merchants
3. Weekly feedback calls with 5 power users
4. Monitor: job success rate, avg job size, time to first live job

### Success Metrics
- **Installs:** 50 in first month
- **Engagement:** 40% run ≥1 live job within 7 days
- **Reliability:** <2% job failure rate (excluding merchant query errors)
- **Support:** <3 tickets per 10 jobs

---

## Phase 2: Tag Support + Variants — v1.1

**Target:** Weeks 6–8 (post-MVP validation)
**Status:** PLANNED

### New Features

#### 1. Tag Operations (NEW)
**Action:** "Bulk Add Tags (by query)"
- **Input:** query, tags (comma-separated), max_items, dry_run
- **Mutation:** `tagsAdd` ([Shopify GraphQL Docs](https://shopify.dev/docs/api/admin-graphql/latest/mutations/tagsAdd))
- **Constraints:**
  - Research bulk support for `tagsAdd` (may require chunked `productUpdate`)
  - Do NOT use `productUpdate` in bulk (overwrites all tags)
  - Idempotent: adding existing tags is no-op

**Action:** "Bulk Remove Tags (by query)"
- **Input:** query, tags (comma-separated), max_items, dry_run
- **Mutation:** `tagsRemove`

#### 2. Variant Metafields (NEW)
**Action:** "Bulk Set Variant Metafield (by query)"
- **Query Target:** Product variants (e.g., `variant.sku:ABC*`)
- **Mutation:** `metafieldsSet` with variant owner type
- **Constraints:**
  - Hard cap: 500k variants per job (variants > products)
  - JSONL chunking at 90MB (more IDs per line)

### Database Schema Changes
- Add `resource_type` column to `jobs` table (enum: `product`, `variant`)
- Add `tag_operation` column (nullable; `add`, `remove`)

### Out-of-Scope (Still Deferred)
- Customers, orders, collections
- Billing integration
- Email notifications
- Scheduled jobs

### Success Metrics
- **Tag Adoption:** 30% of v1.1 users run ≥1 tag job
- **Variant Adoption:** 20% of v1.1 users run ≥1 variant metafield job
- **Reliability:** Maintain <2% failure rate with new resource types

---

## Phase 3: Advanced Features — v1.2

**Target:** Weeks 10–12
**Status:** PLANNED

### New Features

#### 1. Conditional Logic (NEW)
**Action:** "Bulk Set Metafield with Conditions"
- **Input:** Add `conditions` array (field, operator, value)
- **Example:** Only set metafield if `product.price > 100`
- **Implementation:** Filter during query phase, not mutation

#### 2. Formula-Based Values (NEW)
**Input:** `value_formula` (simple templating)
- **Example:** `"Product: {{title}} - {{vendor}}"` → interpolate from product data
- **Constraints:** Max 10 variables per formula
- **Implementation:** Fetch product data in bulk query, compute values, build JSONL

#### 3. Multi-Metafield Jobs (NEW)
**Action:** "Bulk Set Multiple Metafields (by query)"
- **Input:** `metafields` array (up to 5 namespace/key/type/value sets)
- **Implementation:** Single bulk query, build JSONL with multiple metafield inputs per product

#### 4. Job Scheduling (NEW)
**UI:** "Schedule Job" button on Job Detail
- **Input:** cron expression (daily, weekly, monthly)
- **Implementation:** Node-cron + job queue integration
- **Constraints:** Max 10 scheduled jobs per shop

### Database Schema Changes
- Add `scheduled_jobs` table (id, job_template_json, cron, next_run_at, enabled)
- Add `scheduled_job_id` FK to `jobs` table (nullable)

### Out-of-Scope (Still Deferred)
- Customers, orders
- Billing
- Email notifications
- Export to CSV

### Success Metrics
- **Formula Adoption:** 15% of v1.2 users use value formulas
- **Scheduling Adoption:** 25% of v1.2 users create ≥1 scheduled job
- **Multi-Field Adoption:** 20% of v1.2 users set multiple metafields per job

---

## Phase 4: Enterprise + Monetization — v2.0

**Target:** Weeks 14–20
**Status:** ROADMAP

### New Features

#### 1. Customer Metafields (NEW)
**Action:** "Bulk Set Customer Metafield (by query)"
- **Query Target:** Customers (e.g., `customer.orders_count > 5`)
- **Mutation:** `metafieldsSet` with customer owner type
- **Constraints:**
  - Requires `read_customers`, `write_customers` scopes
  - Hard cap: 200k customers per job

#### 2. Billing Integration (NEW)
**Tiers:**
- **Free:** 10 jobs/month, max 1k products per job
- **Pro ($29/mo):** 100 jobs/month, max 10k products per job
- **Enterprise ($99/mo):** Unlimited jobs, max 100k products per job

**Implementation:**
- Shopify App Billing API
- Usage tracking in `jobs` table
- Billing cycle reset via webhook

#### 3. Email Notifications (NEW)
**Triggers:**
- Job completed (with summary)
- Job failed (with error preview link)
- Weekly digest (jobs run, success rate)

**Implementation:**
- SendGrid/Mailgun integration
- User email from Shopify Shop owner
- Opt-in via Settings UI

#### 4. Collaboration Features (NEW)
**Multi-User Support:**
- Job created by (Shopify staff user ID)
- Job approval workflow (dry-run → approve → execute)
- Role-based access (admin can edit, staff can view)

**Implementation:**
- Shopify App Bridge user context
- `created_by_user_id` column in `jobs` table
- UI: "Pending Approval" tab

#### 5. Export to CSV (NEW)
**Feature:** Download job results as CSV
- **Columns:** Product ID, Handle, Title, Metafield Set (Y/N), Error
- **Format:** UTF-8 CSV with BOM
- **Limit:** Max 50k rows per export

### Database Schema Changes
- Add `billing_tier` column to `shops` table
- Add `job_quota_used` counter (reset monthly)
- Add `created_by_user_id` to `jobs` table
- Add `approval_status` enum to `jobs` (draft, pending, approved, rejected)

### Out-of-Scope (Future Roadmap)
- Order metafields (low demand)
- Collection metafields (low demand)
- AI-powered query suggestions
- Undo/rollback functionality (complex; risky)

### Success Metrics
- **Revenue:** $5k MRR within 3 months of v2.0 launch
- **Conversion:** 20% of free users upgrade to paid tier
- **Retention:** 80% of paid users renew after 3 months
- **Enterprise:** 5 Enterprise customers within 6 months

---

## Future Considerations (v3.0+)

### Potential Features (Not Committed)
1. **Undo/Rollback:** Reverse a bulk job by storing original values
   - **Complexity:** High (requires value snapshots before mutation)
   - **Storage Cost:** High (GB-scale for large jobs)
2. **AI Query Builder:** Natural language → Shopify query syntax
   - **Complexity:** Medium (LLM integration, prompt engineering)
   - **Value:** High for non-technical users
3. **GraphQL API:** Programmatic job triggering (not just Flow)
   - **Complexity:** Medium (auth, rate limiting, docs)
   - **Demand:** Unknown (validate via user research)
4. **Shopify Plus Features:** Script Tags, Carrier Services integration
   - **Demand:** Low (niche use cases)
5. **Multi-Shop Management:** Run jobs across multiple stores
   - **Complexity:** High (auth, cross-shop permissions)
   - **Demand:** Medium (agencies, franchises)

---

## Decision Framework

### When to Build a Feature
**Criteria (must meet 3 of 4):**
1. **Demand:** Requested by ≥30% of surveyed users
2. **Impact:** Unlocks new use case or 10x improvement
3. **Feasibility:** Can ship in ≤2 weeks with existing stack
4. **Differentiation:** Competitors do not offer this

### When to Defer a Feature
**Red Flags:**
- Requires new infrastructure (e.g., separate worker cluster)
- Adds ≥20% to operational cost
- Conflicts with Shopify API constraints
- Increases support burden by ≥2x

---

## Changelog

| Version | Date | Summary |
|---------|------|---------|
| v1.0 | Week 4 | MVP launch: Products + Metafields |
| v1.1 | Week 8 | Tag operations + Variant metafields |
| v1.2 | Week 12 | Conditional logic + Formulas + Scheduling |
| v2.0 | Week 20 | Customer metafields + Billing + Email notifications |

---

## Appendix: MVP Definition (Explicit Boundaries)

### MUST HAVE (v1.0)
- ✅ Products-only metafield backfill
- ✅ Dry-run mode (default ON)
- ✅ Flow action with query input
- ✅ Admin UI (Jobs List, Detail, Templates)
- ✅ Job queue with per-shop concurrency
- ✅ Error preview + download
- ✅ Idempotency + HMAC verification

### MUST NOT HAVE (v1.0)
- ❌ Tags (too risky without research)
- ❌ Variants (deferred to v1.1)
- ❌ Customers (deferred to v2.0)
- ❌ Billing (free beta)
- ❌ Email notifications (UI-only)
- ❌ Scheduled jobs (manual Flow only)
- ❌ AI features (no LLM integration)
- ❌ CSV export (error JSONL download only)
- ❌ Multi-shop operations (single shop per job)
- ❌ Approval workflows (trust users)

---

**End of Roadmap**

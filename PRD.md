# Product Requirements Document: Flowmend

**Version:** 1.0 MVP
**Last Updated:** 2025-12-27
**Status:** Planning

---

## Executive Summary

**Flowmend** is a Shopify app that solves a critical merchant pain point: Shopify Flow's 100-item cap on bulk operations. Merchants needing to backfill metafields across thousands of products are forced into CSV exports, manual scripts, or expensive dev tools.

**Core Value Proposition:**
A Flow-native "Bulk Set Metafield (by query)" action that safely executes bulk metafield operations at scale (10k–100k+ items) using Shopify's Bulk Operations API, with dry-run mode, guardrails, and full audit logs.

---

## Problem Statement

### Current Pain Points
1. **Flow Limitation**: Shopify Flow caps "Get data" and "For each" actions at 100 items ([Shopify Flow Docs](https://help.shopify.com/en/manual/shopify-flow/reference/actions#get-data))
2. **No Safe Bulk Tools**: Merchants lack Flow-integrated tools for bulk metafield maintenance
3. **Risky Workarounds**: CSV imports/exports are error-prone and lack audit trails
4. **Developer Dependency**: Custom scripts require technical resources

### Target Users
- **Merchants** managing large catalogs (500+ products) who need to:
  - Backfill metafields for Online Store 2.0 features
  - Normalize product data (vendor, type, tags → metafields)
  - Apply product badges, filters, or structured data
- **Store ops teams** maintaining data hygiene without dev skills

---

## MVP Scope

### In-Scope Features

#### 1. Flow Action: "Bulk Set Metafield (by query)"
**Type:** Shopify Flow Extension Action

**Inputs:**
| Parameter | Type | Required | Default | Constraints |
|-----------|------|----------|---------|-------------|
| `query_string` | string | Yes | - | Shopify product search syntax |
| `namespace` | string | Yes | - | Lowercase, alphanumeric + underscore |
| `key` | string | Yes | - | Lowercase, alphanumeric + underscore |
| `type` | enum | Yes | - | `single_line_text_field`, `boolean`, `number_integer`, `json` |
| `value` | string | Yes | - | Raw value; interpreted by `type` |
| `dry_run` | boolean | No | `true` | Safety default |
| `max_items` | integer | No | `10000` | Hard cap: `100000` |

**Behavior:**
- **Dry-run Mode** (`dry_run=true`):
  - Execute bulk query to count matching products
  - Create job with `matched_count`, status `COMPLETED`
  - **DO NOT** mutate any metafields
- **Live Mode** (`dry_run=false`):
  - Execute bulk query to fetch product IDs
  - Build JSONL for `metafieldsSet` mutation
  - Chunk JSONL to ≤95MB per file
  - Upload via `stagedUploadsCreate`
  - Execute `bulkOperationRunMutation`
  - Poll until completion
  - Parse result/error files
  - Store `updated_count`, `failed_count`, error preview (max 50 lines)

**Safety Guardrails:**
- Default to dry-run ON
- Hard cap at 100,000 items per job
- Idempotent: duplicate triggers with same params do not create duplicate jobs
- HMAC verification on all Flow action requests

#### 2. Admin UI: Job Management

**Screen 1: Jobs List**
- **Path:** `/app/jobs`
- **Features:**
  - Sortable table: Status, Query, Metafield, Matched/Updated/Failed, Created At
  - Status badges: PENDING, RUNNING, COMPLETED, FAILED
  - Pagination (50 per page)
  - Link to Job Detail
- **CTA:** "View Flow Templates" → redirects to Templates screen

**Screen 2: Job Detail**
- **Path:** `/app/jobs/:id`
- **Sections:**
  - **Job Summary:** All input params, job ID, created/updated timestamps
  - **Timeline:** Step-by-step progress (Query → Upload → Mutation → Parse)
  - **Results:** Matched, Updated, Failed counts
  - **Error Preview:** First 50 error lines inline
  - **Actions:** Download full error JSONL (if errors exist)

**Screen 3: Flow Templates**
- **Path:** `/app/templates`
- **Content:** 5 pre-written Flow templates with:
  - Use case description
  - Query string example
  - Metafield config (namespace.key, type)
  - Copy-paste instructions
- **Examples:**
  - "Backfill product badge metafield for featured items"
  - "Set OS2.0 filter metafield for product type"
  - "Normalize vendor into custom namespace"
  - "Apply boolean flag for seasonal products"
  - "Store product stats as JSON metafield"

#### 3. Database Schema

**Table: `shops`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | string (PK) | Shopify shop domain |
| `access_token` | string | Encrypted |
| `scopes` | string | Comma-separated |
| `installed_at` | datetime | - |
| `uninstalled_at` | datetime | Nullable |

**Table: `jobs`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | string (PK) | UUID |
| `shop_id` | string (FK) | → shops.id |
| `status` | enum | PENDING, RUNNING, COMPLETED, FAILED |
| `query_string` | string | Input |
| `namespace` | string | Input |
| `key` | string | Input |
| `type` | string | Input |
| `value` | string | Input (max 1KB) |
| `dry_run` | boolean | Input |
| `max_items` | integer | Input |
| `matched_count` | integer | From query result |
| `updated_count` | integer | From mutation result |
| `failed_count` | integer | From mutation result |
| `error_preview` | text | Max 10KB; first 50 errors |
| `bulk_operation_id` | string | Shopify bulk op GID |
| `created_at` | datetime | - |
| `updated_at` | datetime | - |

**Table: `job_events`**
| Column | Type | Notes |
|--------|------|-------|
| `id` | integer (PK) | Auto-increment |
| `job_id` | string (FK) | → jobs.id |
| `event_type` | string | QUERY_STARTED, UPLOAD_COMPLETED, etc. |
| `message` | string | Human-readable log |
| `metadata` | json | Optional structured data |
| `created_at` | datetime | - |

#### 4. Job Queue System
- **Technology:** BullMQ + Redis
- **Queue:** `flowmend:jobs`
- **Concurrency:** 1 job per shop (Shopify bulk op constraint)
- **Retry Policy:**
  - Max 3 retries with exponential backoff (1m, 5m, 15m)
  - Permanent failure after 3 retries → status=FAILED
- **Idempotency:** Job key = hash(shop_id + query + namespace + key + value)

---

### Out-of-Scope (Explicitly NOT in MVP)

#### 1. Resource Types
- **NO tags** (risky; `productUpdate` overwrites tags; `tagsAdd` bulk support unclear)
- **NO variants** (deferred to v1.1)
- **NO customers** (deferred to v2.0)
- **NO orders/collections**

#### 2. Features
- **NO billing** (free during beta)
- **NO email notifications** (UI-only job status)
- **NO webhooks** for job completion
- **NO AI/ML** for query suggestions
- **NO scheduled jobs** (manual Flow triggers only)
- **NO multi-shop bulk operations**
- **NO export to CSV** (download error JSONL only)

#### 3. Advanced Metafield Types
- Only 4 types in MVP: `single_line_text_field`, `boolean`, `number_integer`, `json`
- NO support for: `file_reference`, `product_reference`, `list.*`, `dimension`, etc.

---

## Technical Constraints

### Shopify API Limits
1. **Flow List Cap:** 100 items max ([Shopify Flow Docs](https://help.shopify.com/en/manual/shopify-flow/reference/actions#get-data))
   - **Mitigation:** Accept query string, not object list
2. **Bulk JSONL Size:** 100MB max ([Bulk Operations Docs](https://shopify.dev/docs/api/usage/bulk-operations/imports))
   - **Mitigation:** Chunk to 95MB; split into multiple bulk ops if needed
3. **Bulk Op Duration:** Must complete within 24 hours
   - **Mitigation:** Hard cap at 100k items; estimate ~10k items/hour
4. **Bulk Op Concurrency:** 1 active bulk op per shop (API version dependent)
   - **Mitigation:** Per-shop job queue; serialize execution

### Reliability Requirements
1. **Idempotency:** Identical action triggers must not create duplicate jobs
   - **Implementation:** Hash input params; check for existing PENDING/RUNNING job
2. **HMAC Verification:** All Flow action requests must validate Shopify HMAC signature
3. **Audit Logs:** All job state changes must be logged to `job_events`
4. **PII Minimization:** Store only counts and operation IDs; do not store product titles/data

### Security Requirements
1. **OAuth Scopes:** `read_products`, `write_products`
2. **Token Storage:** Encrypt `access_token` in DB
3. **HTTPS Only:** All endpoints require TLS
4. **Rate Limiting:** 10 req/sec per shop for admin UI endpoints

---

## Acceptance Criteria

### Flow Action
- [ ] Action appears in Shopify Flow editor under "Flowmend" app
- [ ] Dry-run mode completes in <30s and returns accurate `matched_count`
- [ ] Live mode successfully sets metafield on 1,000 products with 0 failures
- [ ] Live mode handles 10,000 products with <5% failure rate (network errors)
- [ ] Duplicate triggers (same params) within 5 minutes do not create new jobs
- [ ] Invalid HMAC signature returns 401 Unauthorized

### Admin UI
- [ ] Jobs list loads in <2s for 100 jobs
- [ ] Job detail shows step-by-step timeline with timestamps
- [ ] Error preview displays first 50 errors inline
- [ ] Error download link returns valid JSONL file
- [ ] Templates page provides 5 copy-paste examples

### System Reliability
- [ ] Job queue processes 1 job per shop with no concurrency conflicts
- [ ] Failed jobs retry 3 times before marking as FAILED
- [ ] Job events table records at least 5 events per job (start, query, upload, mutate, complete)
- [ ] App handles Shopify API 429 rate limits with exponential backoff

### Data Integrity
- [ ] No duplicate jobs created for identical input params
- [ ] `matched_count` matches Shopify bulk query result count
- [ ] `updated_count + failed_count = matched_count` (accounting completeness)
- [ ] Error preview contains valid JSON lines with error codes

---

## Success Metrics (Post-Launch)

### Product Metrics
- **Adoption:** 100 installs in first month
- **Engagement:** 50% of installers run ≥1 live job within 7 days
- **Scale:** Avg job size >1,000 products
- **Reliability:** <2% job failure rate (excluding query errors)

### Quality Metrics
- **Support Tickets:** <5% of jobs result in support tickets
- **Dry-Run Adoption:** >60% of first-time users run dry-run before live
- **Error Handling:** >90% of failed jobs have actionable error messages

---

## Assumptions

1. **Merchant Knowledge:** Users understand Shopify product search syntax ([Search Syntax Docs](https://shopify.dev/docs/api/usage/search-syntax))
2. **Metafield Familiarity:** Users know their target namespace/key/type structure
3. **Flow Familiarity:** Users can create basic Shopify Flow workflows
4. **Scale:** Most jobs will be <10k products; 100k cap is safety buffer
5. **Error Tolerance:** Merchants accept that network errors may cause <5% failure rate on large jobs

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shopify bulk op API changes | High | Pin to stable API version; monitor changelog |
| Job queue Redis downtime | High | Implement graceful degradation; show "queue unavailable" message |
| Large JSONL files exhaust memory | Medium | Stream JSONL generation; chunk to 95MB max |
| Merchants set wrong metafield values | Medium | Dry-run default; show preview count before execution |
| HMAC bypass attempt | High | Validate HMAC on every Flow request; log failures |

---

## Dependencies

### External Services
- **Shopify Admin API:** v2024-10 (stable)
- **Redis:** v7.0+ (for BullMQ)
- **PostgreSQL:** v14+ (production DB)

### Shopify Scopes
- `read_products` (query products)
- `write_products` (set metafields via `metafieldsSet`)

### App Hosting
- **Compute:** Node.js 20+ with 512MB RAM
- **Storage:** PostgreSQL with 10GB initial capacity
- **Cache:** Redis with 256MB capacity

---

## Appendix: Reference Links

- [Shopify Flow Docs](https://help.shopify.com/en/manual/shopify-flow)
- [Shopify Bulk Operations](https://shopify.dev/docs/api/usage/bulk-operations)
- [Shopify Search Syntax](https://shopify.dev/docs/api/usage/search-syntax)
- [metafieldsSet Mutation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/metafieldsSet)
- [Shopify App Extensions](https://shopify.dev/docs/apps/app-extensions)
- [Flow Action Extensions](https://shopify.dev/docs/apps/flow/actions)

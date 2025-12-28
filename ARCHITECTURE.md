# Flowmend System Architecture

**Version:** 1.0 MVP
**Last Updated:** 2025-12-27

---

## Table of Contents
1. [Technology Stack](#technology-stack)
2. [System Overview](#system-overview)
3. [Module Architecture](#module-architecture)
4. [Data Model](#data-model)
5. [API Contracts](#api-contracts)
6. [Data Flow](#data-flow)
7. [Security](#security)
8. [Scalability & Performance](#scalability--performance)
9. [Monitoring & Observability](#monitoring--observability)

---

## Technology Stack

### Application Framework
- **Runtime:** Node.js 20 LTS
- **Framework:** Remix 2.x (Shopify App Template)
- **Language:** TypeScript 5.x
- **Build Tool:** Vite 5.x

**Rationale:** Shopify's official embedded app pattern with OAuth, App Bridge, and extension support out-of-the-box.

### Database
- **ORM:** Prisma 5.x
- **Development:** SQLite (local file)
- **Production:** PostgreSQL 14+ (managed service: Railway/Render/Fly.io)

**Rationale:** Prisma provides type-safe queries and migrations. SQLite for local dev, PostgreSQL for production scale.

### Job Queue
- **Queue:** BullMQ 5.x
- **Store:** Redis 7.0+ (managed: Upstash/Redis Cloud)

**Rationale:** BullMQ provides robust job scheduling, retries, rate limiting, and per-shop concurrency control.

### Shopify Integration
- **API Version:** 2024-10 (stable)
- **Client:** `@shopify/shopify-api` SDK
- **GraphQL:** `graphql-request` for bulk operations
- **Scopes:** `read_products`, `write_products`

### Infrastructure
- **Hosting:** Railway / Render / Fly.io (Node.js support + managed PostgreSQL)
- **Environment:** Docker containers (optional)
- **Storage:** Shopify's staged uploads (no S3 needed for MVP)

---

## System Overview

### High-Level Architecture

```
┌─────────────────┐
│  Shopify Flow   │ (Merchant triggers action)
└────────┬────────┘
         │ HTTPS POST (HMAC signed)
         ▼
┌─────────────────────────────────────────────────────┐
│                Flowmend App Server                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ Flow Action  │  │  Admin UI    │  │  OAuth    │ │
│  │   Endpoint   │  │  (Remix)     │  │  Handler  │ │
│  └──────┬───────┘  └──────────────┘  └───────────┘ │
│         │                                            │
│         ▼                                            │
│  ┌──────────────┐         ┌──────────────────────┐ │
│  │ Job Creator  │────────▶│  PostgreSQL (Jobs)   │ │
│  └──────┬───────┘         └──────────────────────┘ │
│         │                                            │
│         ▼                                            │
│  ┌──────────────┐         ┌──────────────────────┐ │
│  │  BullMQ      │────────▶│  Redis (Job Queue)   │ │
│  │  Producer    │         └──────────────────────┘ │
│  └──────────────┘                                   │
└─────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              BullMQ Worker Process                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │ Job Consumer │  │ Bulk Query   │  │  Bulk     │ │
│  │              │─▶│ Runner       │─▶│  Mutation │ │
│  │              │  │              │  │  Runner   │ │
│  └──────────────┘  └──────────────┘  └─────┬─────┘ │
│                                              │       │
└──────────────────────────────────────────────┼───────┘
                                               ▼
                                    ┌──────────────────┐
                                    │  Shopify Admin   │
                                    │  GraphQL API     │
                                    └──────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Flow Action Endpoint** | Validate HMAC, parse input, create job record, enqueue to BullMQ |
| **Job Creator** | Check idempotency (hash), insert job to DB, emit to queue |
| **BullMQ Producer** | Enqueue job with shop-specific concurrency key |
| **BullMQ Worker** | Dequeue job, execute bulk operations, update job status, log events |
| **Bulk Query Runner** | Execute `bulkOperationRunQuery`, poll until complete, download JSONL |
| **Bulk Mutation Runner** | Build JSONL, upload via `stagedUploadsCreate`, execute `bulkOperationRunMutation`, poll, parse results |
| **Admin UI** | Display jobs list, job detail, templates; authenticated via Shopify session |

---

## Module Architecture

### Directory Structure

```
flowmend/
├── app/                          # Remix app (routes + UI)
│   ├── routes/
│   │   ├── app.jobs._index.tsx      # Jobs list screen
│   │   ├── app.jobs.$id.tsx         # Job detail screen
│   │   ├── app.templates._index.tsx # Flow templates screen
│   │   └── webhooks.flow-action.tsx # Flow action endpoint
│   ├── components/
│   │   ├── JobsTable.tsx
│   │   ├── JobTimeline.tsx
│   │   ├── ErrorPreview.tsx
│   │   └── TemplateCard.tsx
│   └── shopify.server.ts         # Shopify API client config
│
├── extensions/
│   └── flow-action/              # Shopify Flow extension
│       ├── shopify.extension.toml
│       └── src/
│           └── run.js            # Extension entry point (calls app endpoint)
│
├── server/                       # Core business logic
│   ├── jobs/
│   │   ├── creator.ts            # Job creation + idempotency
│   │   ├── enqueuer.ts           # BullMQ producer
│   │   └── worker.ts             # BullMQ consumer
│   ├── shopify/
│   │   ├── bulk-query.ts         # Bulk query executor
│   │   ├── bulk-mutation.ts      # Bulk mutation executor
│   │   ├── jsonl-builder.ts      # JSONL generator with chunking
│   │   └── client.ts             # GraphQL client wrapper
│   ├── db/
│   │   ├── schema.prisma         # Prisma schema
│   │   └── client.ts             # Prisma client singleton
│   └── utils/
│       ├── hmac.ts               # HMAC validation
│       ├── idempotency.ts        # Input hash generator
│       └── logger.ts             # Structured logging
│
├── prisma/
│   ├── schema.prisma             # Database schema (copied from server/db)
│   └── migrations/               # Prisma migrations
│
├── .env.example                  # Environment variables template
├── package.json
├── tsconfig.json
├── remix.config.js
└── shopify.app.toml              # Shopify CLI config
```

---

## Data Model

### Prisma Schema

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"  // Use "sqlite" for local dev
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Shop {
  id             String    @id  // Shopify shop domain (e.g., "example.myshopify.com")
  accessToken    String    // Encrypted OAuth token
  scopes         String    // Comma-separated scopes
  installedAt    DateTime  @default(now())
  uninstalledAt  DateTime?

  jobs           Job[]

  @@index([installedAt])
}

model Job {
  id                String    @id @default(uuid())
  shopId            String
  status            JobStatus @default(PENDING)

  // Input parameters
  queryString       String
  namespace         String
  key               String
  type              String    // MetafieldType enum as string
  value             String    @db.Text  // Max 1KB
  dryRun            Boolean   @default(true)
  maxItems          Int       @default(10000)

  // Results
  matchedCount      Int?
  updatedCount      Int?
  failedCount       Int?
  errorPreview      String?   @db.Text  // Max 10KB; first 50 error lines

  // Shopify metadata
  bulkOperationId   String?   // Shopify bulk operation GID

  // Idempotency
  inputHash         String    // SHA-256 hash of (shopId + inputs)

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  shop              Shop      @relation(fields: [shopId], references: [id], onDelete: Cascade)
  events            JobEvent[]

  @@index([shopId, status])
  @@index([inputHash])
  @@index([createdAt])
}

enum JobStatus {
  PENDING       // Enqueued, not started
  RUNNING       // Worker processing
  COMPLETED     // Finished successfully
  FAILED        // Permanent failure (after retries)
}

model JobEvent {
  id          Int       @id @default(autoincrement())
  jobId       String
  eventType   String    // QUERY_STARTED, UPLOAD_COMPLETED, etc.
  message     String    @db.Text
  metadata    Json?     // Optional structured data
  createdAt   DateTime  @default(now())

  job         Job       @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId, createdAt])
}
```

### Enum: MetafieldType (TypeScript)

```typescript
// server/types/metafield.ts

export enum MetafieldType {
  SINGLE_LINE_TEXT_FIELD = 'single_line_text_field',
  BOOLEAN = 'boolean',
  NUMBER_INTEGER = 'number_integer',
  JSON = 'json',
}
```

---

## API Contracts

### Flow Action Request (from Shopify Flow)

**Endpoint:** `POST /webhooks/flow-action`

**Headers:**
```
Content-Type: application/json
X-Shopify-Hmac-Sha256: <base64_signature>
X-Shopify-Shop-Domain: example.myshopify.com
```

**Body:**
```json
{
  "query_string": "status:active tag:winter",
  "namespace": "custom",
  "key": "seasonal_badge",
  "type": "single_line_text_field",
  "value": "Winter Collection",
  "dry_run": true,
  "max_items": 5000
}
```

**Response (202 Accepted):**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PENDING",
  "message": "Job enqueued successfully"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid HMAC signature
- `400 Bad Request`: Missing required fields or invalid input
- `409 Conflict`: Duplicate job already exists (idempotency check)
- `500 Internal Server Error`: Server failure

---

### Admin UI Routes (Remix)

#### 1. Jobs List
**Route:** `GET /app/jobs?page=1&limit=50`

**Response (JSON for API mode):**
```json
{
  "jobs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "COMPLETED",
      "query": "status:active",
      "metafield": "custom.seasonal_badge",
      "type": "single_line_text_field",
      "matched_count": 1523,
      "updated_count": 1520,
      "failed_count": 3,
      "dry_run": false,
      "created_at": "2025-12-27T10:30:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pages": 1
}
```

#### 2. Job Detail
**Route:** `GET /app/jobs/:id`

**Response:**
```json
{
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "COMPLETED",
    "query_string": "status:active tag:winter",
    "namespace": "custom",
    "key": "seasonal_badge",
    "type": "single_line_text_field",
    "value": "Winter Collection",
    "dry_run": false,
    "max_items": 5000,
    "matched_count": 1523,
    "updated_count": 1520,
    "failed_count": 3,
    "error_preview": "{\"id\":\"gid://shopify/Product/123\",\"error\":\"Network timeout\"}\n...",
    "created_at": "2025-12-27T10:30:00Z",
    "updated_at": "2025-12-27T10:35:00Z"
  },
  "events": [
    {
      "event_type": "JOB_STARTED",
      "message": "Job started processing",
      "created_at": "2025-12-27T10:30:05Z"
    },
    {
      "event_type": "QUERY_COMPLETED",
      "message": "Bulk query completed: 1523 products matched",
      "created_at": "2025-12-27T10:31:00Z"
    },
    {
      "event_type": "MUTATION_COMPLETED",
      "message": "Bulk mutation completed: 1520 updated, 3 failed",
      "created_at": "2025-12-27T10:35:00Z"
    }
  ]
}
```

---

### Internal Job Message (BullMQ)

**Queue:** `flowmend:jobs`
**Job Data:**
```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "shop_id": "example.myshopify.com"
}
```

**Job Options:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "attempts": 3,
  "backoff": {
    "type": "exponential",
    "delay": 60000
  },
  "removeOnComplete": false,
  "removeOnFail": false
}
```

---

### Shopify GraphQL Queries/Mutations

#### 1. Bulk Query (Product IDs)

**Query:**
```graphql
mutation {
  bulkOperationRunQuery(
    query: """
    {
      products(query: "status:active tag:winter") {
        edges {
          node {
            id
          }
        }
      }
    }
    """
  ) {
    bulkOperation {
      id
      status
      url
    }
    userErrors {
      field
      message
    }
  }
}
```

**Poll Status:**
```graphql
query {
  currentBulkOperation {
    id
    status
    errorCode
    objectCount
    fileSize
    url
    partialDataUrl
  }
}
```

**Result JSONL (downloaded from `url`):**
```jsonl
{"id":"gid://shopify/Product/123"}
{"id":"gid://shopify/Product/456"}
{"id":"gid://shopify/Product/789"}
```

#### 2. Bulk Mutation (Set Metafields)

**Staged Upload:**
```graphql
mutation {
  stagedUploadsCreate(input: [
    {
      resource: "BULK_MUTATION_VARIABLES",
      filename: "bulk-mutation-vars.jsonl",
      mimeType: "text/jsonl",
      httpMethod: POST
    }
  ]) {
    stagedTargets {
      url
      resourceUrl
      parameters {
        name
        value
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

**Upload JSONL (multipart/form-data to `url`):**
```jsonl
{"input":{"id":"gid://shopify/Product/123","metafields":[{"namespace":"custom","key":"seasonal_badge","type":"single_line_text_field","value":"Winter Collection"}]}}
{"input":{"id":"gid://shopify/Product/456","metafields":[{"namespace":"custom","key":"seasonal_badge","type":"single_line_text_field","value":"Winter Collection"}]}}
```

**Mutation:**
```graphql
mutation {
  bulkOperationRunMutation(
    mutation: "mutation call($input: MetafieldsSetInput!) { metafieldsSet(metafields: [$input]) { metafields { id } userErrors { field message } } }",
    stagedUploadPath: "gid://shopify/StagedUpload/abc123"
  ) {
    bulkOperation {
      id
      status
      url
    }
    userErrors {
      field
      message
    }
  }
}
```

**Result JSONL (downloaded from `url`):**
```jsonl
{"__typename":"MetafieldsSetPayload","metafields":[{"id":"gid://shopify/Metafield/1"}],"userErrors":[]}
{"__typename":"MetafieldsSetPayload","metafields":[],"userErrors":[{"field":"value","message":"is invalid"}]}
```

---

## Data Flow

### End-to-End Flow: Dry-Run Job

```
1. Merchant triggers Flow action
   ↓
2. Shopify Flow sends POST to /webhooks/flow-action
   ↓
3. App validates HMAC signature
   ↓
4. App checks idempotency (hash of inputs)
   ↓ (if new)
5. App creates Job record (status=PENDING, dry_run=true)
   ↓
6. App enqueues job to BullMQ
   ↓
7. App returns 202 Accepted
   ↓
8. Worker dequeues job
   ↓
9. Worker updates Job status=RUNNING
   ↓
10. Worker executes bulkOperationRunQuery
   ↓
11. Worker polls currentBulkOperation every 5s
   ↓
12. Worker downloads result JSONL from URL
   ↓
13. Worker counts lines → matched_count
   ↓
14. Worker updates Job (status=COMPLETED, matched_count=1523)
   ↓
15. Worker logs JobEvent (QUERY_COMPLETED)
   ↓
16. Job complete (no mutation because dry_run=true)
```

### End-to-End Flow: Live Job

```
Steps 1-13: (same as dry-run)
   ↓
14. Worker parses product IDs from JSONL
   ↓
15. Worker builds mutation JSONL (metafieldsSet input per product)
   ↓
16. Worker chunks JSONL to 95MB max
   ↓
17. Worker calls stagedUploadsCreate
   ↓
18. Worker uploads JSONL via multipart form-data
   ↓
19. Worker calls bulkOperationRunMutation
   ↓
20. Worker polls currentBulkOperation every 10s
   ↓
21. Worker downloads result JSONL from URL
   ↓
22. Worker parses results:
    - Count successful mutations → updated_count
    - Count userErrors → failed_count
    - Store first 50 error lines → error_preview
   ↓
23. Worker updates Job (status=COMPLETED, updated_count=1520, failed_count=3)
   ↓
24. Worker logs JobEvent (MUTATION_COMPLETED)
   ↓
25. Job complete
```

---

## Security

### 1. OAuth & Authentication
- **Shopify OAuth 2.0:** Standard app installation flow
- **Session Storage:** Shopify App Bridge session tokens (JWT)
- **Token Encryption:** Access tokens encrypted at rest (AES-256-GCM)
- **Scope Validation:** Verify `read_products` and `write_products` on install

### 2. HMAC Verification
- **Flow Action Requests:** Validate `X-Shopify-Hmac-Sha256` header
- **Algorithm:** HMAC-SHA256 with `SHOPIFY_API_SECRET`
- **Timing-Safe Comparison:** Use `crypto.timingSafeEqual()` to prevent timing attacks

```typescript
// server/utils/hmac.ts

import crypto from 'crypto';

export function verifyHmac(body: string, signature: string, secret: string): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  const signatureBuffer = Buffer.from(signature, 'base64');
  const hashBuffer = Buffer.from(hash, 'base64');

  return crypto.timingSafeEqual(signatureBuffer, hashBuffer);
}
```

### 3. Input Validation
- **Schema Validation:** Zod schemas for all inputs
- **Namespace/Key Sanitization:** Regex `^[a-z0-9_]+$`
- **Max Lengths:**
  - `query_string`: 500 chars
  - `value`: 1KB
  - `namespace`, `key`: 50 chars each

### 4. Rate Limiting
- **Admin UI:** 100 req/min per shop (token bucket)
- **Flow Action:** No limit (Shopify already rate-limits Flow triggers)

### 5. Data Privacy
- **No PII Storage:** Only store product IDs, counts, and error codes
- **Error Sanitization:** Redact product titles/descriptions from error logs
- **Token Security:** Never log access tokens or HMAC signatures

---

## Scalability & Performance

### Database
- **Indexes:**
  - `jobs(shopId, status)` for queue filtering
  - `jobs(inputHash)` for idempotency checks
  - `job_events(jobId, createdAt)` for timeline queries
- **Connection Pooling:** Prisma default (10 connections)
- **Query Optimization:** Use `select` to limit fields on Jobs List

### Job Queue
- **Concurrency:** 1 job per shop (key: `shop:${shopId}`)
- **Rate Limiting:** BullMQ rate limiter (10 jobs/min per shop)
- **Worker Scaling:** Single worker for MVP; horizontal scaling via Docker replicas for v1.1

### JSONL Chunking
- **Chunk Size:** 95MB max (5MB buffer below Shopify's 100MB limit)
- **Streaming:** Use `stream.Writable` to build JSONL incrementally (avoid OOM)

**Pseudocode:**
```typescript
const chunk_size_mb = 95;
let current_chunk = [];
let current_size = 0;

for (const product_id of product_ids) {
  const line = buildJsonlLine(product_id, metafield);
  const line_size = Buffer.byteLength(line, 'utf8');

  if (current_size + line_size > chunk_size_mb * 1024 * 1024) {
    await uploadChunk(current_chunk);
    current_chunk = [];
    current_size = 0;
  }

  current_chunk.push(line);
  current_size += line_size;
}

if (current_chunk.length > 0) {
  await uploadChunk(current_chunk);
}
```

### Shopify API Constraints
- **Bulk Op Polling:** Poll every 5s for queries, 10s for mutations (avoid rate limits)
- **Retry Logic:** Exponential backoff for 429 responses (1s, 2s, 4s, 8s, 16s)
- **Timeout:** 2-hour max for bulk operations (hard timeout at Shopify)

---

## Monitoring & Observability

### Logging
- **Library:** Pino (structured JSON logs)
- **Levels:** DEBUG, INFO, WARN, ERROR
- **Fields:** `shop_id`, `job_id`, `event_type`, `duration_ms`

**Example Log:**
```json
{
  "level": "info",
  "time": "2025-12-27T10:35:00Z",
  "shop_id": "example.myshopify.com",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "MUTATION_COMPLETED",
  "updated_count": 1520,
  "failed_count": 3,
  "duration_ms": 285000
}
```

### Metrics (Future: Prometheus/Datadog)
- **Job Success Rate:** `jobs_completed / (jobs_completed + jobs_failed)`
- **Job Duration:** P50, P95, P99 (per shop, per job size bucket)
- **Queue Depth:** Current pending jobs per shop
- **API Error Rate:** 4xx/5xx responses from Shopify API

### Alerts (Future)
- Job failure rate >5% in 1 hour
- Queue depth >100 for any shop
- Shopify API error rate >10% in 10 minutes
- Worker process crash/restart

---

## Deployment Architecture

### Development
```
Local Machine:
- Node.js 20
- SQLite DB (./dev.db)
- Redis (Docker: redis:7-alpine)
- Shopify CLI (ngrok tunnel for webhooks)
```

### Production (Railway/Render)
```
┌─────────────────────────────────────┐
│  Load Balancer (Cloudflare/Railway) │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  App Server (Node.js + Remix)       │
│  - 2 replicas (auto-scale to 5)     │
│  - 512MB RAM each                   │
└─────────────┬───────────────────────┘
              │
              ├──────────────┐
              ▼              ▼
┌──────────────────┐  ┌─────────────────┐
│  PostgreSQL      │  │  Redis Cloud    │
│  (Managed)       │  │  (Upstash)      │
│  - 10GB storage  │  │  - 256MB cache  │
└──────────────────┘  └─────────────────┘
```

### Environment Variables

```bash
# .env.example

# Shopify App
SHOPIFY_API_KEY=<from_partners_dashboard>
SHOPIFY_API_SECRET=<from_partners_dashboard>
SHOPIFY_SCOPES=read_products,write_products
SHOPIFY_APP_URL=https://flowmend.railway.app

# Database
DATABASE_URL=postgresql://user:pass@host:5432/flowmend

# Redis (BullMQ)
REDIS_URL=redis://:pass@host:6379

# Encryption
ENCRYPTION_KEY=<32-byte-hex-key>  # For access token encryption

# App Config
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

---

## Error Handling Strategy

### Job Failures
1. **Transient Errors** (network timeout, 429 rate limit):
   - Retry up to 3 times with exponential backoff
   - Log each retry attempt to `job_events`
2. **Permanent Errors** (invalid query, bad metafield type):
   - Fail immediately, set status=FAILED
   - Store error message in `error_preview`
3. **Partial Failures** (some products succeed, some fail):
   - Mark job as COMPLETED
   - Store failed product IDs + errors in `error_preview`
   - User downloads full error JSONL for debugging

### API Error Codes
| Shopify Error | App Action |
|---------------|------------|
| `INVALID_QUERY` | Fail job, message: "Invalid search query syntax" |
| `RATE_LIMITED` | Retry with backoff |
| `BULK_OP_FAILED` | Parse error from `currentBulkOperation.errorCode`, fail job |
| `TIMEOUT` | Retry once, then fail |

---

## Testing Strategy

### Unit Tests
- **Coverage Target:** >80% for server modules
- **Framework:** Vitest
- **Mocks:** Shopify API client, Prisma DB, Redis queue

**Example:**
```typescript
// server/utils/hmac.test.ts

import { describe, it, expect } from 'vitest';
import { verifyHmac } from './hmac';

describe('verifyHmac', () => {
  it('validates correct HMAC signature', () => {
    const body = '{"test":"data"}';
    const secret = 'test-secret';
    const signature = 'expected-base64-signature';

    expect(verifyHmac(body, signature, secret)).toBe(true);
  });
});
```

### Integration Tests
- **Scenario:** Full job lifecycle (enqueue → process → complete)
- **Setup:** In-memory SQLite + Redis mock
- **Assertions:** Job status, events logged, counts accurate

### Manual QA (Development Store)
1. Install app on test shop with 10k products
2. Trigger dry-run job → verify matched_count
3. Trigger live job → verify metafields set correctly
4. Trigger duplicate job → verify idempotency (409 response)
5. Trigger job with invalid query → verify error handling

---

## Appendix: Technology Decision Log

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| **Remix over Next.js** | Shopify's official template; App Bridge integration built-in | Next.js (more popular, but requires custom Shopify setup) |
| **BullMQ over Inngest** | Self-hosted, no external SaaS dependency, mature ecosystem | Inngest (simpler, but adds cost + vendor lock-in) |
| **Prisma over raw SQL** | Type safety, migrations, good DX for rapid iteration | Drizzle (lighter, but less mature), raw SQL (more control, worse DX) |
| **PostgreSQL over MySQL** | Better JSON support, Shopify's recommended DB for apps | MySQL (more common, but weaker JSON handling) |
| **Railway over Vercel** | Includes managed PostgreSQL + Redis; no vendor lock-in for DB | Vercel (better DX, but requires separate DB/Redis providers) |

---

**End of Architecture Document**

# Next Steps: Flowmend Implementation Checklist

This file tracks what has been scaffolded and what needs to be implemented.

---

## ✅ COMPLETED: Scaffolding & Documentation

### Documentation (100% Complete)
- [x] PRD.md — Product requirements document
- [x] ROADMAP.md — Phased rollout plan (MVP → v1.1 → v2.0)
- [x] ARCHITECTURE.md — System design, modules, data flow
- [x] PSEUDOCODE.md — Algorithms, edge cases, and API contracts
- [x] DESIGN_PLAN.md — UI/UX wireframes and component specs
- [x] README.md — Local dev instructions and deployment guide

### Configuration Files (100% Complete)
- [x] package.json — Dependencies and scripts
- [x] tsconfig.json — TypeScript configuration
- [x] .gitignore — Git ignore patterns
- [x] .env.example — Environment variables template
- [x] remix.config.js — Remix build configuration
- [x] vitest.config.ts — Vitest test runner config
- [x] .eslintrc.cjs — ESLint configuration
- [x] shopify.app.toml — Shopify CLI configuration

### Database Schema (100% Complete)
- [x] prisma/schema.prisma — Complete schema (Shop, Job, JobEvent, JobStatus enum)
- [x] server/db/client.ts — Prisma client singleton

### Flow Extension (100% Complete)
- [x] extensions/flow-action/shopify.extension.toml — Extension config with input fields
- [x] extensions/flow-action/src/run.js — Extension entry point (placeholder)

### Type Definitions (100% Complete)
- [x] server/types/index.ts — All TypeScript types and enums

---

## 🚧 IN PROGRESS: Core Implementation

### Server Modules (Stubs Created, Needs Implementation)

#### ✅ Utility Modules (100% Complete)
- [x] server/utils/hmac.ts — HMAC verification (IMPLEMENTED)
- [x] server/utils/idempotency.ts — Input hash generator (IMPLEMENTED)
- [x] server/utils/logger.ts — Pino logger setup (IMPLEMENTED)

#### 🟡 Job Management (80% Complete)
- [x] server/jobs/creator.ts — Job creation with idempotency (IMPLEMENTED)
- [x] server/jobs/enqueuer.ts — BullMQ producer (IMPLEMENTED)
- [x] server/jobs/worker.ts — BullMQ consumer (IMPLEMENTED, needs testing)

#### 🟡 Shopify Integration (70% Complete)
- [x] server/shopify/client.ts — GraphQL client wrapper (IMPLEMENTED, needs retry logic)
- [x] server/shopify/bulk-query.ts — Bulk query runner (IMPLEMENTED, needs testing)
- [x] server/shopify/bulk-mutation.ts — Bulk mutation runner (IMPLEMENTED, needs testing)
- [x] server/shopify/jsonl-builder.ts — JSONL builder with chunking (IMPLEMENTED)

### Remix Routes (Stubs Created, Needs Implementation)

#### 🟡 Webhooks (50% Complete)
- [x] app/routes/webhooks.flow-action.tsx — Flow action endpoint (IMPLEMENTED, needs Zod validation)

#### 🟡 Admin UI (40% Complete)
- [x] app/routes/app.jobs._index.tsx — Jobs list (STUB, needs Shopify auth integration)
- [x] app/routes/app.jobs.$id.tsx — Job detail (STUB, needs polishing)
- [x] app/routes/app.templates._index.tsx — Flow templates (STUB, needs styling)

#### ⚪ Shopify App Bridge (0% Complete)
- [ ] app/shopify.server.ts — Shopify OAuth setup (STUB, needs implementation)

---

## 📋 TODO: Critical Implementation Tasks

### Phase 1: Make It Run (Week 1)

#### 1. Shopify App Bridge Setup (Priority: HIGH)
- [ ] Install `@shopify/shopify-app-remix` package
- [ ] Implement OAuth flow in `app/shopify.server.ts`
- [ ] Add session storage (DB-based or in-memory)
- [ ] Add `authenticate.admin()` to protected routes
- [ ] Test app installation in development store

#### 2. Flow Action Endpoint (Priority: HIGH)
- [ ] Add Zod schema validation for input
- [ ] Test HMAC verification with real Flow requests
- [ ] Handle edge cases (shop not installed, invalid query syntax)

#### 3. Job Worker (Priority: HIGH)
- [ ] Test bulk query polling with real products
- [ ] Test bulk mutation execution
- [ ] Test JSONL chunking with >95MB datasets
- [ ] Add error handling for Shopify API errors (429, timeouts)

#### 4. Database Migrations (Priority: MEDIUM)
- [ ] Run `npx prisma migrate dev --name init` to create initial migration
- [ ] Seed database with test shop (optional)

#### 5. Admin UI Routes (Priority: MEDIUM)
- [ ] Add Shopify session authentication to all `/app/*` routes
- [ ] Polish Jobs List UI with Polaris components
- [ ] Add pagination to Jobs List
- [ ] Add error preview download button
- [ ] Test UI with real job data

---

### Phase 2: Polish & Test (Week 2)

#### 6. End-to-End Testing (Priority: HIGH)
- [ ] Test dry-run job flow (Flow → webhook → queue → worker → DB)
- [ ] Test live job flow with 100 products
- [ ] Test live job flow with 10,000 products
- [ ] Test idempotency (duplicate job triggers)
- [ ] Test error handling (invalid query, network errors)

#### 7. Unit Tests (Priority: MEDIUM)
- [ ] Write tests for `server/utils/hmac.ts`
- [ ] Write tests for `server/utils/idempotency.ts`
- [ ] Write tests for `server/jobs/creator.ts`
- [ ] Write tests for `server/shopify/jsonl-builder.ts`
- [ ] Achieve >80% coverage on core modules

#### 8. Error Handling (Priority: MEDIUM)
- [ ] Add retry logic to GraphQL client (429 rate limits)
- [ ] Add exponential backoff for bulk operation polling
- [ ] Handle shop uninstalled during job execution
- [ ] Add timeout handling for stuck jobs

#### 9. Security (Priority: HIGH)
- [ ] Encrypt access tokens in database
- [ ] Add rate limiting to webhook endpoint
- [ ] Validate metafield namespace/key regex
- [ ] Add CSRF protection to admin UI routes

---

### Phase 3: Deploy & Monitor (Week 3)

#### 10. Deployment (Priority: HIGH)
- [ ] Set up Railway/Render/Fly.io project
- [ ] Add managed PostgreSQL instance
- [ ] Add managed Redis instance
- [ ] Configure environment variables
- [ ] Deploy app
- [ ] Update Shopify app URL in Partners dashboard
- [ ] Test OAuth flow in production

#### 11. Monitoring (Priority: MEDIUM)
- [ ] Add health check endpoint (`/health`)
- [ ] Set up error tracking (Sentry/Bugsnag)
- [ ] Add job metrics logging (success rate, duration)
- [ ] Set up alerts for job failures

#### 12. Documentation (Priority: LOW)
- [ ] Add video walkthrough of Flow setup
- [ ] Write troubleshooting guide
- [ ] Add FAQ section to README
- [ ] Create onboarding email template

---

## 🎯 MVP Launch Checklist

Before launching to beta users, ensure:

### Functionality
- [ ] Dry-run jobs complete successfully and show accurate counts
- [ ] Live jobs successfully set metafields on 1,000+ products
- [ ] Idempotency prevents duplicate jobs
- [ ] Error preview shows actionable error messages
- [ ] Jobs List UI loads in <2 seconds
- [ ] Job Detail shows complete timeline with timestamps

### Reliability
- [ ] Job success rate >95% (excluding merchant query errors)
- [ ] No duplicate jobs created from duplicate triggers
- [ ] Worker recovers gracefully from crashes
- [ ] Shopify API rate limits handled correctly

### Security
- [ ] HMAC verification works on all Flow requests
- [ ] Access tokens encrypted in database
- [ ] No sensitive data logged
- [ ] Admin UI routes require authentication

### Documentation
- [ ] README has complete local dev setup instructions
- [ ] All environment variables documented
- [ ] Deployment guide tested on real hosting provider
- [ ] Templates page has 5 working examples

---

## 🚀 Post-MVP: Future Enhancements

See [ROADMAP.md](./ROADMAP.md) for full feature roadmap.

**v1.1 (Weeks 6-8):**
- Tag operations (`tagsAdd`, `tagsRemove`)
- Variant metafields support

**v1.2 (Weeks 10-12):**
- Conditional logic (filter by price, inventory, etc.)
- Formula-based values (template interpolation)
- Multi-metafield jobs (set 5 metafields per job)
- Job scheduling (cron)

**v2.0 (Weeks 14-20):**
- Customer metafields
- Billing integration (Free/Pro/Enterprise tiers)
- Email notifications
- Collaboration features (approval workflows)

---

## 📝 Notes for Developers

### Critical Files to Implement First
1. `app/shopify.server.ts` — Without OAuth, admin UI won't work
2. `server/jobs/worker.ts` — Test bulk operations end-to-end
3. `app/routes/webhooks.flow-action.tsx` — Add Zod validation

### Key Decisions to Make
- [ ] Choose hosting provider (Railway vs Render vs Fly.io)
- [ ] Choose error tracking service (Sentry vs Bugsnag vs LogRocket)
- [ ] Decide on session storage (database vs Redis vs memory)

### Testing Strategy
1. **Local Testing:** Use `curl` to test Flow webhook endpoint
2. **Dev Store Testing:** Install app in dev store, test with Flow
3. **Load Testing:** Test with 10k, 50k, 100k products

### Code Quality Standards
- All TODOs must be resolved before v1.0 launch
- All core modules must have >80% test coverage
- All public APIs must have JSDoc comments
- All error messages must be actionable (no generic "Something went wrong")

---

**Last Updated:** 2025-12-27

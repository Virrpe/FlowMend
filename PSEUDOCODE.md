# Flowmend Pseudocode & Algorithms

**Version:** 1.0 MVP
**Last Updated:** 2025-12-27

---

## Table of Contents
1. [Flow Action Handler](#flow-action-handler)
2. [Job Creator](#job-creator)
3. [Job Worker](#job-worker)
4. [Bulk Query Runner](#bulk-query-runner)
5. [Bulk Mutation Runner](#bulk-mutation-runner)
6. [JSONL Builder](#jsonl-builder)
7. [Error Parser](#error-parser)
8. [Edge Cases](#edge-cases)

---

## Flow Action Handler

**Endpoint:** `POST /webhooks/flow-action`

```python
FUNCTION handle_flow_action_request(request):
    # 1. Extract headers and body
    hmac_signature = request.headers['X-Shopify-Hmac-Sha256']
    shop_domain = request.headers['X-Shopify-Shop-Domain']
    body_raw = request.body_as_string()
    body = parse_json(body_raw)

    # 2. Validate HMAC signature
    IF NOT verify_hmac(body_raw, hmac_signature, SHOPIFY_API_SECRET):
        log_error("HMAC validation failed", shop_domain)
        RETURN 401 Unauthorized

    # 3. Validate shop is installed
    shop = db.shops.find_by_id(shop_domain)
    IF shop IS NULL OR shop.uninstalled_at IS NOT NULL:
        log_error("Shop not installed", shop_domain)
        RETURN 403 Forbidden

    # 4. Validate input schema
    TRY:
        input = validate_flow_action_input(body)  # Zod schema
    CATCH validation_error:
        log_error("Invalid input", shop_domain, validation_error)
        RETURN 400 Bad Request, {error: validation_error.message}

    # 5. Create job (with idempotency check)
    TRY:
        job = create_job(shop_domain, input)
    CATCH duplicate_job_error:
        log_warn("Duplicate job detected", shop_domain, input)
        RETURN 409 Conflict, {
            job_id: duplicate_job_error.existing_job_id,
            message: "Job with identical parameters already exists"
        }

    # 6. Enqueue job to BullMQ
    enqueue_job(job.id, shop_domain)

    # 7. Return success
    log_info("Job created", shop_domain, job.id)
    RETURN 202 Accepted, {
        job_id: job.id,
        status: "PENDING",
        message: "Job enqueued successfully"
    }

# Helper: HMAC verification
FUNCTION verify_hmac(body_raw, signature, secret):
    computed_hash = hmac_sha256(secret, body_raw).base64()
    RETURN timing_safe_equal(signature, computed_hash)

# Helper: Input validation
FUNCTION validate_flow_action_input(body):
    schema = {
        query_string: string, required, max_length=500,
        namespace: string, required, regex=^[a-z0-9_]+$, max_length=50,
        key: string, required, regex=^[a-z0-9_]+$, max_length=50,
        type: enum[single_line_text_field, boolean, number_integer, json], required,
        value: string, required, max_length=1024,
        dry_run: boolean, default=true,
        max_items: integer, default=10000, min=1, max=100000
    }
    RETURN validate_against_schema(body, schema)
```

---

## Job Creator

**Module:** `server/jobs/creator.ts`

```python
FUNCTION create_job(shop_id, input):
    # 1. Compute idempotency hash
    hash_input = concat(
        shop_id,
        input.query_string,
        input.namespace,
        input.key,
        input.type,
        input.value,
        input.dry_run,
        input.max_items
    )
    input_hash = sha256(hash_input).hex()

    # 2. Check for existing PENDING or RUNNING job with same hash
    existing_job = db.jobs.find_one({
        input_hash: input_hash,
        status: IN [PENDING, RUNNING]
    })

    IF existing_job IS NOT NULL:
        THROW duplicate_job_error(existing_job.id)

    # 3. Create new job record
    job = db.jobs.create({
        id: generate_uuid(),
        shop_id: shop_id,
        status: PENDING,
        query_string: input.query_string,
        namespace: input.namespace,
        key: input.key,
        type: input.type,
        value: input.value,
        dry_run: input.dry_run,
        max_items: input.max_items,
        input_hash: input_hash,
        created_at: now(),
        updated_at: now()
    })

    # 4. Log job creation event
    db.job_events.create({
        job_id: job.id,
        event_type: "JOB_CREATED",
        message: "Job created and enqueued",
        created_at: now()
    })

    RETURN job
```

---

## Job Worker

**Module:** `server/jobs/worker.ts`

```python
FUNCTION process_job(job_id, shop_id):
    # 1. Fetch job and shop from DB
    job = db.jobs.find_by_id(job_id)
    shop = db.shops.find_by_id(shop_id)

    IF job IS NULL OR shop IS NULL:
        log_error("Job or shop not found", job_id, shop_id)
        RETURN

    # 2. Update job status to RUNNING
    db.jobs.update(job.id, {status: RUNNING, updated_at: now()})
    log_event(job.id, "JOB_STARTED", "Job started processing")

    TRY:
        # 3. Execute bulk query
        log_event(job.id, "QUERY_STARTED", "Starting bulk query")
        product_ids = run_bulk_query(shop, job.query_string, job.max_items)
        matched_count = length(product_ids)

        db.jobs.update(job.id, {matched_count: matched_count, updated_at: now()})
        log_event(job.id, "QUERY_COMPLETED", f"Bulk query completed: {matched_count} products matched")

        # 4. If dry-run, stop here
        IF job.dry_run:
            db.jobs.update(job.id, {status: COMPLETED, updated_at: now()})
            log_event(job.id, "JOB_COMPLETED", f"Dry-run completed: {matched_count} products matched")
            RETURN

        # 5. If no products matched, complete job
        IF matched_count == 0:
            db.jobs.update(job.id, {
                status: COMPLETED,
                updated_count: 0,
                failed_count: 0,
                updated_at: now()
            })
            log_event(job.id, "JOB_COMPLETED", "No products matched query")
            RETURN

        # 6. Execute bulk mutation
        log_event(job.id, "MUTATION_STARTED", f"Starting bulk mutation for {matched_count} products")
        result = run_bulk_mutation(shop, job, product_ids)

        # 7. Update job with results
        db.jobs.update(job.id, {
            status: COMPLETED,
            updated_count: result.updated_count,
            failed_count: result.failed_count,
            error_preview: result.error_preview,
            bulk_operation_id: result.bulk_operation_id,
            updated_at: now()
        })

        log_event(job.id, "MUTATION_COMPLETED", f"Bulk mutation completed: {result.updated_count} updated, {result.failed_count} failed")
        log_event(job.id, "JOB_COMPLETED", "Job completed successfully")

    CATCH error:
        # 8. Handle job failure
        log_error("Job failed", job.id, error)
        db.jobs.update(job.id, {
            status: FAILED,
            error_preview: error.message,
            updated_at: now()
        })
        log_event(job.id, "JOB_FAILED", f"Job failed: {error.message}")

        # Re-throw to trigger BullMQ retry logic
        THROW error

# Helper: Log job event
FUNCTION log_event(job_id, event_type, message, metadata=NULL):
    db.job_events.create({
        job_id: job_id,
        event_type: event_type,
        message: message,
        metadata: metadata,
        created_at: now()
    })
```

---

## Bulk Query Runner

**Module:** `server/shopify/bulk-query.ts`

```python
FUNCTION run_bulk_query(shop, query_string, max_items):
    # 1. Build GraphQL bulk query
    graphql_query = f"""
    {{
      products(query: "{escape_graphql(query_string)}") {{
        edges {{
          node {{
            id
          }}
        }}
      }}
    }}
    """

    # 2. Start bulk operation
    client = create_graphql_client(shop.access_token, shop.id)
    mutation = """
    mutation($query: String!) {
      bulkOperationRunQuery(query: $query) {
        bulkOperation {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
    """

    response = client.mutate(mutation, {query: graphql_query})

    IF response.userErrors IS NOT EMPTY:
        error_msg = response.userErrors[0].message
        log_error("Bulk query failed", shop.id, error_msg)
        THROW error(f"Shopify query error: {error_msg}")

    bulk_op_id = response.bulkOperation.id

    # 3. Poll until completion
    product_ids = poll_bulk_operation_query(client, bulk_op_id, max_items)

    RETURN product_ids

# Helper: Poll bulk operation (query)
FUNCTION poll_bulk_operation_query(client, bulk_op_id, max_items):
    max_wait_time = 30 * 60 * 1000  # 30 minutes
    poll_interval = 5000  # 5 seconds
    elapsed_time = 0

    WHILE elapsed_time < max_wait_time:
        query = """
        query {
          currentBulkOperation {
            id
            status
            errorCode
            objectCount
            url
          }
        }
        """

        response = client.query(query)
        op = response.currentBulkOperation

        IF op.id != bulk_op_id:
            # Different operation running; wait for ours
            sleep(poll_interval)
            elapsed_time += poll_interval
            CONTINUE

        IF op.status == "COMPLETED":
            IF op.url IS NULL:
                log_warn("Bulk query completed with no results", bulk_op_id)
                RETURN []

            # Download and parse JSONL
            product_ids = download_and_parse_query_results(op.url, max_items)
            RETURN product_ids

        IF op.status == "FAILED":
            error_code = op.errorCode OR "UNKNOWN"
            log_error("Bulk query failed", bulk_op_id, error_code)
            THROW error(f"Bulk operation failed: {error_code}")

        IF op.status IN ["RUNNING", "CREATED"]:
            # Still processing
            sleep(poll_interval)
            elapsed_time += poll_interval
            CONTINUE

        # Unexpected status
        log_error("Unexpected bulk op status", bulk_op_id, op.status)
        THROW error(f"Unexpected status: {op.status}")

    # Timeout
    log_error("Bulk query timeout", bulk_op_id)
    THROW error("Bulk operation timed out after 30 minutes")

# Helper: Download and parse query results
FUNCTION download_and_parse_query_results(url, max_items):
    # Download JSONL file
    jsonl_content = http_get(url)

    product_ids = []
    lines = split_lines(jsonl_content)

    FOR line IN lines:
        IF length(product_ids) >= max_items:
            BREAK

        IF line.trim() IS EMPTY:
            CONTINUE

        obj = parse_json(line)
        IF obj.id IS NOT NULL:
            product_ids.append(obj.id)

    RETURN product_ids
```

---

## Bulk Mutation Runner

**Module:** `server/shopify/bulk-mutation.ts`

```python
FUNCTION run_bulk_mutation(shop, job, product_ids):
    client = create_graphql_client(shop.access_token, shop.id)

    # 1. Build JSONL variables
    log_event(job.id, "JSONL_BUILD_STARTED", "Building mutation JSONL")
    jsonl_chunks = build_mutation_jsonl(product_ids, job)

    # 2. Upload JSONL chunks
    staged_upload_paths = []
    FOR chunk IN jsonl_chunks:
        log_event(job.id, "UPLOAD_STARTED", f"Uploading JSONL chunk ({length(chunk)} lines)")
        staged_path = upload_jsonl_chunk(client, chunk, shop.id)
        staged_upload_paths.append(staged_path)

    # 3. For simplicity in MVP, run only first chunk
    # (Multi-chunk support is future enhancement)
    IF length(staged_upload_paths) > 1:
        log_warn("Multiple JSONL chunks detected; only first will be processed in MVP", job.id)

    staged_upload_path = staged_upload_paths[0]

    # 4. Start bulk mutation
    mutation = """
    mutation($mutation: String!, $stagedUploadPath: String!) {
      bulkOperationRunMutation(
        mutation: $mutation,
        stagedUploadPath: $stagedUploadPath
      ) {
        bulkOperation {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
    """

    mutation_string = "mutation call($input: MetafieldsSetInput!) { metafieldsSet(metafields: [$input]) { metafields { id } userErrors { field message } } }"

    response = client.mutate(mutation, {
        mutation: mutation_string,
        stagedUploadPath: staged_upload_path
    })

    IF response.userErrors IS NOT EMPTY:
        error_msg = response.userErrors[0].message
        log_error("Bulk mutation failed", shop.id, error_msg)
        THROW error(f"Shopify mutation error: {error_msg}")

    bulk_op_id = response.bulkOperation.id
    log_event(job.id, "MUTATION_POLLING_STARTED", f"Polling bulk operation {bulk_op_id}")

    # 5. Poll until completion
    result = poll_bulk_operation_mutation(client, bulk_op_id, job.id)

    RETURN result

# Helper: Poll bulk operation (mutation)
FUNCTION poll_bulk_operation_mutation(client, bulk_op_id, job_id):
    max_wait_time = 2 * 60 * 60 * 1000  # 2 hours
    poll_interval = 10000  # 10 seconds
    elapsed_time = 0

    WHILE elapsed_time < max_wait_time:
        query = """
        query {
          currentBulkOperation {
            id
            status
            errorCode
            objectCount
            url
          }
        }
        """

        response = client.query(query)
        op = response.currentBulkOperation

        IF op.id != bulk_op_id:
            sleep(poll_interval)
            elapsed_time += poll_interval
            CONTINUE

        IF op.status == "COMPLETED":
            IF op.url IS NULL:
                log_warn("Bulk mutation completed with no results", bulk_op_id)
                RETURN {
                    bulk_operation_id: bulk_op_id,
                    updated_count: 0,
                    failed_count: 0,
                    error_preview: NULL
                }

            # Download and parse mutation results
            result = download_and_parse_mutation_results(op.url, job_id)
            result.bulk_operation_id = bulk_op_id
            RETURN result

        IF op.status == "FAILED":
            error_code = op.errorCode OR "UNKNOWN"
            log_error("Bulk mutation failed", bulk_op_id, error_code)
            THROW error(f"Bulk operation failed: {error_code}")

        IF op.status IN ["RUNNING", "CREATED"]:
            sleep(poll_interval)
            elapsed_time += poll_interval
            CONTINUE

        log_error("Unexpected bulk op status", bulk_op_id, op.status)
        THROW error(f"Unexpected status: {op.status}")

    log_error("Bulk mutation timeout", bulk_op_id)
    THROW error("Bulk operation timed out after 2 hours")

# Helper: Download and parse mutation results
FUNCTION download_and_parse_mutation_results(url, job_id):
    jsonl_content = http_get(url)

    updated_count = 0
    failed_count = 0
    error_lines = []

    lines = split_lines(jsonl_content)

    FOR line IN lines:
        IF line.trim() IS EMPTY:
            CONTINUE

        obj = parse_json(line)

        # Check for userErrors
        IF obj.userErrors IS NOT EMPTY:
            failed_count += 1
            IF length(error_lines) < 50:  # Store max 50 errors
                error_lines.append(line)
        ELSE:
            updated_count += 1

    error_preview = NULL
    IF length(error_lines) > 0:
        error_preview = join(error_lines, "\n")
        # Truncate to 10KB
        IF byte_length(error_preview) > 10 * 1024:
            error_preview = error_preview[0:10*1024] + "\n... (truncated)"

    RETURN {
        updated_count: updated_count,
        failed_count: failed_count,
        error_preview: error_preview
    }
```

---

## JSONL Builder

**Module:** `server/shopify/jsonl-builder.ts`

```python
FUNCTION build_mutation_jsonl(product_ids, job):
    CHUNK_SIZE_MB = 95
    CHUNK_SIZE_BYTES = CHUNK_SIZE_MB * 1024 * 1024

    chunks = []
    current_chunk = []
    current_size = 0

    FOR product_id IN product_ids:
        line = build_jsonl_line(product_id, job)
        line_size = byte_length(line)

        # Check if adding this line exceeds chunk size
        IF current_size + line_size > CHUNK_SIZE_BYTES:
            # Finalize current chunk
            chunks.append(current_chunk)
            current_chunk = []
            current_size = 0

        current_chunk.append(line)
        current_size += line_size

    # Add final chunk
    IF length(current_chunk) > 0:
        chunks.append(current_chunk)

    RETURN chunks

# Helper: Build single JSONL line
FUNCTION build_jsonl_line(product_id, job):
    # Parse value based on type
    parsed_value = parse_metafield_value(job.value, job.type)

    input_obj = {
        "input": {
            "id": product_id,
            "metafields": [
                {
                    "namespace": job.namespace,
                    "key": job.key,
                    "type": job.type,
                    "value": parsed_value
                }
            ]
        }
    }

    jsonl_line = json_stringify(input_obj) + "\n"
    RETURN jsonl_line

# Helper: Parse metafield value
FUNCTION parse_metafield_value(value, type):
    IF type == "boolean":
        IF value IN ["true", "1", "yes"]:
            RETURN "true"
        ELSE:
            RETURN "false"

    IF type == "number_integer":
        RETURN to_string(parse_int(value))

    IF type == "json":
        # Validate JSON
        TRY:
            parsed = parse_json(value)
            RETURN json_stringify(parsed)  # Re-serialize to ensure valid
        CATCH error:
            log_error("Invalid JSON value", value)
            THROW error("Value is not valid JSON")

    # Default: single_line_text_field
    RETURN value

# Helper: Upload JSONL chunk
FUNCTION upload_jsonl_chunk(client, chunk_lines, shop_id):
    # 1. Request staged upload URL
    mutation = """
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
    """

    response = client.mutate(mutation)

    IF response.userErrors IS NOT EMPTY:
        error_msg = response.userErrors[0].message
        THROW error(f"Staged upload creation failed: {error_msg}")

    staged_target = response.stagedTargets[0]
    upload_url = staged_target.url
    resource_url = staged_target.resourceUrl
    upload_params = staged_target.parameters

    # 2. Build multipart form-data
    jsonl_content = join(chunk_lines, "")
    form_data = build_multipart_form(upload_params, jsonl_content)

    # 3. Upload to Shopify's S3-like storage
    http_post(upload_url, form_data, content_type="multipart/form-data")

    # 4. Return resource URL (GID)
    log_info("JSONL chunk uploaded", shop_id, resource_url)
    RETURN resource_url
```

---

## Error Parser

**Module:** `server/shopify/error-parser.ts`

```python
FUNCTION parse_mutation_errors(jsonl_content, max_errors=50):
    errors = []
    lines = split_lines(jsonl_content)

    FOR line IN lines:
        IF line.trim() IS EMPTY:
            CONTINUE

        IF length(errors) >= max_errors:
            BREAK

        obj = parse_json(line)

        # Check for userErrors
        IF obj.userErrors IS NOT EMPTY:
            error_obj = {
                "product_id": extract_product_id_from_line(line),
                "errors": obj.userErrors
            }
            errors.append(json_stringify(error_obj))

    RETURN errors

# Helper: Extract product ID from JSONL input line
FUNCTION extract_product_id_from_line(line):
    # This is tricky because mutation result doesn't include input ID
    # Workaround: Shopify returns results in same order as input
    # For MVP, we accept this limitation
    RETURN "gid://shopify/Product/UNKNOWN"
```

---

## Edge Cases

### 1. Zero Products Matched
**Scenario:** Query returns no products
**Handling:**
```python
IF matched_count == 0:
    db.jobs.update(job.id, {
        status: COMPLETED,
        matched_count: 0,
        updated_count: 0,
        failed_count: 0
    })
    log_event(job.id, "JOB_COMPLETED", "No products matched query")
    RETURN
```

### 2. All Products Fail
**Scenario:** Bulk mutation succeeds, but all products have userErrors
**Handling:**
```python
IF updated_count == 0 AND failed_count == matched_count:
    db.jobs.update(job.id, {
        status: COMPLETED,  # NOT FAILED (mutation ran successfully)
        updated_count: 0,
        failed_count: matched_count,
        error_preview: error_preview
    })
    log_event(job.id, "MUTATION_COMPLETED", f"All {matched_count} products failed")
```

### 3. Partial Failure
**Scenario:** 95% succeed, 5% fail
**Handling:**
```python
# Job is COMPLETED, not FAILED
db.jobs.update(job.id, {
    status: COMPLETED,
    updated_count: 950,
    failed_count: 50,
    error_preview: error_preview  # First 50 errors
})
log_event(job.id, "MUTATION_COMPLETED", "Partial success: 950 updated, 50 failed")
```

### 4. Duplicate Job
**Scenario:** Merchant triggers same Flow action twice within 1 minute
**Handling:**
```python
existing_job = db.jobs.find_one({
    input_hash: input_hash,
    status: IN [PENDING, RUNNING]
})

IF existing_job IS NOT NULL:
    log_warn("Duplicate job detected", existing_job.id)
    RETURN 409 Conflict, {
        job_id: existing_job.id,
        message: "Job with identical parameters is already running"
    }
```

### 5. JSONL Exceeds 100MB
**Scenario:** 100k products × ~1.5KB/line = ~150MB
**Handling:**
```python
# Chunking logic splits into 2 chunks:
# Chunk 1: ~95MB (first 63k products)
# Chunk 2: ~55MB (remaining 37k products)

# MVP limitation: Only process first chunk
IF length(jsonl_chunks) > 1:
    log_warn("Job exceeds single chunk; only first chunk processed", job.id)
    # Future: Run multiple bulk operations sequentially
```

### 6. Shopify Rate Limit (429)
**Scenario:** Too many API requests
**Handling:**
```python
TRY:
    response = client.mutate(mutation, variables)
CATCH rate_limit_error:
    retry_after = rate_limit_error.headers['Retry-After'] OR 5
    log_warn("Rate limited; retrying after {retry_after}s", job.id)
    sleep(retry_after * 1000)
    response = client.mutate(mutation, variables)  # Retry once
```

### 7. Bulk Operation Timeout
**Scenario:** Shopify bulk op runs for >2 hours
**Handling:**
```python
IF elapsed_time >= max_wait_time:
    log_error("Bulk operation timeout", bulk_op_id)
    db.jobs.update(job.id, {
        status: FAILED,
        error_preview: "Bulk operation timed out after 2 hours"
    })
    THROW error("Timeout")
```

### 8. Invalid Query Syntax
**Scenario:** Merchant enters malformed query (e.g., `status:active AND tag:`)
**Handling:**
```python
# Shopify returns userErrors from bulkOperationRunQuery
IF response.userErrors IS NOT EMPTY:
    error_msg = response.userErrors[0].message
    db.jobs.update(job.id, {
        status: FAILED,
        error_preview: f"Invalid query: {error_msg}"
    })
    log_event(job.id, "JOB_FAILED", error_msg)
    THROW error(error_msg)
```

### 9. Invalid Metafield Type/Value Mismatch
**Scenario:** `type=number_integer`, `value="abc"`
**Handling:**
```python
FUNCTION parse_metafield_value(value, type):
    IF type == "number_integer":
        TRY:
            parsed = parse_int(value)
            RETURN to_string(parsed)
        CATCH error:
            log_error("Invalid number_integer value", value)
            THROW error("Value must be a valid integer")
```

### 10. Shop Uninstalled Mid-Job
**Scenario:** Shop uninstalls app while job is RUNNING
**Handling:**
```python
FUNCTION process_job(job_id, shop_id):
    shop = db.shops.find_by_id(shop_id)

    IF shop IS NULL OR shop.uninstalled_at IS NOT NULL:
        log_warn("Shop uninstalled; aborting job", job_id, shop_id)
        db.jobs.update(job.id, {
            status: FAILED,
            error_preview: "Shop uninstalled during job execution"
        })
        RETURN  # Do not retry
```

### 11. Concurrent Bulk Operations
**Scenario:** Shopify only allows 1 bulk op per shop at a time
**Handling:**
```python
# BullMQ concurrency control
queue.process({
    concurrency: 1,
    limiter: {
        groupKey: (job) => job.data.shop_id,  # Per-shop concurrency
        max: 1,
        duration: 1000
    }
})
```

### 12. Worker Crash During Job
**Scenario:** Node.js worker process crashes mid-execution
**Handling:**
```python
# BullMQ automatically retries failed jobs
# Job remains RUNNING in DB; worker restarts and picks it up again
# Potential issue: Job may be processed twice (Shopify bulk ops are NOT idempotent)
# Mitigation: Check job status in DB before starting; skip if already COMPLETED
```

---

## Data Integrity Checks

### Post-Mutation Validation
```python
FUNCTION validate_job_results(job):
    # Ensure counts add up
    IF job.updated_count + job.failed_count != job.matched_count:
        log_error("Count mismatch", job.id, {
            matched: job.matched_count,
            updated: job.updated_count,
            failed: job.failed_count
        })
        # Do not fail job; log for investigation
```

### Error Preview Size Limit
```python
FUNCTION truncate_error_preview(error_preview):
    MAX_SIZE_KB = 10

    IF byte_length(error_preview) > MAX_SIZE_KB * 1024:
        truncated = error_preview[0:MAX_SIZE_KB*1024]
        truncated += "\n... (truncated; download full error file for complete list)"
        RETURN truncated

    RETURN error_preview
```

---

## Performance Optimizations

### Streaming JSONL Download
```python
FUNCTION download_and_parse_query_results_streaming(url, max_items):
    # Use streaming HTTP client to avoid loading entire file into memory
    stream = http_get_stream(url)
    product_ids = []

    FOR line IN stream.read_lines():
        IF length(product_ids) >= max_items:
            stream.close()
            BREAK

        obj = parse_json(line)
        IF obj.id IS NOT NULL:
            product_ids.append(obj.id)

    RETURN product_ids
```

### Database Query Optimization
```python
# Use indexed query for Jobs List
FUNCTION get_jobs_list(shop_id, page, limit):
    offset = (page - 1) * limit

    jobs = db.jobs.find_many({
        where: {shop_id: shop_id},
        order_by: {created_at: DESC},
        limit: limit,
        offset: offset,
        select: [  # Only fetch needed fields
            id, status, query_string, namespace, key, type,
            matched_count, updated_count, failed_count, created_at
        ]
    })

    RETURN jobs
```

---

## Appendix: GraphQL Mutation String

**Mutation for `metafieldsSet`:**
```graphql
mutation call($input: MetafieldsSetInput!) {
  metafieldsSet(metafields: [$input]) {
    metafields {
      id
      namespace
      key
    }
    userErrors {
      field
      message
      code
    }
  }
}
```

**JSONL Input Format:**
```json
{"input":{"id":"gid://shopify/Product/123","metafields":[{"namespace":"custom","key":"badge","type":"single_line_text_field","value":"New"}]}}
```

**JSONL Output Format (Success):**
```json
{"__typename":"MetafieldsSetPayload","metafields":[{"id":"gid://shopify/Metafield/1","namespace":"custom","key":"badge"}],"userErrors":[]}
```

**JSONL Output Format (Error):**
```json
{"__typename":"MetafieldsSetPayload","metafields":[],"userErrors":[{"field":"value","message":"is invalid","code":"INVALID"}]}
```

---

**End of Pseudocode Document**

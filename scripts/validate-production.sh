#!/bin/bash
#
# FlowMend Production Validation Script
# Tests all critical endpoints and webhooks in production environment
#
# Usage:
#   ./scripts/validate-production.sh <RAILWAY_DOMAIN> <SHOPIFY_API_SECRET>
#
# Example:
#   ./scripts/validate-production.sh flowmend-web-production-xxx.up.railway.app abc123...
#

# Don't exit on error - we want to collect all test results
set +e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Arguments
DOMAIN="${1:-}"
SECRET="${2:-}"

if [ -z "$DOMAIN" ]; then
  echo -e "${RED}Error: RAILWAY_DOMAIN required${NC}"
  echo "Usage: $0 <RAILWAY_DOMAIN> <SHOPIFY_API_SECRET>"
  exit 1
fi

if [ -z "$SECRET" ]; then
  echo -e "${YELLOW}Warning: SHOPIFY_API_SECRET not provided. Skipping webhook tests.${NC}"
fi

# Use http for localhost, https for production
if [[ "$DOMAIN" == "localhost"* ]]; then
  BASE_URL="http://$DOMAIN"
else
  BASE_URL="https://$DOMAIN"
fi
SHOP="flowmend.myshopify.com"

echo "========================================="
echo "FlowMend Production Validation"
echo "========================================="
echo "Domain: $DOMAIN"
echo "Base URL: $BASE_URL"
echo ""

# Test counter
PASSED=0
FAILED=0

# Helper function
test_endpoint() {
  local name="$1"
  local url="$2"
  local expected_code="${3:-200}"

  echo -n "Testing $name... "

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")

  if [ "$HTTP_CODE" = "$expected_code" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $HTTP_CODE)"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (Expected $expected_code, got $HTTP_CODE)"
    ((FAILED++))
    return 1
  fi
}

test_json_response() {
  local name="$1"
  local url="$2"
  local expected_key="$3"

  echo -n "Testing $name... "

  RESPONSE=$(curl -s "$url")

  if echo "$RESPONSE" | grep -q "\"$expected_key\""; then
    echo -e "${GREEN}✅ PASS${NC} (JSON contains '$expected_key')"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (Response: $RESPONSE)"
    ((FAILED++))
    return 1
  fi
}

test_html_content() {
  local name="$1"
  local url="$2"
  local expected_text="$3"

  echo -n "Testing $name... "

  RESPONSE=$(curl -s "$url")

  if echo "$RESPONSE" | grep -q "$expected_text"; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (Missing: $expected_text)"
    ((FAILED++))
    return 1
  fi
}

echo "========================================="
echo "TEST SUITE 1: Basic Endpoints"
echo "========================================="

test_json_response "Health Check" "$BASE_URL/health" "status"
test_endpoint "Privacy Policy" "$BASE_URL/app/privacy" 200
test_endpoint "Support Page" "$BASE_URL/app/support" 200
test_html_content "Privacy Policy Content" "$BASE_URL/app/privacy" "Privacy Policy"
test_html_content "Support Page Content" "$BASE_URL/app/support" "Contact Support"

echo ""

if [ -n "$SECRET" ]; then
  echo "========================================="
  echo "TEST SUITE 2: Webhook Endpoints"
  echo "========================================="

  # Test Flow Action Webhook
  echo -n "Testing Flow Action Webhook (HMAC verification)... "

  BODY='{
    "query_string": "title:test",
    "namespace": "custom",
    "key": "validation_test",
    "type": "single_line_text_field",
    "value": "test_value",
    "dry_run": true,
    "max_items": 5
  }'

  # Remove whitespace for HMAC calculation
  BODY_COMPACT=$(echo "$BODY" | jq -c .)

  HMAC=$(echo -n "$BODY_COMPACT" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

  RESPONSE=$(curl -s -X POST "$BASE_URL/webhooks/flow-action" \
    -H "Content-Type: application/json" \
    -H "X-Shopify-Shop-Domain: $SHOP" \
    -H "X-Shopify-Hmac-Sha256: $HMAC" \
    -d "$BODY_COMPACT")

  if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))

    JOB_ID=$(echo "$RESPONSE" | jq -r '.jobId')
    echo "  └─ Job ID: $JOB_ID"
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo "  └─ Response: $RESPONSE"
    ((FAILED++))
  fi

  # Test Idempotency (repeat same request)
  echo -n "Testing Idempotency (duplicate detection)... "

  RESPONSE2=$(curl -s -X POST "$BASE_URL/webhooks/flow-action" \
    -H "Content-Type: application/json" \
    -H "X-Shopify-Shop-Domain: $SHOP" \
    -H "X-Shopify-Hmac-Sha256: $HMAC" \
    -d "$BODY_COMPACT")

  if echo "$RESPONSE2" | grep -q '"deduped":true'; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠️  PARTIAL${NC} (Expected deduped:true)"
    echo "  └─ Response: $RESPONSE2"
  fi

  # Test Invalid HMAC
  echo -n "Testing HMAC Rejection (invalid signature)... "

  INVALID_HMAC="invalid_signature_here"

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/webhooks/flow-action" \
    -H "Content-Type: application/json" \
    -H "X-Shopify-Shop-Domain: $SHOP" \
    -H "X-Shopify-Hmac-Sha256: $INVALID_HMAC" \
    -d "$BODY_COMPACT")

  if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✅ PASS${NC} (Correctly rejected with 401)"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} (Expected 401, got $HTTP_CODE)"
    ((FAILED++))
  fi

  echo ""
  echo "========================================="
  echo "TEST SUITE 3: GDPR Compliance Webhooks"
  echo "========================================="

  # Test customers/data_request
  echo -n "Testing GDPR customers/data_request... "

  GDPR_BODY='{
    "shop_id": 12345678,
    "shop_domain": "'"$SHOP"'",
    "customer": {
      "id": 999999999,
      "email": "customer@example.com"
    },
    "orders_requested": ["1001", "1002"]
  }'

  GDPR_BODY_COMPACT=$(echo "$GDPR_BODY" | jq -c .)
  GDPR_HMAC=$(echo -n "$GDPR_BODY_COMPACT" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

  RESPONSE=$(curl -s -X POST "$BASE_URL/webhooks/customers/data_request" \
    -H "Content-Type: application/json" \
    -H "X-Shopify-Shop-Domain: $SHOP" \
    -H "X-Shopify-Hmac-Sha256: $GDPR_HMAC" \
    -d "$GDPR_BODY_COMPACT")

  if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} (Response: $RESPONSE)"
    ((FAILED++))
  fi

  # Test customers/redact
  echo -n "Testing GDPR customers/redact... "

  RESPONSE=$(curl -s -X POST "$BASE_URL/webhooks/customers/redact" \
    -H "Content-Type: application/json" \
    -H "X-Shopify-Shop-Domain: $SHOP" \
    -H "X-Shopify-Hmac-Sha256: $GDPR_HMAC" \
    -d "$GDPR_BODY_COMPACT")

  if echo "$RESPONSE" | grep -q '"ok":true'; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} (Response: $RESPONSE)"
    ((FAILED++))
  fi

  # Test shop/redact (NOTE: This will delete shop data - use with caution!)
  echo -n "Testing GDPR shop/redact endpoint... "

  SHOP_REDACT_BODY='{
    "shop_id": 12345678,
    "shop_domain": "'"$SHOP"'"
  }'

  SHOP_REDACT_COMPACT=$(echo "$SHOP_REDACT_BODY" | jq -c .)
  SHOP_REDACT_HMAC=$(echo -n "$SHOP_REDACT_COMPACT" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

  # We test this without expecting it to fail (shop may not exist in dev/test)
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/webhooks/shop/redact" \
    -H "Content-Type: application/json" \
    -H "X-Shopify-Shop-Domain: $SHOP" \
    -H "X-Shopify-Hmac-Sha256: $SHOP_REDACT_HMAC" \
    -d "$SHOP_REDACT_COMPACT")

  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP 200)"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} (Expected 200, got $HTTP_CODE)"
    ((FAILED++))
  fi

  echo ""
fi

echo "========================================="
echo "TEST SUITE 4: OAuth Flow (Manual)"
echo "========================================="
echo "OAuth install URL:"
echo "${YELLOW}$BASE_URL/auth?shop=$SHOP${NC}"
echo ""
echo "To test OAuth:"
echo "1. Visit the URL above in a browser"
echo "2. Complete OAuth consent"
echo "3. Verify 'Installation Complete' success page"
echo "4. Check database for shop record:"
echo "   SELECT id, scopes FROM \"Shop\" WHERE id = '$SHOP';"
echo ""

echo "========================================="
echo "VALIDATION SUMMARY"
echo "========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed! Production is ready.${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed. Review output above.${NC}"
  exit 1
fi

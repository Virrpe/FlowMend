#!/bin/bash
# Verification script for API authentication
# Tests that /api/* routes properly reject unauthorized requests and accept valid tokens

set -e

BASE_URL="${1:-http://localhost:3000}"

echo "🔍 FlowMend API Authentication Verification"
echo "=============================================="
echo ""
echo "Testing against: $BASE_URL"
echo ""

# Test 1: API routes should reject requests without auth header
echo "Test 1: Verify /api/me rejects requests without auth header"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/me")
if [ "$response" = "401" ]; then
  echo "✅ PASS: /api/me returned 401 (unauthorized)"
else
  echo "❌ FAIL: /api/me returned $response (expected 401)"
  exit 1
fi

echo ""
echo "Test 2: Verify /api/jobs rejects requests without auth header"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/jobs")
if [ "$response" = "401" ]; then
  echo "✅ PASS: /api/jobs returned 401 (unauthorized)"
else
  echo "❌ FAIL: /api/jobs returned $response (expected 401)"
  exit 1
fi

echo ""
echo "Test 3: Verify /api/templates rejects requests without auth header"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/templates")
if [ "$response" = "401" ]; then
  echo "✅ PASS: /api/templates returned 401 (unauthorized)"
else
  echo "❌ FAIL: /api/templates returned $response (expected 401)"
  exit 1
fi

echo ""
echo "Test 4: Verify /api/me rejects requests with invalid token"
response=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer invalid.token.here" \
  "$BASE_URL/api/me")
if [ "$response" = "401" ]; then
  echo "✅ PASS: /api/me returned 401 for invalid token"
else
  echo "❌ FAIL: /api/me returned $response (expected 401)"
  exit 1
fi

echo ""
echo "=============================================="
echo "✅ All authentication tests passed!"
echo ""
echo "Note: Testing with a valid session token requires:"
echo "  1. A running embedded app context in Shopify Admin"
echo "  2. A valid session token from App Bridge"
echo "  3. Manual verification via browser DevTools"
echo ""
echo "To test with a valid token:"
echo "  1. Open the app in Shopify Admin"
echo "  2. Open browser DevTools → Network tab"
echo "  3. Make an API request and inspect the Authorization header"
echo "  4. Verify the API returns 200 with valid data"

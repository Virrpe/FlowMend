#!/bin/bash
curl -s -X POST http://localhost:3000/webhooks/flow-action \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Shop-Domain: flowmend.myshopify.com" \
  -H "X-Shopify-Hmac-Sha256: Xgit8oGFAIfagMe3zIntYaPe1sUFahPRTbI73GFpQ8k=" \
  -d '{"query_string":"status:active tag:test","namespace":"custom","key":"test_field","type":"single_line_text_field","value":"Test value from webhook","dry_run":true,"max_items":10}'

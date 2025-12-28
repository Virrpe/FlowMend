#!/bin/bash
# Flowmend Pre-Launch Verification Script
# Runs code quality checks, validates environment, and tests core functionality

set -e  # Exit on first error

echo "🔍 Flowmend Verification Script"
echo "================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the project root
if [ ! -f "package.json" ]; then
  echo "${RED}❌ Error: Must run from project root directory${NC}"
  exit 1
fi

# 1. Linting
echo "${YELLOW}1. Running ESLint...${NC}"
if npm run lint > /dev/null 2>&1; then
  echo "${GREEN}✅ Linting passed${NC}"
else
  echo "${RED}❌ Linting failed - run 'npm run lint' for details${NC}"
  exit 1
fi
echo ""

# 2. Type Checking
echo "${YELLOW}2. Running TypeScript type check...${NC}"
if npm run typecheck > /dev/null 2>&1; then
  echo "${GREEN}✅ Type checking passed${NC}"
else
  echo "${RED}❌ Type checking failed - run 'npm run typecheck' for details${NC}"
  exit 1
fi
echo ""

# 3. Tests
echo "${YELLOW}3. Running tests...${NC}"
if npm test > /dev/null 2>&1; then
  echo "${GREEN}✅ Tests passed${NC}"
else
  echo "${RED}❌ Tests failed - run 'npm test' for details${NC}"
  exit 1
fi
echo ""

# 4. Prisma Schema Validation
echo "${YELLOW}4. Validating Prisma schema...${NC}"
if npx prisma validate > /dev/null 2>&1; then
  echo "${GREEN}✅ Prisma schema is valid${NC}"
else
  echo "${RED}❌ Prisma schema validation failed${NC}"
  exit 1
fi
echo ""

# 5. Environment Variables Check
echo "${YELLOW}5. Checking environment variables...${NC}"
if [ ! -f ".env" ]; then
  echo "${RED}❌ .env file not found - copy .env.example to .env${NC}"
  exit 1
fi

required_vars=(
  "SHOPIFY_API_KEY"
  "SHOPIFY_API_SECRET"
  "SHOPIFY_SCOPES"
  "SHOPIFY_APP_URL"
  "DATABASE_URL"
  "REDIS_URL"
  "ENCRYPTION_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
  if ! grep -q "^$var=" .env; then
    missing_vars+=("$var")
  fi
done

if [ ${#missing_vars[@]} -eq 0 ]; then
  echo "${GREEN}✅ All required environment variables present${NC}"
else
  echo "${RED}❌ Missing environment variables:${NC}"
  for var in "${missing_vars[@]}"; do
    echo "   - $var"
  done
  exit 1
fi
echo ""

# 6. Check Encryption Key Length
echo "${YELLOW}6. Validating encryption key...${NC}"
encryption_key=$(grep "^ENCRYPTION_KEY=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
if [ ${#encryption_key} -eq 64 ]; then
  echo "${GREEN}✅ Encryption key is valid (32 bytes / 64 hex chars)${NC}"
else
  echo "${RED}❌ Encryption key must be 64 hex characters (32 bytes)${NC}"
  echo "   Current length: ${#encryption_key}"
  exit 1
fi
echo ""

# 7. Check Shopify Scopes
echo "${YELLOW}7. Validating Shopify scopes...${NC}"
scopes=$(grep "^SHOPIFY_SCOPES=" .env | cut -d '=' -f2 | tr -d '"' | tr -d "'")
if [[ "$scopes" == *"read_products"* ]] && [[ "$scopes" == *"write_products"* ]]; then
  echo "${GREEN}✅ Shopify scopes configured correctly${NC}"
else
  echo "${RED}❌ Shopify scopes must include 'read_products,write_products'${NC}"
  exit 1
fi
echo ""

# 8. Check for Common Issues
echo "${YELLOW}8. Checking for common issues...${NC}"

# Check for TODO comments in production code
todo_count=$(grep -r "TODO" app/ server/ --include="*.ts" --include="*.tsx" | wc -l | tr -d ' ')
if [ "$todo_count" -gt 5 ]; then
  echo "${YELLOW}⚠️  Warning: Found $todo_count TODO comments in code${NC}"
else
  echo "${GREEN}✅ Minimal TODO comments found ($todo_count)${NC}"
fi

# Check for console.log in production code
console_count=$(grep -r "console.log" app/ server/ --include="*.ts" --include="*.tsx" | wc -l | tr -d ' ')
if [ "$console_count" -gt 10 ]; then
  echo "${YELLOW}⚠️  Warning: Found $console_count console.log statements${NC}"
else
  echo "${GREEN}✅ Minimal console.log usage ($console_count)${NC}"
fi

echo ""

# 9. Database Connection Test (Optional)
echo "${YELLOW}9. Testing database connection...${NC}"
if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
  echo "${GREEN}✅ Database connection successful${NC}"
else
  echo "${YELLOW}⚠️  Warning: Could not connect to database (may not be running)${NC}"
fi
echo ""

# Final Summary
echo "================================"
echo "${GREEN}✅ All verification checks passed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run 'npm run dev' to start development server"
echo "  2. Run 'npm run worker:dev' to start job worker"
echo "  3. Test on a Shopify development store"
echo "  4. Review scripts/verify-checklist.md for manual testing"
echo "  5. Deploy to production when ready"
echo ""
echo "🚀 Ready for launch!"

# FlowMend UI - Quick Start

## Development

\`\`\`bash
# 1. Install UI dependencies (one-time)
npm run ui:install

# 2. Build UI
npm run ui:build

# 3. Start server
npm start
\`\`\`

## Accessing the UI

**Embedded (Production):**
\`https://admin.shopify.com/store/<your-store>/apps/<your-app>\`

**Direct (Testing):**
\`http://localhost:3000/app\`

## Verifying Installation

\`\`\`bash
# Check UI built successfully
ls -la public/ui/

# Run API authentication tests
bash scripts/verify-api-auth.sh
\`\`\`

## Development Workflow

\`\`\`bash
# UI development (hot reload)
cd ui && npm run dev
# Access at: http://localhost:5173

# API proxies to http://localhost:3000
# Make sure main server is running
\`\`\`

## Documentation

- **Full Report:** [docs/UI_IMPLEMENTATION_REPORT.md](docs/UI_IMPLEMENTATION_REPORT.md)
- **Testing Guide:** [docs/TESTING_EMBEDDED_UI.md](docs/TESTING_EMBEDDED_UI.md)
- **UI README:** [ui/README.md](ui/README.md)

# FlowMend Admin UI

Embedded Shopify Admin UI for FlowMend, built with React + Vite + Polaris + App Bridge.

## Development

```bash
# Install dependencies
npm install

# Start dev server (with API proxy to :3000)
npm run dev

# Build for production
npm run build
```

## Environment Variables

Create a `.env` file:

```bash
VITE_SHOPIFY_API_KEY=your_api_key_here
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   └── NavigationFrame.tsx
├── pages/           # Page components
│   ├── Dashboard.tsx
│   ├── Runs.tsx
│   ├── RunDetail.tsx
│   ├── Templates.tsx
│   └── Settings.tsx
├── hooks/           # Custom React hooks
│   └── useAuthenticatedFetch.ts
├── utils/           # Utility functions
│   └── sessionToken.ts
├── types.ts         # TypeScript types
├── App.tsx          # Root component
└── main.tsx         # Entry point
```

## Pages

- **Dashboard** - Job stats, recent activity, shop info
- **Runs** - Job list with filters
- **Run Detail** - Job details, results, event timeline
- **Templates** - Query examples and patterns
- **Settings** - Shop settings, subscription, resources

## Authentication

Uses Shopify App Bridge session tokens:
1. Frontend obtains token via `getSessionToken()`
2. Backend verifies JWT signature
3. Shop domain extracted for authorization

## Build Output

Builds to `../public/ui/` (served by Express at `/app`)

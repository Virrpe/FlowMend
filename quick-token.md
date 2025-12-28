# Super Quick Access Token (30 seconds)

## Option 1: Browser Console (EASIEST - Copy & Paste)

1. Open this URL in your browser:
   ```
   https://flowmend.myshopify.com/admin/settings/apps/development
   ```

2. Click "Create an app" → Name it "Test" → Configure API scopes → Check `read_products` and `write_products` → Save → Install app

3. On the "Admin API access token" screen, **copy the token** (starts with `shpat_`)

4. Run this in your terminal (paste your token):
   ```bash
   # Replace YOUR_TOKEN_HERE with the actual token
   echo 'TEST_SHOP_ACCESS_TOKEN=YOUR_TOKEN_HERE' >> .env.tmp
   ```

   Then tell me the token and I'll add it to .env for you.

---

## Option 2: Use My Automated OAuth Script

Run this and follow the prompts (opens a browser):
```bash
npx tsx get-access-token.ts
```

---

## Why I Can't Generate It Automatically

Shopify access tokens **require**:
- Browser authentication (OAuth)
- OR manual creation in Shopify admin

The CLI and API can't create tokens without:
1. You clicking "Authorize" in a browser
2. OR you manually creating a custom app in the admin

Both methods take ~30 seconds. Once you have the token, I'll handle everything else! 🚀

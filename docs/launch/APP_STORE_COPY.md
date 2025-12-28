# Flowmend - App Store Listing Copy

## App Name
**Flowmend**

## Tagline (Short Description)
Bypass Flow's 100-item limit. Bulk set metafields on thousands of products safely.

## Long Description

### Break Through Flow's Limits

Shopify Flow caps bulk operations at 100 items. Need to backfill metafields across thousands of products? **Flowmend** solves this with a Flow-native action that safely handles up to 100,000 products per job.

### Built for Online Store 2.0

Backfill product badges, filters, and custom data for OS2.0 themes without CSV exports or developer scripts. Works seamlessly with your existing Flow workflows.

### Key Features

✅ **Flow-Native Integration** - Add "Bulk Set Metafield (by query)" action directly in Shopify Flow
✅ **Dry-Run Mode** - Test your queries safely before making changes (default ON)
✅ **Massive Scale** - Handle up to 100,000 products per job using Shopify's Bulk Operations API
✅ **Smart Guardrails** - Idempotency checks, automatic retries, and comprehensive error logging
✅ **Full Audit Trail** - Track every job with detailed timelines and result counts

### How It Works

1. **Create a Flow** - Use any trigger (manual, daily, product update, etc.)
2. **Add Flowmend Action** - Search for "Flowmend: Bulk Set Metafield (by query)"
3. **Configure Parameters** - Set your product query, metafield namespace/key/value
4. **Test with Dry-Run** - See how many products match without making changes
5. **Run Live** - Flip dry_run to false and execute your bulk operation

### Perfect For

- **Merchants** with large catalogs (500+ products) needing metafield backfills
- **Store ops teams** maintaining data hygiene without dev resources
- **Theme developers** preparing product data for Online Store 2.0 features
- **Marketers** applying product badges, filters, and structured data at scale

### What You Get

- Unlimited bulk metafield operations (up to 100k products/job)
- Support for text, boolean, integer, and JSON metafield types
- Full error reporting with downloadable logs
- 7-day free trial with no credit card required
- Priority email support

### Pricing

**$29.99/month** - Cancel anytime
- 7-day free trial
- Unlimited jobs
- Up to 100,000 products per job
- Priority support

### MVP Scope (v1.0)

Flowmend focuses on **product metafields only** for maximum safety and reliability. We do not modify product titles, tags, variants, or core attributes—only metafields.

### Support & Documentation

- In-app getting started guide
- Copy-paste Flow templates for common use cases
- Responsive email support (24hr turnaround)
- Comprehensive privacy and data handling docs

---

## Keywords (SEO)

metafields, bulk operations, shopify flow, product data, online store 2.0, os2.0, backfill, bulk edit, metafield manager, flow automation

---

## Category

Store Management > Data & Import/Export

---

## FAQs

### What's the difference between dry-run and live mode?

**Dry-run mode** (default) counts how many products match your query without modifying anything. **Live mode** actually sets the metafield values. Always test with dry-run first!

### How many products can I update at once?

Flowmend can handle up to 100,000 products per job. The default limit is 10,000. Large jobs may take 30-60 minutes to complete.

### What metafield types are supported?

Flowmend supports:
- `single_line_text_field` (most common)
- `boolean` (true/false flags)
- `number_integer` (whole numbers)
- `json` (structured data)

Advanced types (file references, product references, lists) are coming in v1.1.

### Can Flowmend update product tags or variants?

No. Flowmend MVP focuses exclusively on product metafields for maximum safety. Tags and variants are out of scope to prevent accidental data loss.

### What if my job fails?

Check the job detail page for an error preview. Common issues include invalid query syntax, network timeouts, or metafield type mismatches. Jobs automatically retry up to 3 times with backoff.

### How do I cancel my subscription?

Visit the Billing page in-app and click "Cancel Subscription". You can cancel anytime during your trial without being charged.

### What happens to my data if I uninstall?

Your shop data is marked as uninstalled and automatically deleted after 30 days per GDPR compliance. You can request immediate deletion by contacting support.

### Does Flowmend work with development stores?

Yes! Development stores and partner test stores can use Flowmend without billing charges.

---

## App Icon Description

A clean, modern icon featuring:
- Primary color: Shopify green (#95BF47) or complementary blue (#5C6AC4)
- Symbol: Flowing waves or connected nodes representing bulk data flow
- Style: Flat design, minimal, professional

---

## Screenshot Shotlist

See `SCREENSHOT_SHOTLIST.md` for detailed screenshot requirements.

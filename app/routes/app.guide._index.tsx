/**
 * Getting Started Guide
 * Route: /app/guide
 *
 * Guides users on how to use Flowmend with Shopify Flow.
 * Explains dry-run mode, query syntax, and best practices.
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Page, Card, BlockStack, Text, List, Banner, Divider, InlineStack, Badge } from '@shopify/polaris';
import { authenticate } from '~/shopify.server';
import { requireBilling } from '~/billing/middleware.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  // Enforce billing (redirects to /app/billing if no active subscription)
  await requireBilling(request, session.shop!, session.accessToken!);

  return json({});
}

export default function GuidePage() {
  return (
    <Page
      title="Getting Started with Flowmend"
      subtitle="Learn how to create bulk metafield operations"
      backAction={{ url: '/app/jobs' }}
    >
      <BlockStack gap="500">
        <Banner tone="success">
          <p>
            <strong>New to Flowmend?</strong> Follow this guide to safely create your first
            bulk metafield operation. Always start with dry-run mode to test your query!
          </p>
        </Banner>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Step 1: Create a Shopify Flow
            </Text>
            <List>
              <List.Item>
                Go to <strong>Settings → Apps and sales channels → Flow</strong> in your
                Shopify admin
              </List.Item>
              <List.Item>Click "Create workflow"</List.Item>
              <List.Item>
                Choose a trigger (e.g., "Run manually" for testing, or "Daily" for
                scheduled backfills)
              </List.Item>
              <List.Item>
                Click "Add action" and search for <strong>"Flowmend"</strong>
              </List.Item>
              <List.Item>Select "Bulk Set Metafield (by query)"</List.Item>
            </List>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Step 2: Configure Your Action
            </Text>

            <BlockStack gap="300">
              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    Query String
                  </Text>
                  <Badge tone="attention">Required</Badge>
                </InlineStack>
                <Text as="p" variant="bodyMd">
                  A Shopify product search query. Examples:
                </Text>
                <List>
                  <List.Item>
                    <code>product_type:Shirt</code> - All products with type "Shirt"
                  </List.Item>
                  <List.Item>
                    <code>vendor:Nike</code> - All products from vendor "Nike"
                  </List.Item>
                  <List.Item>
                    <code>tag:featured</code> - All products tagged "featured"
                  </List.Item>
                  <List.Item>
                    <code>status:active AND inventory_total:{'>'}1</code> - Active products
                    with inventory
                  </List.Item>
                </List>
                <Text as="p" variant="bodySm" tone="subdued">
                  Learn more:{' '}
                  <a
                    href="https://shopify.dev/docs/api/usage/search-syntax"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'underline' }}
                  >
                    Shopify Search Syntax
                  </a>
                </Text>
              </BlockStack>

              <Divider />

              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    Namespace
                  </Text>
                  <Badge tone="attention">Required</Badge>
                </InlineStack>
                <Text as="p" variant="bodyMd">
                  The metafield namespace (lowercase, alphanumeric + underscore only).
                  Examples:
                </Text>
                <List>
                  <List.Item>
                    <code>custom</code> - General custom metafields
                  </List.Item>
                  <List.Item>
                    <code>shopify</code> - Reserved Shopify namespace
                  </List.Item>
                  <List.Item>
                    <code>theme_os2</code> - Online Store 2.0 theme data
                  </List.Item>
                </List>
              </BlockStack>

              <Divider />

              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    Key
                  </Text>
                  <Badge tone="attention">Required</Badge>
                </InlineStack>
                <Text as="p" variant="bodyMd">
                  The metafield key (lowercase, alphanumeric + underscore only). Examples:
                </Text>
                <List>
                  <List.Item>
                    <code>badge_text</code>
                  </List.Item>
                  <List.Item>
                    <code>filter_category</code>
                  </List.Item>
                  <List.Item>
                    <code>is_featured</code>
                  </List.Item>
                </List>
              </BlockStack>

              <Divider />

              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    Type
                  </Text>
                  <Badge tone="attention">Required</Badge>
                </InlineStack>
                <Text as="p" variant="bodyMd">
                  The metafield value type. Flowmend supports:
                </Text>
                <List>
                  <List.Item>
                    <code>single_line_text_field</code> - Plain text (most common)
                  </List.Item>
                  <List.Item>
                    <code>boolean</code> - True/false flags
                  </List.Item>
                  <List.Item>
                    <code>number_integer</code> - Whole numbers
                  </List.Item>
                  <List.Item>
                    <code>json</code> - Structured JSON data
                  </List.Item>
                </List>
              </BlockStack>

              <Divider />

              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    Value
                  </Text>
                  <Badge tone="attention">Required</Badge>
                </InlineStack>
                <Text as="p" variant="bodyMd">
                  The value to set. Examples by type:
                </Text>
                <List>
                  <List.Item>
                    Text: <code>Free Shipping</code>
                  </List.Item>
                  <List.Item>
                    Boolean: <code>true</code> or <code>false</code>
                  </List.Item>
                  <List.Item>
                    Integer: <code>42</code>
                  </List.Item>
                  <List.Item>
                    JSON: <code>{`{"color": "red", "size": "large"}`}</code>
                  </List.Item>
                </List>
              </BlockStack>

              <Divider />

              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    Dry Run
                  </Text>
                  <Badge tone="success">Recommended: ON</Badge>
                </InlineStack>
                <Text as="p" variant="bodyMd">
                  <strong>Default: ON (true)</strong>
                </Text>
                <Text as="p" variant="bodyMd">
                  When enabled, Flowmend counts matching products <strong>without modifying
                  anything</strong>. This lets you verify your query before running live.
                </Text>
                <Banner tone="warning">
                  <p>
                    <strong>Always test with dry-run first!</strong> This prevents
                    accidental bulk changes to the wrong products.
                  </p>
                </Banner>
              </BlockStack>

              <Divider />

              <BlockStack gap="100">
                <InlineStack gap="200" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    Max Items
                  </Text>
                  <Badge>Optional</Badge>
                </InlineStack>
                <Text as="p" variant="bodyMd">
                  <strong>Default: 10,000</strong>
                </Text>
                <Text as="p" variant="bodyMd">
                  Limits how many products will be updated. Maximum: 100,000.
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Large jobs (10k+) may take 30-60 minutes to complete.
                </Text>
              </BlockStack>
            </BlockStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Step 3: Test with Dry-Run
            </Text>
            <List>
              <List.Item>
                Save your Flow with <strong>Dry Run = ON</strong>
              </List.Item>
              <List.Item>Trigger the Flow (click "Run" if using a manual trigger)</List.Item>
              <List.Item>
                Go to the <a href="/app/jobs" style={{ textDecoration: 'underline' }}>Jobs
                page</a> in Flowmend
              </List.Item>
              <List.Item>
                Check the "Matched" count to verify your query found the right products
              </List.Item>
            </List>
            <Banner tone="info">
              <p>
                Dry-run jobs complete in ~30 seconds and show you exactly how many products
                would be affected.
              </p>
            </Banner>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Step 4: Run Live
            </Text>
            <List>
              <List.Item>
                Once you've verified the dry-run results, edit your Flow
              </List.Item>
              <List.Item>
                Change <strong>Dry Run = OFF (false)</strong>
              </List.Item>
              <List.Item>Save and trigger the Flow again</List.Item>
              <List.Item>Monitor progress on the Jobs page</List.Item>
            </List>
            <Text as="p" variant="bodyMd">
              Live jobs show:
            </Text>
            <List>
              <List.Item>
                <strong>Updated count</strong> - Products successfully modified
              </List.Item>
              <List.Item>
                <strong>Failed count</strong> - Products that encountered errors
              </List.Item>
              <List.Item>
                <strong>Error preview</strong> - First 50 error lines for debugging
              </List.Item>
            </List>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Best Practices
            </Text>
            <List>
              <List.Item>
                ✅ <strong>Always dry-run first</strong> - Verify your query matches the
                right products
              </List.Item>
              <List.Item>
                ✅ <strong>Start small</strong> - Test with max_items=10 before running on
                thousands of products
              </List.Item>
              <List.Item>
                ✅ <strong>Use specific queries</strong> - Narrow your search to avoid
                accidental updates
              </List.Item>
              <List.Item>
                ✅ <strong>Check metafield types</strong> - Ensure your value matches the
                expected type
              </List.Item>
              <List.Item>
                ⚠️ <strong>One shop at a time</strong> - Shopify limits bulk operations to
                1 active job per shop
              </List.Item>
              <List.Item>
                ⚠️ <strong>Be patient</strong> - Large jobs (10k+) can take 30-60 minutes
              </List.Item>
            </List>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Need Help?
            </Text>
            <Text as="p" variant="bodyMd">
              Check out these resources:
            </Text>
            <List>
              <List.Item>
                <a href="/app/templates" style={{ textDecoration: 'underline' }}>
                  Flow Templates
                </a>{' '}
                - Copy-paste examples for common use cases
              </List.Item>
              <List.Item>
                <a href="/app/support" style={{ textDecoration: 'underline' }}>
                  Support & FAQ
                </a>{' '}
                - Common questions and contact info
              </List.Item>
              <List.Item>
                <a
                  href="https://shopify.dev/docs/api/usage/search-syntax"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline' }}
                >
                  Shopify Search Syntax
                </a>{' '}
                - Learn advanced query techniques
              </List.Item>
            </List>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

/**
 * Flow Templates Screen
 * Route: /app/templates
 *
 * Provides copy-paste Flow templates for common metafield backfill scenarios.
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Page, Card, Text, BlockStack, Divider, Banner, List } from '@shopify/polaris';
import { authenticate } from '~/shopify.server';
import { requireBilling } from '~/billing/middleware.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);

  // Enforce billing (redirects to /app/billing if no active subscription)
  await requireBilling(request, session.shop!, session.accessToken!);

  return json({});
}

const templates = [
  {
    icon: '🏷️',
    title: 'Backfill Product Badge Metafield',
    useCase: 'Add a badge to featured products for Online Store 2.0 themes.',
    params: {
      query: 'tag:featured',
      namespace: 'custom',
      key: 'badge',
      type: 'single_line_text_field',
      value: 'Featured',
    },
  },
  {
    icon: '🔍',
    title: 'Set OS2.0 Filter Metafield',
    useCase: 'Enable filtering by product type in theme search.',
    params: {
      query: 'type:shoes',
      namespace: 'custom',
      key: 'filter_category',
      type: 'single_line_text_field',
      value: 'shoes',
    },
  },
  {
    icon: '📦',
    title: 'Normalize Vendor into Metafield',
    useCase: 'Store vendor name as metafield for advanced filtering.',
    params: {
      query: 'vendor:Acme',
      namespace: 'custom',
      key: 'vendor_normalized',
      type: 'single_line_text_field',
      value: 'acme',
    },
  },
  {
    icon: '❄️',
    title: 'Apply Seasonal Flag',
    useCase: 'Mark seasonal products with a boolean metafield.',
    params: {
      query: 'tag:winter',
      namespace: 'custom',
      key: 'is_seasonal',
      type: 'boolean',
      value: 'true',
    },
  },
  {
    icon: '📊',
    title: 'Store Product Stats as JSON',
    useCase: 'Save structured product data for analytics.',
    params: {
      query: 'status:active',
      namespace: 'custom',
      key: 'stats',
      type: 'json',
      value: '{"featured":true,"priority":10}',
    },
  },
];

export default function TemplatesPage() {
  return (
    <Page
      title="Flow Templates"
      subtitle="Copy-paste examples for common metafield backfills"
      backAction={{ url: '/app/jobs' }}
      primaryAction={{
        content: 'View Getting Started Guide',
        url: '/app/guide',
      }}
    >
      <BlockStack gap="500">
        <Banner tone="info">
          <p>
            <strong>How to use:</strong> Create a new Shopify Flow, add a trigger, then add
            the "Flowmend: Bulk Set Metafield" action. Copy the parameters from these
            templates. <strong>Always test with dry_run=true first!</strong>
          </p>
        </Banner>

        {templates.map((template, index) => (
          <Card key={index}>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                {template.icon} {template.title}
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                {template.useCase}
              </Text>

              <Divider />

              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Flow Action Parameters:
                </Text>

                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    backgroundColor: '#f6f6f7',
                    padding: '16px',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ marginBottom: '8px' }}>
                    <strong>query_string:</strong> {template.params.query}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>namespace:</strong> {template.params.namespace}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>key:</strong> {template.params.key}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>type:</strong> {template.params.type}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>value:</strong> {template.params.value}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>dry_run:</strong> <span style={{ color: '#008060' }}>true</span> (test first!)
                  </div>
                  <div>
                    <strong>max_items:</strong> 10000 (default)
                  </div>
                </div>
              </BlockStack>
            </BlockStack>
          </Card>
        ))}

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">
              Next Steps
            </Text>
            <List>
              <List.Item>
                Copy the parameters above into your Shopify Flow action
              </List.Item>
              <List.Item>
                Leave <code>dry_run=true</code> for your first test
              </List.Item>
              <List.Item>
                Check the{' '}
                <a href="/app/jobs" style={{ textDecoration: 'underline' }}>
                  Jobs page
                </a>{' '}
                to see how many products matched
              </List.Item>
              <List.Item>
                If the dry-run looks correct, edit your Flow and set{' '}
                <code>dry_run=false</code>
              </List.Item>
            </List>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Additional Resources
            </Text>
            <List>
              <List.Item>
                <a href="/app/guide" style={{ textDecoration: 'underline' }}>
                  Getting Started Guide
                </a>{' '}
                - Detailed walkthrough
              </List.Item>
              <List.Item>
                <a href="/app/support" style={{ textDecoration: 'underline' }}>
                  Support & FAQ
                </a>{' '}
                - Common questions
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

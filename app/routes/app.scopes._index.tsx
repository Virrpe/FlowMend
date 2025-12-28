/**
 * API Scopes Justification
 * Route: /app/scopes
 *
 * Explains why each OAuth scope is required and how it's used.
 * Required for Shopify App Store approval transparency.
 */

import { Page, Card, BlockStack, Text, List, Banner } from '@shopify/polaris';

export default function ScopesPage() {
  return (
    <Page
      title="API Scopes & Permissions"
      subtitle="What permissions Flowmend needs and why"
      backAction={{ url: '/app/support' }}
    >
      <BlockStack gap="500">
        <Banner tone="info">
          <p>
            Flowmend follows the principle of <strong>least privilege</strong> - we only
            request the minimum scopes required for core functionality. We do not access
            customer data, orders, or any other resources beyond products.
          </p>
        </Banner>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Required OAuth Scopes
            </Text>
            <Text as="p" variant="bodyMd">
              Flowmend requires exactly <strong>2 scopes</strong> to function:
            </Text>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              1. <code>read_products</code>
            </Text>
            <Text as="p" variant="bodyMd">
              <strong>Why we need it:</strong>
            </Text>
            <List>
              <List.Item>
                To execute bulk product queries via Shopify's Bulk Operations API
              </List.Item>
              <List.Item>
                To count how many products match your search query in dry-run mode
              </List.Item>
              <List.Item>
                To fetch product IDs (GIDs) for metafield updates in live mode
              </List.Item>
            </List>

            <Text as="p" variant="bodyMd">
              <strong>What we access:</strong>
            </Text>
            <List>
              <List.Item>Product IDs (GIDs only - e.g., "gid://shopify/Product/123")</List.Item>
              <List.Item>
                Product counts from bulk query results
              </List.Item>
            </List>

            <Text as="p" variant="bodyMd">
              <strong>What we DO NOT access:</strong>
            </Text>
            <List>
              <List.Item>Product titles, descriptions, or prices</List.Item>
              <List.Item>Product images or media</List.Item>
              <List.Item>Inventory levels or variants</List.Item>
              <List.Item>Product tags or collections</List.Item>
            </List>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              2. <code>write_products</code>
            </Text>
            <Text as="p" variant="bodyMd">
              <strong>Why we need it:</strong>
            </Text>
            <List>
              <List.Item>
                To execute the <code>metafieldsSet</code> mutation via Bulk Operations API
              </List.Item>
              <List.Item>
                To set metafield values on products based on your Flow action parameters
              </List.Item>
            </List>

            <Text as="p" variant="bodyMd">
              <strong>What we modify:</strong>
            </Text>
            <List>
              <List.Item>
                <strong>Product metafields ONLY</strong> - specifically the
                namespace/key/value you specify in the Flow action
              </List.Item>
            </List>

            <Text as="p" variant="bodyMd">
              <strong>What we DO NOT modify:</strong>
            </Text>
            <List>
              <List.Item>
                <strong>Product titles, descriptions, prices, or core attributes</strong>
              </List.Item>
              <List.Item>
                <strong>Product tags, vendor, or type</strong> (explicitly out of scope for MVP)
              </List.Item>
              <List.Item>
                <strong>Product variants or inventory</strong>
              </List.Item>
              <List.Item>
                <strong>Product images or media</strong>
              </List.Item>
              <List.Item>
                <strong>Collections or product relationships</strong>
              </List.Item>
            </List>

            <Banner tone="warning">
              <p>
                <strong>Important:</strong> Flowmend ONLY sets metafields. The{' '}
                <code>write_products</code> scope is required because metafields are
                accessed via the Products API, but we never modify core product data.
              </p>
            </Banner>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Scopes We Do NOT Request
            </Text>
            <Text as="p" variant="bodyMd">
              Flowmend explicitly does not request the following scopes:
            </Text>
            <List>
              <List.Item>
                <code>read_customers</code> or <code>write_customers</code> - We do not
                access customer PII
              </List.Item>
              <List.Item>
                <code>read_orders</code> or <code>write_orders</code> - We do not access
                order data
              </List.Item>
              <List.Item>
                <code>read_inventory</code> or <code>write_inventory</code> - We do not
                touch inventory
              </List.Item>
              <List.Item>
                <code>read_all_orders</code> - We do not need historical order access
              </List.Item>
              <List.Item>
                <code>read_content</code> or <code>write_content</code> - We do not modify
                pages or blog posts
              </List.Item>
              <List.Item>
                <code>read_script_tags</code> or <code>write_script_tags</code> - We do not
                inject scripts
              </List.Item>
            </List>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              How We Protect Your Data
            </Text>
            <List>
              <List.Item>
                <strong>Encrypted Storage:</strong> OAuth access tokens are encrypted at
                rest in our database
              </List.Item>
              <List.Item>
                <strong>HTTPS Only:</strong> All API requests use TLS encryption
              </List.Item>
              <List.Item>
                <strong>No Third-Party Sharing:</strong> We never share your access token
                or data with third parties
              </List.Item>
              <List.Item>
                <strong>Scope Validation:</strong> We verify scopes on every API request
              </List.Item>
              <List.Item>
                <strong>Automatic Cleanup:</strong> Access tokens are deleted when you
                uninstall the app
              </List.Item>
            </List>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Questions?
            </Text>
            <Text as="p" variant="bodyMd">
              If you have questions about our scope usage or data handling practices,
              please visit our{' '}
              <a href="/app/support" style={{ textDecoration: 'underline' }}>
                Support page
              </a>{' '}
              or contact us at <strong>support@flowmend.app</strong>.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

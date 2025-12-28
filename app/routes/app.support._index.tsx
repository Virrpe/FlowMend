/**
 * Support & Contact Page
 * Route: /app/support
 *
 * Provides support resources and contact information for merchants.
 * Required for Shopify App Store approval.
 */

import { Page, Card, BlockStack, Text, List, InlineStack, Icon } from '@shopify/polaris';
import { EmailIcon, QuestionCircleIcon } from '@shopify/polaris-icons';

export default function SupportPage() {
  return (
    <Page
      title="Support & Help"
      subtitle="Get help with Flowmend"
      backAction={{ url: '/app/jobs' }}
    >
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <InlineStack gap="200" blockAlign="center">
              <Icon source={EmailIcon} tone="base" />
              <Text as="h2" variant="headingMd">
                Contact Support
              </Text>
            </InlineStack>
            <Text as="p" variant="bodyMd">
              Our support team is here to help you with any questions or issues.
            </Text>
            <List>
              <List.Item>
                <strong>Email:</strong>{' '}
                <a href="mailto:support@flowmend.app" style={{ textDecoration: 'underline' }}>
                  support@flowmend.app
                </a>{' '}
                (placeholder - update with your real support email)
              </List.Item>
              <List.Item>
                <strong>Response Time:</strong> We typically respond within 24 hours on
                business days.
              </List.Item>
            </List>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <InlineStack gap="200" blockAlign="center">
              <Icon source={QuestionCircleIcon} tone="base" />
              <Text as="h2" variant="headingMd">
                Common Questions
              </Text>
            </InlineStack>

            <BlockStack gap="300">
              <BlockStack gap="100">
                <Text as="h3" variant="headingSm">
                  How do I use Flowmend with Shopify Flow?
                </Text>
                <Text as="p" variant="bodyMd">
                  Flowmend adds a custom action to Shopify Flow called "Bulk Set Metafield
                  (by query)". Create a new Flow, add a trigger, then search for Flowmend
                  in the actions list. Check the{' '}
                  <a href="/app/templates" style={{ textDecoration: 'underline' }}>
                    Templates page
                  </a>{' '}
                  for example workflows.
                </Text>
              </BlockStack>

              <BlockStack gap="100">
                <Text as="h3" variant="headingSm">
                  What's the difference between dry-run and live mode?
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Dry-run mode</strong> (default) counts how many products match
                  your query without modifying anything. <strong>Live mode</strong>{' '}
                  actually sets the metafield values. Always test with dry-run first!
                </Text>
              </BlockStack>

              <BlockStack gap="100">
                <Text as="h3" variant="headingSm">
                  What if my job fails?
                </Text>
                <Text as="p" variant="bodyMd">
                  Check the job detail page for an error preview. Common issues include
                  invalid query syntax, network timeouts, or metafield type mismatches.
                  Jobs automatically retry up to 3 times with backoff.
                </Text>
              </BlockStack>

              <BlockStack gap="100">
                <Text as="h3" variant="headingSm">
                  How many products can I update at once?
                </Text>
                <Text as="p" variant="bodyMd">
                  Flowmend can handle up to 100,000 products per job. The default limit
                  is 10,000. Large jobs may take 30-60 minutes to complete.
                </Text>
              </BlockStack>

              <BlockStack gap="100">
                <Text as="h3" variant="headingSm">
                  What API scopes does Flowmend require?
                </Text>
                <Text as="p" variant="bodyMd">
                  Flowmend requires <code>read_products</code> and{' '}
                  <code>write_products</code>. See the{' '}
                  <a href="/app/scopes" style={{ textDecoration: 'underline' }}>
                    Scopes Justification
                  </a>{' '}
                  page for details.
                </Text>
              </BlockStack>

              <BlockStack gap="100">
                <Text as="h3" variant="headingSm">
                  How do I cancel my subscription?
                </Text>
                <Text as="p" variant="bodyMd">
                  Visit the{' '}
                  <a href="/app/billing" style={{ textDecoration: 'underline' }}>
                    Billing page
                  </a>{' '}
                  and click "Cancel Subscription". You can cancel anytime during your
                  trial without being charged.
                </Text>
              </BlockStack>
            </BlockStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Additional Resources
            </Text>
            <List>
              <List.Item>
                <a href="/app/templates" style={{ textDecoration: 'underline' }}>
                  Flow Templates
                </a>{' '}
                - Pre-built examples for common use cases
              </List.Item>
              <List.Item>
                <a href="/app/privacy" style={{ textDecoration: 'underline' }}>
                  Privacy Policy & Data Handling
                </a>{' '}
                - How we protect your data
              </List.Item>
              <List.Item>
                <a
                  href="https://shopify.dev/docs/api/usage/search-syntax"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline' }}
                >
                  Shopify Search Syntax Guide
                </a>{' '}
                - Learn how to write product queries
              </List.Item>
              <List.Item>
                <a
                  href="https://shopify.dev/docs/apps/custom-data/metafields"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline' }}
                >
                  Shopify Metafields Documentation
                </a>{' '}
                - Understand metafield types and structure
              </List.Item>
            </List>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

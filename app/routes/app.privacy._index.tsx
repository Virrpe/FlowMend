/**
 * Privacy Policy & Data Handling
 * Route: /app/privacy
 *
 * Required for Shopify App Store approval.
 * Explains what data is collected, how it's used, and retention policies.
 */

import { Page, Card, BlockStack, Text, List, Divider } from '@shopify/polaris';

export default function PrivacyPage() {
  return (
    <Page
      title="Privacy Policy & Data Handling"
      subtitle="Last updated: December 27, 2025"
      backAction={{ url: '/app/jobs' }}
    >
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Overview
            </Text>
            <Text as="p" variant="bodyMd">
              Flowmend is committed to protecting your privacy and handling your data
              responsibly. This policy explains what data we collect, how we use it, and
              how long we retain it.
            </Text>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              What Data We Collect
            </Text>
            <Text as="p" variant="bodyMd">
              Flowmend collects and stores the following data:
            </Text>
            <List>
              <List.Item>
                <strong>Shop Information:</strong> Your Shopify shop domain, OAuth access
                token (encrypted), and granted API scopes.
              </List.Item>
              <List.Item>
                <strong>Job Records:</strong> Query strings, metafield namespace/key/value,
                job status, and result counts (matched, updated, failed products).
              </List.Item>
              <List.Item>
                <strong>Job Events:</strong> Audit logs of job processing steps with
                timestamps and status messages.
              </List.Item>
              <List.Item>
                <strong>Billing Information:</strong> Subscription status, plan name, and
                trial dates (managed by Shopify).
              </List.Item>
            </List>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              What Data We Do NOT Collect
            </Text>
            <List>
              <List.Item>
                <strong>No Product Data:</strong> We do not store product titles,
                descriptions, prices, or inventory levels.
              </List.Item>
              <List.Item>
                <strong>No Customer PII:</strong> We do not access or store customer names,
                emails, addresses, or payment information.
              </List.Item>
              <List.Item>
                <strong>No Order Data:</strong> We do not access order information.
              </List.Item>
              <List.Item>
                <strong>No Tracking:</strong> We do not use analytics, cookies, or
                third-party tracking scripts.
              </List.Item>
            </List>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              How We Use Your Data
            </Text>
            <List>
              <List.Item>
                <strong>Execute Bulk Operations:</strong> We use your OAuth token to query
                products and set metafields via Shopify's Bulk Operations API.
              </List.Item>
              <List.Item>
                <strong>Show Job History:</strong> We display your job history in the admin
                UI so you can track bulk operations.
              </List.Item>
              <List.Item>
                <strong>Error Reporting:</strong> We store the first 50 error lines from
                failed jobs to help you debug issues.
              </List.Item>
              <List.Item>
                <strong>Billing:</strong> We use Shopify's native billing API to manage
                subscriptions.
              </List.Item>
            </List>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Data Retention
            </Text>
            <List>
              <List.Item>
                <strong>Active Shops:</strong> Job records are retained indefinitely while
                your shop is installed.
              </List.Item>
              <List.Item>
                <strong>Uninstalled Shops:</strong> When you uninstall Flowmend, your shop
                record is marked as uninstalled. All job data is deleted after 30 days.
              </List.Item>
              <List.Item>
                <strong>Error Logs:</strong> Error previews are limited to 10KB per job and
                deleted with the job record.
              </List.Item>
            </List>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Data Security
            </Text>
            <List>
              <List.Item>
                <strong>Encryption:</strong> OAuth access tokens are encrypted at rest in
                our database.
              </List.Item>
              <List.Item>
                <strong>HTTPS Only:</strong> All communication with Flowmend uses TLS
                encryption.
              </List.Item>
              <List.Item>
                <strong>Access Control:</strong> Only your shop can access your job data.
                Shop isolation is enforced at the database level.
              </List.Item>
              <List.Item>
                <strong>No Third-Party Sharing:</strong> We do not share your data with
                third parties.
              </List.Item>
            </List>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Your Rights
            </Text>
            <List>
              <List.Item>
                <strong>Access Your Data:</strong> View all job records in the admin UI at
                any time.
              </List.Item>
              <List.Item>
                <strong>Delete Your Data:</strong> Uninstall Flowmend to trigger automatic
                deletion after 30 days.
              </List.Item>
              <List.Item>
                <strong>Export Your Data:</strong> Contact support for a data export
                (JSONL format).
              </List.Item>
            </List>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Contact & Support
            </Text>
            <Text as="p" variant="bodyMd">
              If you have questions about this privacy policy or data handling practices,
              please contact us:
            </Text>
            <List>
              <List.Item>
                Email: <strong>support@flowmend.app</strong> (placeholder - update with
                your real support email)
              </List.Item>
              <List.Item>
                Support Page:{' '}
                <a href="/app/support" style={{ textDecoration: 'underline' }}>
                  /app/support
                </a>
              </List.Item>
            </List>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="200">
            <Text as="h2" variant="headingMd">
              Updates to This Policy
            </Text>
            <Text as="p" variant="bodyMd">
              We may update this privacy policy from time to time. We will notify you of
              material changes via email or in-app notification.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

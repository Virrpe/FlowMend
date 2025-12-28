/**
 * Job Detail Screen
 * Route: /app/jobs/:id
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import {
  Page,
  Card,
  Text,
  Badge,
  BlockStack,
  InlineStack,
  Divider,
  Banner,
  Button,
} from '@shopify/polaris';
import { authenticate } from '~/shopify.server';
import prisma from '~/db/client.server';
import { requireBilling } from '~/billing/middleware.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shopId = session.shop!;
  const accessToken = session.accessToken!;
  const jobId = params.id!;

  // Enforce billing (redirects to /app/billing if no active subscription)
  await requireBilling(request, shopId, accessToken);

  const job = await prisma.job.findFirst({
    where: { id: jobId, shopId },
    include: {
      events: {
        orderBy: { createdAt: 'asc' },
        take: 50,
      },
    },
  });

  if (!job) {
    throw new Response('Job not found', { status: 404 });
  }

  return json({ job });
}

export default function JobDetailPage() {
  const { job } = useLoaderData<typeof loader>();

  const statusBadge = (
    <Badge
      tone={
        job.status === 'COMPLETED'
          ? 'success'
          : job.status === 'FAILED'
          ? 'critical'
          : job.status === 'RUNNING'
          ? 'attention'
          : 'info'
      }
    >
      {job.status}
    </Badge>
  );

  const durationMs = job.updatedAt
    ? new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime()
    : null;
  const durationSec = durationMs ? Math.round(durationMs / 1000) : null;

  return (
    <Page
      title={`Job ${job.id.substring(0, 8)}`}
      subtitle={`Flowmend bulk operation`}
      backAction={{ url: '/app/jobs' }}
      secondaryActions={[
        {
          content: 'View Guide',
          url: '/app/guide',
        },
        {
          content: 'View Templates',
          url: '/app/templates',
        },
      ]}
    >
      <BlockStack gap="500">
        {/* Status Banner */}
        {job.status === 'FAILED' && job.errorPreview && (
          <Banner title="Job failed" tone="critical">
            <p>{job.errorPreview.split('\n')[0]}</p>
          </Banner>
        )}
        {job.status === 'COMPLETED' && job.dryRun && (
          <Banner title="Dry-run completed" tone="success">
            <p>
              Found {job.matchedCount} matching products. No changes were made. To apply
              changes, create a new Flow with dry_run=false.
            </p>
          </Banner>
        )}
        {job.status === 'COMPLETED' && !job.dryRun && job.failedCount === 0 && (
          <Banner title="Job completed successfully" tone="success">
            <p>
              Updated {job.updatedCount} products with metafield {job.namespace}.{job.key}
            </p>
          </Banner>
        )}

        {/* Job Summary */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Job Summary
            </Text>
            <Divider />

            <InlineStack gap="200" blockAlign="center">
              <Text as="span" fontWeight="semibold">
                Status:
              </Text>
              {statusBadge}
              {job.dryRun && <Badge tone="info">Dry-run</Badge>}
            </InlineStack>

            <div>
              <Text as="p" fontWeight="semibold">
                Query:
              </Text>
              <Text as="p" tone="subdued">
                {job.queryString}
              </Text>
            </div>

            <div>
              <Text as="p" fontWeight="semibold">
                Metafield:
              </Text>
              <Text as="p" tone="subdued">
                {job.namespace}.{job.key} ({job.type})
              </Text>
            </div>

            <div>
              <Text as="p" fontWeight="semibold">
                Value:
              </Text>
              <Text as="p" tone="subdued">
                {job.value.length > 100
                  ? job.value.substring(0, 100) + '...'
                  : job.value}
              </Text>
            </div>

            <div>
              <Text as="p" fontWeight="semibold">
                Max Items:
              </Text>
              <Text as="p" tone="subdued">
                {job.maxItems}
              </Text>
            </div>

            <div>
              <Text as="p" fontWeight="semibold">
                Created:
              </Text>
              <Text as="p" tone="subdued">
                {new Date(job.createdAt).toLocaleString()}
              </Text>
            </div>

            {durationSec !== null && (
              <div>
                <Text as="p" fontWeight="semibold">
                  Duration:
                </Text>
                <Text as="p" tone="subdued">
                  {durationSec < 60
                    ? `${durationSec} seconds`
                    : `${Math.floor(durationSec / 60)} minutes ${durationSec % 60} seconds`}
                </Text>
              </div>
            )}

            {job.bulkOperationId && (
              <div>
                <Text as="p" fontWeight="semibold">
                  Bulk Operation ID:
                </Text>
                <Text as="p" tone="subdued">
                  <code>{job.bulkOperationId}</code>
                </Text>
              </div>
            )}
          </BlockStack>
        </Card>

        {/* Results */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Results
            </Text>
            <Divider />

            {job.matchedCount !== null && (
              <div>
                <Text as="p" fontWeight="semibold">
                  Matched:
                </Text>
                <Text as="p" tone="subdued">
                  {job.matchedCount} products
                </Text>
              </div>
            )}

            {job.updatedCount !== null && (
              <div>
                <Text as="p" fontWeight="semibold">
                  Updated:
                </Text>
                <Text as="p" tone="subdued">
                  {job.updatedCount} products
                </Text>
              </div>
            )}

            {job.failedCount !== null && job.failedCount > 0 && (
              <div>
                <Text as="p" fontWeight="semibold">
                  Failed:
                </Text>
                <Text as="p" tone="critical">
                  {job.failedCount} products
                </Text>
              </div>
            )}
          </BlockStack>
        </Card>

        {/* Timeline */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Timeline
            </Text>
            <Divider />

            {job.events.map((event) => (
              <div key={event.id}>
                <Text as="p" fontWeight="semibold">
                  {event.eventType}
                </Text>
                <Text as="p" tone="subdued">
                  {event.message}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  {new Date(event.createdAt).toLocaleString()}
                </Text>
              </div>
            ))}
          </BlockStack>
        </Card>

        {/* Error Preview */}
        {job.errorPreview && (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Error Preview (first 50 errors)
              </Text>
              <Divider />
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: '#f6f6f7',
                  padding: '12px',
                  borderRadius: '4px',
                  maxHeight: '400px',
                  overflow: 'auto',
                }}
              >
                {job.errorPreview}
              </div>
            </BlockStack>
          </Card>
        )}
      </BlockStack>
    </Page>
  );
}

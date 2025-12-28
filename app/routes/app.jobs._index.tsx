/**
 * Jobs List Screen
 * Route: /app/jobs
 */

import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { Page, Card, DataTable, Badge, EmptyState, Button } from '@shopify/polaris';
import { authenticate } from '~/shopify.server';
import prisma from '~/db/client.server';
import { requireBilling } from '~/billing/middleware.server';

export async function loader({ request }: LoaderFunctionArgs) {
  // Authenticate the request
  const { session } = await authenticate.admin(request);
  const shopId = session.shop!;
  const accessToken = session.accessToken!;

  // Enforce billing (redirects to /app/billing if no active subscription)
  await requireBilling(request, shopId, accessToken);

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = 50;
  const offset = (page - 1) * limit;

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        status: true,
        queryString: true,
        namespace: true,
        key: true,
        type: true,
        matchedCount: true,
        updatedCount: true,
        failedCount: true,
        dryRun: true,
        createdAt: true,
      },
    }),
    prisma.job.count({ where: { shopId } }),
  ]);

  return json({ jobs, total, page, limit });
}

export default function JobsListPage() {
  const { jobs, total, page, limit } = useLoaderData<typeof loader>();

  if (jobs.length === 0) {
    return (
      <Page title="Jobs">
        <EmptyState
          heading="No jobs yet"
          image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
        >
          <p>Trigger a Flowmend action from Shopify Flow to get started.</p>
          <Button url="/app/templates">View Flow Templates</Button>
        </EmptyState>
      </Page>
    );
  }

  const rows = jobs.map((job) => {
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

    const dryRunBadge = job.dryRun ? <Badge tone="info">Dry-run</Badge> : null;

    const results =
      job.updatedCount !== null
        ? `${job.updatedCount} updated / ${job.failedCount} failed`
        : job.matchedCount !== null
        ? `${job.matchedCount} matched`
        : '-';

    return [
      statusBadge,
      <div>
        <Link to={`/app/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
          {job.queryString.length > 50
            ? job.queryString.substring(0, 50) + '...'
            : job.queryString}
        </Link>
        {dryRunBadge && <div style={{ marginTop: '4px' }}>{dryRunBadge}</div>}
      </div>,
      `${job.namespace}.${job.key}`,
      results,
      new Date(job.createdAt).toLocaleString(),
    ];
  });

  return (
    <Page
      title="Jobs"
      subtitle={`${total} total jobs`}
      primaryAction={{
        content: 'View Templates',
        url: '/app/templates',
      }}
    >
      <Card>
        <DataTable
          columnContentTypes={['text', 'text', 'text', 'text', 'text']}
          headings={['Status', 'Query', 'Metafield', 'Results', 'Created']}
          rows={rows}
        />
      </Card>
    </Page>
  );
}

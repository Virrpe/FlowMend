/**
 * Run Detail Page - Job Detail with Event Timeline
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Page,
  Card,
  Badge,
  Text,
  Banner,
  Spinner,
  Layout,
  DescriptionList,
} from '@shopify/polaris';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import type { JobDetail } from '../types';

export function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fetch = useAuthenticatedFetch();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadJob(id);
    }
  }, [id]);

  async function loadJob(jobId: string) {
    try {
      setLoading(true);
      setError(null);
      const data = await fetch(`/api/jobs/${jobId}`);
      setJob(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'COMPLETED':
        return <Badge tone="success">Completed</Badge>;
      case 'RUNNING':
        return <Badge tone="info">Running</Badge>;
      case 'FAILED':
        return <Badge tone="critical">Failed</Badge>;
      case 'PENDING':
        return <Badge>Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  if (loading) {
    return (
      <Page
        title="Job Details"
        backAction={{ content: 'Runs', onAction: () => navigate('/runs') }}
      >
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spinner size="large" />
          </div>
        </Card>
      </Page>
    );
  }

  if (error || !job) {
    return (
      <Page
        title="Job Details"
        backAction={{ content: 'Runs', onAction: () => navigate('/runs') }}
      >
        <Banner tone="critical" title="Error loading job">
          <p>{error || 'Job not found'}</p>
        </Banner>
      </Page>
    );
  }


  return (
    <Page
      title={`Job ${id?.slice(0, 8)}`}
      backAction={{ content: 'Runs', onAction: () => navigate('/runs') }}
      secondaryActions={[
        {
          content: 'Refresh',
          onAction: () => loadJob(id!),
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Job Details
            </Text>
            <div style={{ marginTop: '16px' }}>
              <DescriptionList
                items={[
                  {
                    term: 'Status',
                    description: getStatusBadge(job.status),
                  },
                  {
                    term: 'Query String',
                    description: job.queryString,
                  },
                  {
                    term: 'Metafield',
                    description: `${job.namespace}.${job.key}`,
                  },
                  {
                    term: 'Type',
                    description: job.type,
                  },
                  {
                    term: 'Value',
                    description: job.value,
                  },
                  {
                    term: 'Mode',
                    description: job.dryRun ? 'Dry Run' : 'Live',
                  },
                  {
                    term: 'Max Items',
                    description: job.maxItems.toLocaleString(),
                  },
                  {
                    term: 'Created',
                    description: formatDate(job.createdAt),
                  },
                  {
                    term: 'Updated',
                    description: formatDate(job.updatedAt),
                  },
                ]}
              />
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Results
            </Text>
            <div style={{ marginTop: '16px' }}>
              <DescriptionList
                items={[
                  {
                    term: 'Products Matched',
                    description:
                      job.matchedCount !== null
                        ? job.matchedCount.toLocaleString()
                        : 'Pending',
                  },
                  {
                    term: 'Products Updated',
                    description:
                      job.updatedCount !== null
                        ? job.updatedCount.toLocaleString()
                        : 'Pending',
                  },
                  {
                    term: 'Failed',
                    description:
                      job.failedCount !== null
                        ? job.failedCount.toLocaleString()
                        : 'Pending',
                  },
                ]}
              />
            </div>
            {job.errorPreview && (
              <div style={{ marginTop: '16px' }}>
                <Banner tone="critical" title="Error Details">
                  <pre
                    style={{
                      fontSize: '12px',
                      overflow: 'auto',
                      maxHeight: '200px',
                    }}
                  >
                    {job.errorPreview}
                  </pre>
                </Banner>
              </div>
            )}
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Event Timeline
            </Text>
            <div style={{ marginTop: '16px' }}>
              {job.events.length > 0 ? (
                <div>
                  {job.events.map((event) => (
                    <div
                      key={event.id}
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid #e1e3e5',
                      }}
                    >
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {event.eventType}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {event.message}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {formatDate(event.createdAt)}
                      </Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Text as="p" tone="subdued">
                  No events yet
                </Text>
              )}
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

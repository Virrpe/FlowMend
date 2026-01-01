/**
 * Runs Page - Job List
 */

import { useState, useEffect } from 'react';
import {
  Page,
  Card,
  DataTable,
  Badge,
  Text,
  Link,
  Spinner,
  Banner,
  EmptyState,
} from '@shopify/polaris';
import { useNavigate } from 'react-router-dom';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import type { Job } from '../types';

export function Runs() {
  const fetch = useAuthenticatedFetch();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetch('/api/jobs');
      setJobs(data.jobs || []);
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

  const rows = jobs.map((job) => [
    <Link
      removeUnderline
      onClick={(event) => {
        event.preventDefault();
        navigate(`/runs/${job.id}`);
      }}
      key={job.id}
    >
      {job.id.slice(0, 8)}
    </Link>,
    getStatusBadge(job.status),
    <Text as="span" variant="bodyMd" key={`query-${job.id}`}>
      {job.queryString}
    </Text>,
    <Text as="span" variant="bodyMd" key={`ns-${job.id}`}>
      {job.namespace}.{job.key}
    </Text>,
    job.dryRun ? <Badge tone="warning">Dry Run</Badge> : <Badge>Live</Badge>,
    job.matchedCount !== null ? job.matchedCount.toLocaleString() : '-',
    job.updatedCount !== null ? job.updatedCount.toLocaleString() : '-',
    formatDate(job.createdAt),
  ]);

  if (loading) {
    return (
      <Page title="Runs">
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spinner size="large" />
          </div>
        </Card>
      </Page>
    );
  }

  if (error) {
    return (
      <Page title="Runs">
        <Banner tone="critical" title="Error loading jobs">
          <p>{error}</p>
        </Banner>
      </Page>
    );
  }

  if (jobs.length === 0) {
    return (
      <Page title="Runs">
        <Card>
          <EmptyState
            heading="No jobs yet"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>
              Jobs will appear here when you trigger a Flow action. Go to
              Shopify Flow to create your first bulk metafield operation.
            </p>
          </EmptyState>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Runs" subtitle={`${jobs.length} total jobs`}>
      <Card>
        <DataTable
          columnContentTypes={[
            'text',
            'text',
            'text',
            'text',
            'text',
            'numeric',
            'numeric',
            'text',
          ]}
          headings={[
            'Job ID',
            'Status',
            'Query',
            'Metafield',
            'Mode',
            'Matched',
            'Updated',
            'Created',
          ]}
          rows={rows}
        />
      </Card>
    </Page>
  );
}

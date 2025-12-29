/**
 * Dashboard Page - Job Stats and Recent Activity
 */

import { useState, useEffect } from 'react';
import {
  Page,
  Card,
  Text,
  Spinner,
  Banner,
  Layout,
  Grid,
} from '@shopify/polaris';
import { useNavigate } from 'react-router-dom';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import type { Job, Shop } from '../types';

export function Dashboard() {
  const fetch = useAuthenticatedFetch();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [shopData, jobsData] = await Promise.all([
        fetch('/api/me'),
        fetch('/api/jobs'),
      ]);
      setShop(shopData);
      setJobs(jobsData.jobs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Page title="Dashboard">
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
      <Page title="Dashboard">
        <Banner tone="critical" title="Error loading dashboard">
          <p>{error}</p>
        </Banner>
      </Page>
    );
  }

  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((j) => j.status === 'COMPLETED').length;
  const failedJobs = jobs.filter((j) => j.status === 'FAILED').length;
  const runningJobs = jobs.filter(
    (j) => j.status === 'RUNNING' || j.status === 'PENDING'
  ).length;

  const totalMatched = jobs.reduce(
    (sum, j) => sum + (j.matchedCount || 0),
    0
  );
  const totalUpdated = jobs.reduce(
    (sum, j) => sum + (j.updatedCount || 0),
    0
  );

  const recentJobs = jobs.slice(0, 5);

  return (
    <Page title="Dashboard" subtitle={`Welcome to FlowMend`}>
      <Layout>
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Total Jobs
                </Text>
                <Text as="p" variant="heading2xl">
                  {totalJobs}
                </Text>
              </Card>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Completed
                </Text>
                <Text as="p" variant="heading2xl" tone="success">
                  {completedJobs}
                </Text>
              </Card>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Failed
                </Text>
                <Text as="p" variant="heading2xl" tone="critical">
                  {failedJobs}
                </Text>
              </Card>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Running
                </Text>
                <Text as="p" variant="heading2xl">
                  {runningJobs}
                </Text>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        <Layout.Section>
          <Grid columns={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2 }}>
            <Grid.Cell>
              <Card>
                <Text as="h2" variant="headingMd">
                  Products Processed
                </Text>
                <div style={{ marginTop: '16px' }}>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Total Matched
                  </Text>
                  <Text as="p" variant="headingLg">
                    {totalMatched.toLocaleString()}
                  </Text>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Total Updated
                  </Text>
                  <Text as="p" variant="headingLg">
                    {totalUpdated.toLocaleString()}
                  </Text>
                </div>
              </Card>
            </Grid.Cell>

            <Grid.Cell>
              <Card>
                <Text as="h2" variant="headingMd">
                  Shop Info
                </Text>
                <div style={{ marginTop: '16px' }}>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Shop Domain
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {shop?.id}
                  </Text>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Plan
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {shop?.planName || 'Free'}
                  </Text>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Installed Since
                  </Text>
                  <Text as="p" variant="bodyMd">
                    {shop?.installedAt
                      ? new Date(shop.installedAt).toLocaleDateString()
                      : 'N/A'}
                  </Text>
                </div>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Recent Jobs
            </Text>
            <div style={{ marginTop: '16px' }}>
              {recentJobs.length > 0 ? (
                <div>
                  {recentJobs.map((job) => (
                    <div
                      key={job.id}
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid #e1e3e5',
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate(`/runs/${job.id}`)}
                    >
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {job.queryString}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {job.status} •{' '}
                        {new Date(job.createdAt).toLocaleString()}
                      </Text>
                    </div>
                  ))}
                </div>
              ) : (
                <Text as="p" tone="subdued">
                  No jobs yet. Create a Flow action to get started.
                </Text>
              )}
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

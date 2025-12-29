/**
 * Settings Page - Shop Settings and Configuration
 */

import { useState, useEffect } from 'react';
import {
  Page,
  Card,
  Text,
  Spinner,
  Banner,
  Layout,
  DescriptionList,
  Link,
} from '@shopify/polaris';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import type { Shop } from '../types';

export function Settings() {
  const fetch = useAuthenticatedFetch();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadShop();
  }, []);

  async function loadShop() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetch('/api/me');
      setShop(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Page title="Settings">
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <Spinner size="large" />
          </div>
        </Card>
      </Page>
    );
  }

  if (error || !shop) {
    return (
      <Page title="Settings">
        <Banner tone="critical" title="Error loading settings">
          <p>{error || 'Shop not found'}</p>
        </Banner>
      </Page>
    );
  }

  return (
    <Page title="Settings">
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Shop Information
            </Text>
            <div style={{ marginTop: '16px' }}>
              <DescriptionList
                items={[
                  {
                    term: 'Shop Domain',
                    description: shop.id,
                  },
                  {
                    term: 'Installed At',
                    description: new Date(shop.installedAt).toLocaleString(),
                  },
                ]}
              />
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Subscription
            </Text>
            <div style={{ marginTop: '16px' }}>
              <DescriptionList
                items={[
                  {
                    term: 'Plan',
                    description: shop.planName || 'Free',
                  },
                  {
                    term: 'Status',
                    description: shop.subscriptionStatus || 'No active subscription',
                  },
                ]}
              />
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Resources
            </Text>
            <div style={{ marginTop: '16px' }}>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li style={{ marginBottom: '8px' }}>
                  <Link url="/app/privacy" external>
                    Privacy Policy
                  </Link>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <Link url="/app/support" external>
                    Support & Help
                  </Link>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <Link
                    url="https://shopify.dev/docs/api/usage/search-syntax"
                    external
                  >
                    Shopify Search Syntax Guide
                  </Link>
                </li>
              </ul>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

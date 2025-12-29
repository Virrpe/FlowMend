/**
 * Templates Page - Query Templates and Examples
 */

import { useState, useEffect } from 'react';
import {
  Page,
  Card,
  Text,
  Spinner,
  Banner,
  Layout,
  ResourceList,
  ResourceItem,
} from '@shopify/polaris';
import { useAuthenticatedFetch } from '../hooks/useAuthenticatedFetch';
import type { Template } from '../types';

export function Templates() {
  const fetch = useAuthenticatedFetch();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetch('/api/templates');
      setTemplates(data.templates || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Page title="Templates">
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
      <Page title="Templates">
        <Banner tone="critical" title="Error loading templates">
          <p>{error}</p>
        </Banner>
      </Page>
    );
  }

  return (
    <Page
      title="Templates"
      subtitle="Example queries and metafield configurations"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <ResourceList
              resourceName={{ singular: 'template', plural: 'templates' }}
              items={templates}
              renderItem={(template) => {
                const { id, name, description, queryString, namespace, key, type, example } = template;
                return (
                  <ResourceItem id={id} onClick={() => {}}>
                    <div style={{ padding: '8px 0' }}>
                      <Text as="h3" variant="headingMd">
                        {name}
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {description}
                      </Text>
                      <div style={{ marginTop: '12px' }}>
                        <div style={{
                          background: '#f6f6f7',
                          padding: '12px',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          fontSize: '12px'
                        }}>
                          <div><strong>Query:</strong> {queryString}</div>
                          <div><strong>Metafield:</strong> {namespace}.{key}</div>
                          <div><strong>Type:</strong> {type}</div>
                          <div><strong>Example Value:</strong> {example}</div>
                        </div>
                      </div>
                    </div>
                  </ResourceItem>
                );
              }}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

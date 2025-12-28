/**
 * Billing Page
 * Route: /app/billing
 *
 * Shows current subscription status, plan details, and allows merchants
 * to subscribe or manage their subscription.
 */

import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, Form, useNavigation } from '@remix-run/react';
import {
  Page,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Banner,
  List,
  Divider,
} from '@shopify/polaris';
import { authenticate } from '~/shopify.server';
import { checkBillingStatus } from '~/billing/middleware.server';
import {
  createSubscription,
  cancelSubscription,
} from '~/billing/subscription.server';
import { BILLING_CONFIG } from '~/billing/config.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop!;
  const accessToken = session.accessToken!;

  const billingStatus = await checkBillingStatus(shopDomain, accessToken);

  return json({
    shopDomain,
    billingStatus,
    plan: BILLING_CONFIG.plan,
    features: BILLING_CONFIG.features,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop!;
  const accessToken = session.accessToken!;

  const formData = await request.formData();
  const action = formData.get('action');

  if (action === 'subscribe') {
    // Create a new subscription
    const returnUrl = `https://${process.env.SHOPIFY_APP_URL}/app/billing/callback`;

    const { confirmationUrl } = await createSubscription(
      shopDomain,
      accessToken,
      returnUrl
    );

    // Redirect to Shopify billing confirmation page
    return redirect(confirmationUrl);
  }

  if (action === 'cancel') {
    const subscriptionId = formData.get('subscriptionId') as string;

    await cancelSubscription(shopDomain, accessToken, subscriptionId);

    return redirect('/app/billing');
  }

  return json({ error: 'Invalid action' }, { status: 400 });
}

export default function BillingPage() {
  const { billingStatus, plan, features } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isLoading = navigation.state === 'submitting';

  const hasActiveSubscription = billingStatus.hasActiveSubscription;
  const isDev = billingStatus.subscriptionStatus === 'DEV_BYPASS';
  const trialEndsAt = billingStatus.trialEndsAt
    ? new Date(billingStatus.trialEndsAt)
    : null;

  const isOnTrial =
    hasActiveSubscription &&
    trialEndsAt &&
    trialEndsAt > new Date() &&
    !isDev;

  return (
    <Page
      title="Billing"
      subtitle="Manage your Flowmend subscription"
      backAction={{ url: '/app/jobs' }}
    >
      <BlockStack gap="500">
        {/* Development Mode Banner */}
        {isDev && (
          <Banner tone="info">
            <p>
              <strong>Development Mode:</strong> Billing is bypassed for development stores.
              This app is fully functional without a subscription.
            </p>
          </Banner>
        )}

        {/* Active Subscription */}
        {hasActiveSubscription && !isDev && (
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="start">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Current Plan
                  </Text>
                  <Text as="p" variant="bodyLg" fontWeight="bold">
                    {plan.name}
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    ${plan.price} / month
                  </Text>
                </BlockStack>
                <Form method="post">
                  <input type="hidden" name="action" value="cancel" />
                  <Button submit variant="plain" tone="critical" loading={isLoading}>
                    Cancel Subscription
                  </Button>
                </Form>
              </InlineStack>

              {isOnTrial && trialEndsAt && (
                <Banner tone="success">
                  <p>
                    <strong>Free Trial Active!</strong> Your trial ends on{' '}
                    {trialEndsAt.toLocaleDateString()}. You won't be charged until then.
                  </p>
                </Banner>
              )}

              <Divider />

              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Included Features
                </Text>
                <List>
                  {features.map((feature) => (
                    <List.Item key={feature}>{feature}</List.Item>
                  ))}
                </List>
              </BlockStack>
            </BlockStack>
          </Card>
        )}

        {/* No Subscription - Subscribe CTA */}
        {!hasActiveSubscription && !isDev && (
          <Card>
            <BlockStack gap="400">
              <BlockStack gap="200">
                <Text as="h2" variant="headingLg">
                  Subscribe to Flowmend {plan.name}
                </Text>
                <Text as="p" variant="bodyLg">
                  ${plan.price} / month
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  {plan.trialDays}-day free trial • Cancel anytime
                </Text>
              </BlockStack>

              <Divider />

              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  What's Included
                </Text>
                <List>
                  {features.map((feature) => (
                    <List.Item key={feature}>{feature}</List.Item>
                  ))}
                </List>
              </BlockStack>

              <Divider />

              <Form method="post">
                <input type="hidden" name="action" value="subscribe" />
                <Button submit variant="primary" size="large" loading={isLoading}>
                  Start {String(plan.trialDays)}-Day Free Trial
                </Button>
              </Form>

              <Text as="p" variant="bodySm" tone="subdued">
                You won't be charged until your trial ends. You can cancel at any time
                during the trial period without being charged.
              </Text>
            </BlockStack>
          </Card>
        )}

        {/* Help Text */}
        <Card>
          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">
              Need Help?
            </Text>
            <Text as="p" variant="bodyMd">
              If you have questions about billing or need to change your plan, visit our{' '}
              <a href="/app/support" style={{ textDecoration: 'underline' }}>
                Support page
              </a>
              .
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

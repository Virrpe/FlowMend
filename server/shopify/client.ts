/**
 * Shopify GraphQL Client Wrapper
 */

import { GraphQLClient, ClientError } from 'graphql-request';
import logger from '../utils/logger.js';

/**
 * Create GraphQL client for Shopify Admin API
 *
 * @param accessToken - Shop's OAuth access token
 * @param shopDomain - Shopify shop domain
 * @returns GraphQL client instance
 */
export function createShopifyClient(accessToken: string, shopDomain: string): GraphQLClient {
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-10';
  const endpoint = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;

  return new GraphQLClient(endpoint, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Execute GraphQL query with retry logic for rate limits
 *
 * @param client - GraphQL client
 * @param query - GraphQL query string
 * @param variables - Query variables
 * @returns Query result
 */
export async function executeQuery<T>(
  client: GraphQLClient,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const maxRetries = 5;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await client.request<T>(query, variables);
      return result;
    } catch (error) {
      // Handle rate limiting (429) and transient errors
      if (error instanceof ClientError) {
        const status = error.response.status;

        // 429 Rate limit - exponential backoff
        if (status === 429) {
          const retryAfter = ((error.response.headers as any)?.get || (() => null))('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;

          logger.warn({
            attempt,
            delay,
            retryAfter
          }, 'Rate limited by Shopify, retrying');

          await sleep(delay);
          attempt++;
          continue;
        }

        // 5xx Server errors - retry with backoff
        if (status >= 500 && status < 600) {
          const delay = Math.pow(2, attempt) * 1000;
          logger.warn({
            attempt,
            delay,
            status
          }, 'Shopify server error, retrying');

          await sleep(delay);
          attempt++;
          continue;
        }
      }

      // Non-retryable error - throw immediately
      logger.error({ error, query, variables }, 'GraphQL query failed');
      throw error;
    }
  }

  throw new Error(`Max retries (${maxRetries}) exceeded for GraphQL query`);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

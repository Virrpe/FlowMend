/**
 * Session token utilities for App Bridge authentication
 */

import { getSessionToken } from '@shopify/app-bridge/utilities';

/**
 * Get a fresh session token from App Bridge
 */
export async function getToken(app: any): Promise<string> {
  return await getSessionToken(app);
}

/**
 * Make an authenticated fetch request to the backend API
 */
export async function authenticatedFetch(
  app: any,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken(app);

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  return fetch(url, {
    ...options,
    headers,
  });
}

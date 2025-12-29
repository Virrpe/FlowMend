/**
 * Hook for making authenticated API requests
 */

import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticatedFetch } from '../utils/sessionToken';

export function useAuthenticatedFetch() {
  const app = useAppBridge();

  return async (url: string, options?: RequestInit) => {
    const response = await authenticatedFetch(app, url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  };
}

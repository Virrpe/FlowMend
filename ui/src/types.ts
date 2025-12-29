/**
 * TypeScript types for FlowMend API
 */

export interface Shop {
  id: string;
  installedAt: string;
  subscriptionStatus: string | null;
  planName: string | null;
}

export interface Job {
  id: string;
  shopId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  queryString: string;
  namespace: string;
  key: string;
  type: string;
  value: string;
  dryRun: boolean;
  maxItems: number;
  matchedCount: number | null;
  updatedCount: number | null;
  failedCount: number | null;
  errorPreview: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobEvent {
  id: number;
  jobId: string;
  eventType: string;
  message: string;
  metadata: string | null;
  createdAt: string;
}

export interface JobDetail extends Job {
  events: JobEvent[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  queryString: string;
  namespace: string;
  key: string;
  type: string;
  example: string;
}

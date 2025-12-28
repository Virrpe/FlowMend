/**
 * TypeScript Types and Enums
 */

// ============================================================================
// Metafield Types
// ============================================================================

export enum MetafieldType {
  SINGLE_LINE_TEXT_FIELD = 'single_line_text_field',
  BOOLEAN = 'boolean',
  NUMBER_INTEGER = 'number_integer',
  JSON = 'json',
}

// ============================================================================
// Flow Action Request
// ============================================================================

export interface FlowActionInput {
  query_string: string;
  namespace: string;
  key: string;
  type: MetafieldType;
  value: string;
  dry_run?: boolean;
  max_items?: number;
}

export interface FlowActionRequest {
  input: FlowActionInput;
  shop: string; // Shopify shop domain
}

// ============================================================================
// Job Types
// ============================================================================

export interface JobCreateInput {
  shopId: string;
  queryString: string;
  namespace: string;
  key: string;
  type: string;
  value: string;
  dryRun: boolean;
  maxItems: number;
}

export interface JobResult {
  bulkOperationId: string;
  updatedCount: number;
  failedCount: number;
  errorPreview: string | null;
}

// ============================================================================
// Bulk Operation Types
// ============================================================================

export interface BulkOperationStatus {
  id: string;
  status: 'CREATED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELED';
  errorCode?: string;
  objectCount?: number;
  fileSize?: number;
  url?: string;
  partialDataUrl?: string;
}

// ============================================================================
// JSONL Types
// ============================================================================

export interface MetafieldInput {
  namespace: string;
  key: string;
  type: string;
  value: string;
}

export interface MetafieldsSetInput {
  input: {
    id: string; // Product GID
    metafields: MetafieldInput[];
  };
}

export interface MetafieldsSetPayload {
  __typename: 'MetafieldsSetPayload';
  metafields: Array<{ id: string }>;
  userErrors: Array<{
    field: string[];
    message: string;
    code?: string;
  }>;
}

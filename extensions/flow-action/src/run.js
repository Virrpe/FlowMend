/**
 * Flow Action Extension Entry Point
 *
 * This file is executed by Shopify Flow when the action is triggered.
 * It calls the app's webhook endpoint with the action parameters.
 *
 * NOTE: In practice, Shopify Flow directly calls the runtime_url specified
 * in shopify.extension.toml, so this file is mostly a placeholder for
 * documentation purposes.
 */

// TODO: Implement if custom client-side logic is needed
// For MVP, all logic is handled server-side at /webhooks/flow-action

export default function run(input) {
  // Flow will POST to runtime_url with input params
  // No client-side processing needed for MVP
  console.log('Flow action triggered with input:', input);
}

/**
 * HMAC Verification for Shopify Flow Action Requests
 */

import crypto from 'crypto';

/**
 * Verify HMAC signature from Shopify Flow request
 *
 * @param bodyRaw - Raw request body as string
 * @param signature - Base64-encoded HMAC signature from X-Shopify-Hmac-Sha256 header
 * @param secret - Shopify API secret
 * @returns True if signature is valid
 */
export function verifyHmac(
  bodyRaw: string,
  signature: string,
  secret: string
): boolean {
  // TODO: Implement HMAC verification
  // 1. Compute HMAC-SHA256 of body with secret
  // 2. Base64 encode the result
  // 3. Timing-safe compare with provided signature

  const computedHash = crypto
    .createHmac('sha256', secret)
    .update(bodyRaw, 'utf8')
    .digest('base64');

  const signatureBuffer = Buffer.from(signature, 'base64');
  const hashBuffer = Buffer.from(computedHash, 'base64');

  // Prevent timing attacks
  if (signatureBuffer.length !== hashBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, hashBuffer);
}

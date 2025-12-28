/**
 * HMAC Verification Tests
 */

import { describe, it, expect } from 'vitest';
import { verifyHmac } from '../hmac.js';
import crypto from 'crypto';

describe('verifyHmac', () => {
  const secret = 'test-secret-key';

  it('verifies valid HMAC signature', () => {
    const body = JSON.stringify({ test: 'data' });
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');

    const isValid = verifyHmac(body, signature, secret);
    expect(isValid).toBe(true);
  });

  it('rejects invalid HMAC signature', () => {
    const body = JSON.stringify({ test: 'data' });
    const invalidSignature = 'invalid-signature';

    const isValid = verifyHmac(body, invalidSignature, secret);
    expect(isValid).toBe(false);
  });

  it('rejects HMAC with wrong secret', () => {
    const body = JSON.stringify({ test: 'data' });
    const signature = crypto
      .createHmac('sha256', 'wrong-secret')
      .update(body, 'utf8')
      .digest('base64');

    const isValid = verifyHmac(body, signature, secret);
    expect(isValid).toBe(false);
  });

  it('rejects HMAC for modified body', () => {
    const body = JSON.stringify({ test: 'data' });
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');

    const modifiedBody = JSON.stringify({ test: 'modified' });

    const isValid = verifyHmac(modifiedBody, signature, secret);
    expect(isValid).toBe(false);
  });
});

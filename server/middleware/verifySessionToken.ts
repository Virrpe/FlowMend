/**
 * Session Token Verification Middleware
 *
 * Verifies Shopify App Bridge session tokens for authenticated API requests.
 * This middleware:
 * 1. Extracts the Bearer token from Authorization header
 * 2. Verifies the JWT signature using Shopify API secret
 * 3. Extracts shop domain from the token payload
 * 4. Attaches shop domain to req.shopDomain for downstream handlers
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface SessionTokenPayload {
  iss: string;  // Issuer (shop domain with https://)
  dest: string; // Destination (shop domain with https://)
  aud: string;  // Audience (API key)
  sub: string;  // Subject (user ID)
  exp: number;  // Expiration
  nbf: number;  // Not before
  iat: number;  // Issued at
  jti: string;  // JWT ID
  sid: string;  // Session ID
}

declare global {
  namespace Express {
    interface Request {
      shopDomain?: string;
    }
  }
}

export function verifySessionToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify JWT signature
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    if (!apiSecret) {
      throw new Error('SHOPIFY_API_SECRET not configured');
    }

    const payload = jwt.verify(token, apiSecret, {
      algorithms: ['HS256'],
    }) as SessionTokenPayload;

    // Extract shop domain from 'dest' field (format: "https://shop.myshopify.com")
    const shopDomain = payload.dest.replace('https://', '');

    // Attach shop domain to request
    req.shopDomain = shopDomain;

    next();
  } catch (error: any) {
    console.error('Session token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

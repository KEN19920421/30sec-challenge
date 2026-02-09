import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '../shared/errors';

/**
 * Shape of the JWT payload stored inside access tokens.
 * Must match whatever your auth service signs.
 */
interface JwtPayload {
  sub: string;        // user id
  email: string;
  role: string;
  subscription_tier: string;
  iat?: number;
  exp?: number;
}

/**
 * Reads the JWT secret from the environment, throwing at startup if absent.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  return secret;
}

/**
 * Extracts a Bearer token from the Authorization header.
 * Returns `null` when the header is missing or malformed.
 */
function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}

/**
 * Verifies the token and attaches the decoded user to `req.user`.
 * Returns `true` if the token is valid, `false` otherwise.
 */
function verifyAndAttach(req: Request, token: string): boolean {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      subscription_tier: decoded.subscription_tier,
    };

    return true;
  } catch {
    return false;
  }
}

/**
 * Authentication middleware that **requires** a valid JWT.
 *
 * - Extracts the `Bearer` token from the `Authorization` header.
 * - Verifies the token against `JWT_SECRET`.
 * - Attaches the decoded user to `req.user`.
 * - Throws `AuthenticationError` if the token is missing or invalid.
 *
 * @example
 * ```ts
 * router.get('/me', authenticate, meController.show);
 * ```
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractBearerToken(req);

  if (!token) {
    next(new AuthenticationError('Missing authentication token'));
    return;
  }

  if (!verifyAndAttach(req, token)) {
    next(new AuthenticationError('Invalid or expired authentication token'));
    return;
  }

  next();
}

/**
 * Optional authentication middleware.
 *
 * Behaves identically to `authenticate` when a valid token is present,
 * but **does not fail** if the token is missing or invalid -- it simply
 * continues without setting `req.user`.
 *
 * Useful for endpoints that return richer data for logged-in users while
 * still being accessible to anonymous visitors.
 *
 * @example
 * ```ts
 * router.get('/posts/:id', optionalAuth, postController.show);
 * ```
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = extractBearerToken(req);

  if (token) {
    verifyAndAttach(req, token);
    // Intentionally ignore failure -- user stays undefined
  }

  next();
}

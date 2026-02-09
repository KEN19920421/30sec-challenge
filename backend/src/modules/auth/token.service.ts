import jwt, { JsonWebTokenError, SignOptions, TokenExpiredError } from 'jsonwebtoken';
import { jwtConfig } from '../../config/jwt';
import { AuthenticationError } from '../../shared/errors';

/**
 * Payload embedded in every access token.
 */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
  subscription_tier: string;
}

/**
 * Payload embedded in every refresh token.
 */
export interface RefreshTokenPayload {
  sub: string;
  type: 'refresh';
}

/**
 * Shape returned when generating a token pair.
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

/**
 * Generates a signed JWT access token.
 */
export function generateAccessToken(payload: {
  id: string;
  email: string;
  role: string;
  subscription_tier: string;
}): string {
  return jwt.sign(
    {
      sub: payload.id,
      email: payload.email,
      role: payload.role,
      subscription_tier: payload.subscription_tier,
    } satisfies AccessTokenPayload,
    jwtConfig.accessSecret,
    {
      expiresIn: jwtConfig.accessExpiresIn as SignOptions['expiresIn'],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    },
  );
}

/**
 * Generates a signed JWT refresh token.
 */
export function generateRefreshToken(payload: { id: string }): string {
  return jwt.sign(
    {
      sub: payload.id,
      type: 'refresh',
    } satisfies RefreshTokenPayload,
    jwtConfig.refreshSecret,
    {
      expiresIn: jwtConfig.refreshExpiresIn as SignOptions['expiresIn'],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    },
  );
}

/**
 * Verifies an access token and returns its decoded payload.
 * Throws `AuthenticationError` when the token is invalid or expired.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(token, jwtConfig.accessSecret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
    return decoded as AccessTokenPayload;
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new AuthenticationError('Access token has expired');
    }
    if (err instanceof JsonWebTokenError) {
      throw new AuthenticationError('Invalid access token');
    }
    throw new AuthenticationError('Access token verification failed');
  }
}

/**
 * Verifies a refresh token and returns its decoded payload.
 * Throws `AuthenticationError` when the token is invalid or expired.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, jwtConfig.refreshSecret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });

    const payload = decoded as RefreshTokenPayload;

    if (payload.type !== 'refresh') {
      throw new AuthenticationError('Invalid token type');
    }

    return payload;
  } catch (err) {
    if (err instanceof AuthenticationError) {
      throw err;
    }
    if (err instanceof TokenExpiredError) {
      throw new AuthenticationError('Refresh token has expired');
    }
    if (err instanceof JsonWebTokenError) {
      throw new AuthenticationError('Invalid refresh token');
    }
    throw new AuthenticationError('Refresh token verification failed');
  }
}

/**
 * Generates an access + refresh token pair for the given user.
 */
export function generateTokenPair(user: {
  id: string;
  email: string;
  role: string;
  subscription_tier: string;
}): TokenPair {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken({ id: user.id }),
    expiresIn: jwtConfig.accessExpiresIn,
  };
}

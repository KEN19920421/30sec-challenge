/**
 * Unit tests for auth services -- password hashing and JWT token operations.
 *
 * These tests are purely in-process; no database or network is required.
 * Environment variables needed by the token service are set in setup.ts.
 */

// Ensure test env vars are loaded before importing modules that read them
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-32chars!';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

import jwt from 'jsonwebtoken';
import {
  hashPassword,
  comparePassword,
} from '../../src/modules/auth/password.service';
import {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateTokenPair,
} from '../../src/modules/auth/token.service';
import { AuthenticationError } from '../../src/shared/errors';

// ---------------------------------------------------------------------------
// Password Service
// ---------------------------------------------------------------------------

describe('Password Service', () => {
  const plaintext = 'MyS3cur3P@ssword!';

  describe('hashPassword()', () => {
    it('returns a bcrypt hash that is different from the plaintext', async () => {
      const hash = await hashPassword(plaintext);
      expect(hash).not.toBe(plaintext);
      // bcrypt hashes always start with $2a$ or $2b$
      expect(hash).toMatch(/^\$2[aby]\$/);
    });

    it('returns a different hash each time (unique salt)', async () => {
      const hash1 = await hashPassword(plaintext);
      const hash2 = await hashPassword(plaintext);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword()', () => {
    it('returns true for the correct password', async () => {
      const hash = await hashPassword(plaintext);
      const result = await comparePassword(plaintext, hash);
      expect(result).toBe(true);
    });

    it('returns false for an incorrect password', async () => {
      const hash = await hashPassword(plaintext);
      const result = await comparePassword('WrongPassword1', hash);
      expect(result).toBe(false);
    });

    it('returns false for an empty password against a valid hash', async () => {
      const hash = await hashPassword(plaintext);
      const result = await comparePassword('', hash);
      expect(result).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Token Service
// ---------------------------------------------------------------------------

describe('Token Service', () => {
  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@example.com',
    role: 'user',
    subscription_tier: 'free',
  };

  // ---- Access Tokens ----

  describe('generateAccessToken()', () => {
    it('returns a string that looks like a JWT (three dot-separated segments)', () => {
      const token = generateAccessToken(mockUser);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('embeds the correct payload claims', () => {
      const token = generateAccessToken(mockUser);
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
      expect(decoded.role).toBe(mockUser.role);
      expect(decoded.subscription_tier).toBe(mockUser.subscription_tier);
    });
  });

  describe('verifyAccessToken()', () => {
    it('decodes a valid access token correctly', () => {
      const token = generateAccessToken(mockUser);
      const payload = verifyAccessToken(token);

      expect(payload.sub).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.role).toBe(mockUser.role);
      expect(payload.subscription_tier).toBe(mockUser.subscription_tier);
    });

    it('throws AuthenticationError on an expired access token', () => {
      // Create a token that is already expired
      const token = jwt.sign(
        { sub: mockUser.id, email: mockUser.email, role: 'user', subscription_tier: 'free' },
        process.env.JWT_SECRET!,
        {
          expiresIn: '-10s',
          issuer: 'video-challenge-api',
          audience: 'video-challenge-app',
        },
      );

      expect(() => verifyAccessToken(token)).toThrow(AuthenticationError);
      expect(() => verifyAccessToken(token)).toThrow('expired');
    });

    it('throws AuthenticationError on a token signed with the wrong secret', () => {
      const token = jwt.sign(
        { sub: mockUser.id, email: mockUser.email, role: 'user', subscription_tier: 'free' },
        'completely-wrong-secret',
        {
          expiresIn: '1h',
          issuer: 'video-challenge-api',
          audience: 'video-challenge-app',
        },
      );

      expect(() => verifyAccessToken(token)).toThrow(AuthenticationError);
    });

    it('throws AuthenticationError on a malformed token string', () => {
      expect(() => verifyAccessToken('not.a.real.jwt')).toThrow(AuthenticationError);
    });
  });

  // ---- Refresh Tokens ----

  describe('generateRefreshToken()', () => {
    it('returns a valid JWT string', () => {
      const token = generateRefreshToken({ id: mockUser.id });
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('includes the type=refresh claim', () => {
      const token = generateRefreshToken({ id: mockUser.id });
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded.sub).toBe(mockUser.id);
      expect(decoded.type).toBe('refresh');
    });
  });

  describe('verifyRefreshToken()', () => {
    it('decodes a valid refresh token correctly', () => {
      const token = generateRefreshToken({ id: mockUser.id });
      const payload = verifyRefreshToken(token);

      expect(payload.sub).toBe(mockUser.id);
      expect(payload.type).toBe('refresh');
    });

    it('throws AuthenticationError on an expired refresh token', () => {
      const token = jwt.sign(
        { sub: mockUser.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET!,
        {
          expiresIn: '-10s',
          issuer: 'video-challenge-api',
          audience: 'video-challenge-app',
        },
      );

      expect(() => verifyRefreshToken(token)).toThrow(AuthenticationError);
    });

    it('throws AuthenticationError when given an access token instead of a refresh token', () => {
      // Access tokens do not carry type='refresh'
      const accessToken = generateAccessToken(mockUser);

      // Signed with the wrong secret for refresh verification,
      // so this should fail.
      expect(() => verifyRefreshToken(accessToken)).toThrow(AuthenticationError);
    });

    it('throws AuthenticationError on a malformed token', () => {
      expect(() => verifyRefreshToken('garbage')).toThrow(AuthenticationError);
    });
  });

  // ---- Token Pair ----

  describe('generateTokenPair()', () => {
    it('returns an object with accessToken, refreshToken, and expiresIn', () => {
      const pair = generateTokenPair(mockUser);

      expect(pair).toHaveProperty('accessToken');
      expect(pair).toHaveProperty('refreshToken');
      expect(pair).toHaveProperty('expiresIn');

      expect(typeof pair.accessToken).toBe('string');
      expect(typeof pair.refreshToken).toBe('string');
      expect(typeof pair.expiresIn).toBe('string');
    });

    it('generates tokens that can be independently verified', () => {
      const pair = generateTokenPair(mockUser);

      // Access token should be verifiable
      const accessPayload = verifyAccessToken(pair.accessToken);
      expect(accessPayload.sub).toBe(mockUser.id);

      // Refresh token should be verifiable
      const refreshPayload = verifyRefreshToken(pair.refreshToken);
      expect(refreshPayload.sub).toBe(mockUser.id);
    });

    it('accessToken and refreshToken are different strings', () => {
      const pair = generateTokenPair(mockUser);
      expect(pair.accessToken).not.toBe(pair.refreshToken);
    });
  });
});

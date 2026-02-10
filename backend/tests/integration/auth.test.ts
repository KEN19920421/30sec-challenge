/**
 * Integration tests for the /api/v1/auth endpoints.
 *
 * After migrating to social-only auth, the available endpoints are:
 *   POST /social   — social login (Google / Apple)
 *   POST /refresh  — refresh token pair
 *   GET  /me       — current user
 *   POST /logout   — blacklist refresh token
 */

import request from 'supertest';
import app from '../../src/app';
import { getDb } from '../helpers/database';
import { createTestUser, generateAuthToken } from '../helpers/factory';
import { generateRefreshToken } from '../../src/modules/auth/token.service';

// ---------------------------------------------------------------------------
// Mock Redis to avoid needing a running Redis instance during CI
// ---------------------------------------------------------------------------

const mockRedisStore = new Map<string, string>();
jest.mock('../../src/config/redis', () => {
  return {
    redis: {
      get: jest.fn(async (key: string) => mockRedisStore.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        mockRedisStore.set(key, value);
        return 'OK';
      }),
      del: jest.fn(async (...keys: string[]) => {
        keys.forEach((k) => mockRedisStore.delete(k));
        return keys.length;
      }),
    },
    disconnectRedis: jest.fn(),
    createRedisConnection: jest.fn(),
  };
});

// Mock BullMQ queues to avoid Redis connection during tests
jest.mock('../../src/jobs/queues', () => ({
  transcodeQueue: { add: jest.fn() },
  thumbnailQueue: { add: jest.fn() },
  leaderboardQueue: { add: jest.fn() },
  notificationQueue: { add: jest.fn() },
  achievementQueue: { add: jest.fn() },
  cleanupQueue: { add: jest.fn() },
  analyticsQueue: { add: jest.fn() },
  addJob: jest.fn(),
  closeAllQueues: jest.fn(),
}));

// Silence the logger during tests
jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  morganStream: { write: jest.fn() },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Auth Endpoints', () => {
  beforeEach(() => {
    mockRedisStore.clear();
  });

  // -----------------------------------------------------------------------
  // GET /api/v1/auth/me
  // -----------------------------------------------------------------------

  describe('GET /api/v1/auth/me', () => {
    it('returns 200 with user data when token is valid', async () => {
      const user = await createTestUser();
      const token = generateAuthToken(user);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(user.id);
      expect(res.body.data.email).toBe(user.email);
      expect(res.body.data).not.toHaveProperty('password_hash');
    });

    it('returns 401 when no token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('returns 401 when the token is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/v1/auth/refresh
  // -----------------------------------------------------------------------

  describe('POST /api/v1/auth/refresh', () => {
    it('returns 200 with a new token pair given a valid refresh token', async () => {
      const user = await createTestUser();
      const refreshToken = generateRefreshToken({ id: user.id });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('returns 401 for an invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: 'bad.refresh.token' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when refresh_token is missing from body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/v1/auth/logout
  // -----------------------------------------------------------------------

  describe('POST /api/v1/auth/logout', () => {
    it('returns 200 and blacklists the refresh token', async () => {
      const user = await createTestUser();
      const accessToken = generateAuthToken(user);
      const refreshToken = generateRefreshToken({ id: user.id });

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(res.body.success).toBe(true);

      // Verify the token is now blacklisted — refresh should fail
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(401);

      expect(refreshRes.body.success).toBe(false);
    });

    it('returns 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refresh_token: 'some-token' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Removed endpoints should return 404
  // -----------------------------------------------------------------------

  describe('Removed email/password endpoints', () => {
    it('POST /api/v1/auth/register returns 404', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'a@b.com', password: 'Test1234', username: 'u' })
        .expect(404);
    });

    it('POST /api/v1/auth/login returns 404', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'a@b.com', password: 'Test1234' })
        .expect(404);
    });
  });
});

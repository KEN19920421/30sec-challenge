/**
 * Integration tests for the /api/v1/auth endpoints.
 *
 * These tests hit the real Express app via supertest and interact with the
 * test database. External services (Redis for password resets, etc.) are
 * expected to be available -- or are mocked where noted.
 */

import request from 'supertest';
import app from '../../src/app';
import { getDb } from '../helpers/database';
import {
  createTestUser,
  generateAuthToken,
  DEFAULT_TEST_PASSWORD,
} from '../helpers/factory';

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
  const db = getDb();

  // -----------------------------------------------------------------------
  // POST /api/v1/auth/register
  // -----------------------------------------------------------------------

  describe('POST /api/v1/auth/register', () => {
    const validBody = {
      email: 'newuser@example.com',
      password: 'StrongPass1',
      username: 'newuser',
      display_name: 'New User',
    };

    it('returns 201 with tokens and user (without password_hash)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validBody)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('tokens');

      // User object sanity
      const { user } = res.body.data;
      expect(user.email).toBe(validBody.email);
      expect(user.username).toBe(validBody.username);
      expect(user.display_name).toBe(validBody.display_name);
      expect(user).not.toHaveProperty('password_hash');

      // Tokens sanity
      const { tokens } = res.body.data;
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
    });

    it('returns 400 (validation) for duplicate email', async () => {
      // Register once
      await request(app)
        .post('/api/v1/auth/register')
        .send(validBody)
        .expect(201);

      // Attempt duplicate
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validBody, username: 'different_user' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 for an invalid email address', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validBody, email: 'not-an-email' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 for a weak password (no uppercase)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validBody, password: 'alllower1', email: 'weak@test.com' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 for a weak password (too short)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validBody, password: 'Ab1', email: 'short@test.com' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'partial@test.com' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/v1/auth/login
  // -----------------------------------------------------------------------

  describe('POST /api/v1/auth/login', () => {
    let registeredEmail: string;

    beforeEach(async () => {
      // Create a user to log in with
      const user = await createTestUser({
        email: 'login@test.com',
        username: 'loginuser',
      });
      registeredEmail = user.email;
    });

    it('returns 200 with tokens on valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: registeredEmail, password: DEFAULT_TEST_PASSWORD })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('tokens');
      expect(res.body.data.tokens).toHaveProperty('accessToken');
      expect(res.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: registeredEmail, password: 'WrongPassword1' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('returns 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'ghost@test.com', password: 'Anything1' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });
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
      // Register a user to get a real refresh token
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'refresh@test.com',
          password: 'StrongPass1',
          username: 'refreshuser',
          display_name: 'Refresh User',
        })
        .expect(201);

      const { refreshToken } = registerRes.body.data.tokens;

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
});

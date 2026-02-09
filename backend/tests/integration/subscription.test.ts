/**
 * Integration tests for the /api/v1/subscriptions endpoints.
 *
 * External payment APIs (Apple / Google) are fully mocked. Tests verify
 * routing, auth guards, validation, and database interactions.
 */

import request from 'supertest';
import app from '../../src/app';
import { getDb } from '../helpers/database';
import {
  createTestUser,
  generateAuthToken,
} from '../helpers/factory';

// ---------------------------------------------------------------------------
// Mocks
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

jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  morganStream: { write: jest.fn() },
}));

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

// Mock global fetch so that Apple/Google verification calls do not reach
// the internet.
const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function seedSubscriptionPlan(
  overrides: Partial<Record<string, unknown>> = {},
) {
  const db = getDb();
  const [plan] = await db('subscription_plans')
    .insert({
      name: 'Pro Monthly',
      apple_product_id: 'com.app.pro.monthly',
      google_product_id: 'pro_monthly',
      price_usd: 9.99,
      duration_months: 1,
      is_active: true,
      features: JSON.stringify({
        super_votes: 3,
        no_ads: true,
        early_access: true,
      }),
      ...overrides,
    })
    .returning('*');

  return plan;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockRedisStore.clear();
});

describe('Subscription Endpoints', () => {
  const db = getDb();

  // -----------------------------------------------------------------------
  // GET /api/v1/subscriptions/plans
  // -----------------------------------------------------------------------

  describe('GET /api/v1/subscriptions/plans', () => {
    it('returns empty array when no plans exist', async () => {
      // Ensure table is clean
      await db('subscription_plans').del();

      const res = await request(app)
        .get('/api/v1/subscriptions/plans')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('returns available subscription plans', async () => {
      await seedSubscriptionPlan({ name: 'Pro Monthly' });
      await seedSubscriptionPlan({
        name: 'Pro Yearly',
        apple_product_id: 'com.app.pro.yearly',
        google_product_id: 'pro_yearly',
        price_usd: 79.99,
        duration_months: 12,
      });

      const res = await request(app)
        .get('/api/v1/subscriptions/plans')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);

      // Plans should be ordered by price ascending
      expect(parseFloat(res.body.data[0].price_usd)).toBeLessThanOrEqual(
        parseFloat(res.body.data[1].price_usd),
      );
    });

    it('does not return inactive plans', async () => {
      await seedSubscriptionPlan({
        name: 'Active Plan',
        is_active: true,
        apple_product_id: 'com.app.active',
        google_product_id: 'active_plan',
      });
      await seedSubscriptionPlan({
        name: 'Inactive Plan',
        is_active: false,
        apple_product_id: 'com.app.inactive',
        google_product_id: 'inactive',
      });

      const res = await request(app)
        .get('/api/v1/subscriptions/plans')
        .expect(200);

      const names = res.body.data.map((p: any) => p.name);
      expect(names).toContain('Active Plan');
      expect(names).not.toContain('Inactive Plan');
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/v1/subscriptions/status
  // -----------------------------------------------------------------------

  describe('GET /api/v1/subscriptions/status', () => {
    it('returns "free" status for a user without a subscription', async () => {
      const user = await createTestUser({
        email: 'nosub@test.com',
        username: 'nosub_user',
        subscription_tier: 'free',
      });
      const token = generateAuthToken(user);

      const res = await request(app)
        .get('/api/v1/subscriptions/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.has_active_subscription).toBe(false);
      expect(res.body.data.subscription).toBeNull();
      expect(res.body.data.plan).toBeNull();
    });

    it('returns subscription details for a subscribed user', async () => {
      const plan = await seedSubscriptionPlan();
      const user = await createTestUser({
        email: 'subbed@test.com',
        username: 'subbed_user',
        subscription_tier: 'pro',
      });

      // Insert a subscription record
      await db('user_subscriptions').insert({
        user_id: user.id,
        plan_id: plan.id,
        platform: 'apple',
        platform_subscription_id: 'original_txn_123',
        status: 'active',
        starts_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        is_auto_renewing: true,
      });

      const token = generateAuthToken({
        id: user.id,
        email: user.email,
        role: 'user',
        subscription_tier: 'pro',
      });

      const res = await request(app)
        .get('/api/v1/subscriptions/status')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.has_active_subscription).toBe(true);
      expect(res.body.data.subscription).toBeDefined();
      expect(res.body.data.subscription.status).toBe('active');
      expect(res.body.data.plan).toBeDefined();
      expect(res.body.data.plan.id).toBe(plan.id);
    });

    it('returns 401 without auth token', async () => {
      await request(app)
        .get('/api/v1/subscriptions/status')
        .expect(401);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/v1/subscriptions/verify
  // -----------------------------------------------------------------------

  describe('POST /api/v1/subscriptions/verify', () => {
    it('returns 400 when receipt_data is missing', async () => {
      const user = await createTestUser({
        email: 'verifyval@test.com',
        username: 'verifyval',
      });
      const token = generateAuthToken(user);

      const res = await request(app)
        .post('/api/v1/subscriptions/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ platform: 'apple' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when platform is invalid', async () => {
      const user = await createTestUser({
        email: 'verifyplat@test.com',
        username: 'verifyplat',
      });
      const token = generateAuthToken(user);

      const res = await request(app)
        .post('/api/v1/subscriptions/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ platform: 'windows', receipt_data: 'fake-receipt' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('validates receipt structure (body must contain platform and receipt_data)', async () => {
      const user = await createTestUser({
        email: 'verifystruct@test.com',
        username: 'verifystruct',
      });
      const token = generateAuthToken(user);

      // Empty body
      const res = await request(app)
        .post('/api/v1/subscriptions/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 401 without auth token', async () => {
      await request(app)
        .post('/api/v1/subscriptions/verify')
        .send({ platform: 'apple', receipt_data: 'some-receipt' })
        .expect(401);
    });

    it('returns subscription on a valid (mocked) Apple receipt', async () => {
      // Set up the Apple shared secret env var
      process.env.APPLE_SHARED_SECRET = 'test-apple-secret';

      const plan = await seedSubscriptionPlan();
      const user = await createTestUser({
        email: 'verifygood@test.com',
        username: 'verifygood',
      });
      const token = generateAuthToken(user);

      // Mock Apple's verifyReceipt endpoint to return a valid response
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 0,
          latest_receipt_info: [
            {
              product_id: 'com.app.pro.monthly',
              transaction_id: 'txn_001',
              original_transaction_id: 'orig_txn_001',
              expires_date_ms: String(futureDate.getTime()),
            },
          ],
          pending_renewal_info: [
            {
              auto_renew_status: '1',
              product_id: 'com.app.pro.monthly',
              original_transaction_id: 'orig_txn_001',
            },
          ],
        }),
      });

      const res = await request(app)
        .post('/api/v1/subscriptions/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({
          platform: 'apple',
          receipt_data: 'base64-encoded-receipt-data',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('subscription');
      expect(res.body.data.subscription.status).toBe('active');
      expect(res.body.data.subscription.user_id).toBe(user.id);

      // Clean up
      delete process.env.APPLE_SHARED_SECRET;
    });
  });
});

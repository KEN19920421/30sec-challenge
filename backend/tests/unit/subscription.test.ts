/**
 * Unit tests for the subscription service logic.
 *
 * These tests mock the database (Knex), Redis, logger, and global.fetch so that
 * no real connections or network calls are needed. They verify the business logic
 * of plan retrieval, receipt verification, subscription management, webhooks,
 * expiry checks, and purchase restoration.
 */

// ---------------------------------------------------------------------------
// Mocks -- must be set up before importing the module under test
// ---------------------------------------------------------------------------

// Mock Redis
jest.mock('../../src/config/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  },
  disconnectRedis: jest.fn(),
}));

// Mock logger
jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock fetch for Apple/Google verification
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Build a chainable query builder mock
function createQueryBuilder() {
  const builder: Record<string, jest.Mock> = {
    where: jest.fn().mockReturnThis(),
    whereIn: jest.fn().mockReturnThis(),
    whereRaw: jest.fn().mockReturnThis(),
    forUpdate: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn().mockReturnValue({ returning: jest.fn() }),
    update: jest.fn().mockReturnValue({ returning: jest.fn() }),
    count: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    returning: jest.fn(),
  };
  return builder;
}

// We keep a reference to the "current" query builder so tests can configure it
let currentBuilder = createQueryBuilder();

// Create the main db mock
const mockDb = jest.fn().mockImplementation(() => {
  currentBuilder = createQueryBuilder();
  return currentBuilder;
});
(mockDb as any).transaction = jest.fn();
(mockDb as any).fn = { now: jest.fn().mockReturnValue('NOW()') };
(mockDb as any).raw = jest.fn();

jest.mock('../../src/config/database', () => ({
  db: mockDb,
}));

// Now import the module under test
import * as subscriptionService from '../../src/modules/subscription/subscription.service';
import { ValidationError, NotFoundError } from '../../src/shared/errors';
import { redis } from '../../src/config/redis';
import { logger } from '../../src/config/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FUTURE_MS = Date.now() + 86400000; // 24h from now
const PAST_MS = Date.now() - 86400000;   // 24h ago

function makeAppleReceiptResponse(overrides: Record<string, unknown> = {}) {
  return {
    status: 0,
    latest_receipt_info: [
      {
        product_id: 'pro_monthly',
        transaction_id: 'tx-1',
        original_transaction_id: 'orig-1',
        expires_date_ms: String(FUTURE_MS),
      },
    ],
    pending_renewal_info: [
      {
        auto_renew_status: '1',
        product_id: 'pro_monthly',
        original_transaction_id: 'orig-1',
      },
    ],
    ...overrides,
  };
}

function mockAppleFetchSuccess(overrides: Record<string, unknown> = {}) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(makeAppleReceiptResponse(overrides)),
  });
}

function mockAppleFetchSandboxFallback() {
  // Production returns 21007 (sandbox receipt)
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ status: 21007 }),
  });
  // Sandbox returns success
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(makeAppleReceiptResponse()),
  });
}

/** Sets up a sequence of db() calls each returning its own builder */
function setupDbCallSequence(builders: Array<Record<string, jest.Mock>>) {
  let callIndex = 0;
  mockDb.mockImplementation(() => {
    const b = builders[callIndex] || builders[builders.length - 1];
    callIndex++;
    return b;
  });
}

function makePlanBuilder(plan: Record<string, unknown> | undefined) {
  const b = createQueryBuilder();
  b.where.mockReturnThis();
  b.first.mockResolvedValue(plan);
  return b;
}

function makeSubscriptionBuilder(sub: Record<string, unknown> | undefined) {
  const b = createQueryBuilder();
  b.where.mockReturnThis();
  b.whereIn.mockReturnThis();
  b.whereRaw.mockReturnThis();
  b.orderBy.mockReturnThis();
  b.first.mockResolvedValue(sub);
  return b;
}

function makeUpdateBuilder(returnValue: unknown[] = []) {
  const b = createQueryBuilder();
  b.where.mockReturnThis();
  b.whereIn.mockReturnThis();
  b.update.mockReturnValue({ returning: jest.fn().mockResolvedValue(returnValue) });
  return b;
}

function makeInsertBuilder(returnValue: unknown[] = []) {
  const b = createQueryBuilder();
  b.insert.mockReturnValue({ returning: jest.fn().mockResolvedValue(returnValue) });
  return b;
}

function makeSelectBuilder(rows: unknown[] = []) {
  const b = createQueryBuilder();
  b.where.mockReturnThis();
  b.whereIn.mockReturnThis();
  b.whereRaw.mockReturnThis();
  b.select.mockResolvedValue(rows);
  return b;
}

// ---------------------------------------------------------------------------
// Test env
// ---------------------------------------------------------------------------

const ORIGINAL_ENV = process.env;

beforeAll(() => {
  process.env.APPLE_SHARED_SECRET = 'test-apple-secret';
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify({
    client_email: 'test@test.iam.gserviceaccount.com',
    private_key: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF/PbnGcY5unA67hqxnfZoGMaEclq\nHaMbMaECaLMHIKlbOPLghYAHBysFdW9bBGE5NHGBR0PGK+V7KOQ1GQ01FQ5MQGMA\nL/LDB1saBEfOYMm6hHMPsSiyMEqfMFKCKFOh0cTdC0QXFUQ7EYPC+JROUzNAVB3Z\ncFBR0LhaBDF6FRAPEVEHXVqEK2e3GzPCC/G0OG0/EJIiUzGKgC1SNFNkMPJEB/mj\nmFVHvG4QKr5JFRe6WnlQYyJBrblE9rI7PAIL9KHMqLpqGSJPJ4W88KMUjH3RW37u\nthRjfo6MlTLbVKJBJ0wqcoSi3sSN0JyJ56YSHQIDAQAB\nAoIBAC5RgZ+hBx7xHNaEjJkG3cXmGzmSMy1OQiNMPV4oJ3F7wOMEPOpTFPflJPBF\nsXHmW5MRvxdB0SKM9jGAaOr3WxCOE5JcFExTiYANzCWL/Vv7GsRb12lH+HJI/v1q\ne0lBwPfuLeO5B7el11GEraajO8t+ysHNUHrl0v4JBfCAc4O3a/OADVG0XYRiBXdz\nxMqCPMEOJk5T/PHzbm3FxOP7DWOXVrB32NShIFBBWKMN3AUBi6wO+peKMN0J/nnz\nMKEoHQKIfcLMDfPxfCvIdwCPjYzq/L0EgB9Sc4o+V+T6JJgjcuqGW3Edd6kf+QfI\n7Z+OHK9YsMcRPGJFo1aJYLVtMrkCgYEA6e1iR5aEz72rpjBJp4P5IBXqINEzddSf\nlJb0WpmVgFG5OrcL4g+JFopc4JwUxnNR1bwb2Lp3PoY+fCLMNMPYIsoKHjIgPgkt\npH/SNWkRMvZP5qHHPxoGnSr1KTLnHlIf+Cz6KYmQ0L+1Zu/v77h9oCVMuuPRH7K\n3Gt+wljJNecCgYEA5Ayvj4RCP0YGREq7x5hOOGrs/ZYFO5v6L0+ZHSK0IWpwlgs8\nHEE4V7FYKmUGVIB2AVbyE1F7hQHPw0RVIvbN5SPUWm0Wcdv3mHRRFQRjHbMKYh1F\nOs6QVBaVtxGQhWrfPgAzzqWm3qxDIFOFTRTh2feNy9dJ0HK8INBGxpRs1WcCgYBO\nD3jU5Hzo9bJd6bMqzHC0lL93G3kVk9E6jUPsM9x8hwFwMFf1rBPBIEH2MRReLer3\nQFhVz5MIM+P1njB0f6hW0tYS0E1DF6oW85yX0qhiOIvMf1eeRDOqjElQ9OzE7Dh0\nj/RMvxB7s+H23AMFyfnsOHD8DUqbIJ6B5w2A3gu0twKBgQCITN1f9dAGYSBcMBWv\nB7v0fCz0LwG5oMhqPg7FhRFi0fiTMFC5Lmj6IT0dp3Rv2yHxsIj+BiRE8oR+QmwJ\nGGfpZwjL2SzLPrxY4PMh0mwOIQ8dPjKE37HUhXJAZULTQiX+vYLK57Gfvp84ByNV\nsDbbeaPJ/Yz6c6H+a8cBbTYQqg==\n-----END RSA PRIVATE KEY-----\n',
    token_uri: 'https://oauth2.googleapis.com/token',
  });
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Subscription Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    // Reset the default db mock implementation
    mockDb.mockImplementation(() => {
      currentBuilder = createQueryBuilder();
      return currentBuilder;
    });
  });

  // =======================================================================
  // getPlans()
  // =======================================================================

  describe('getPlans()', () => {
    it('returns cached plans from Redis when available', async () => {
      const cachedPlans = [
        { id: 'plan-1', name: 'Monthly', price_usd: 4.99 },
        { id: 'plan-2', name: 'Yearly', price_usd: 39.99 },
      ];
      (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(cachedPlans));

      const result = await subscriptionService.getPlans();

      expect(result).toEqual(cachedPlans);
      expect(redis.get).toHaveBeenCalledWith('subscription:plans');
      expect(mockDb).not.toHaveBeenCalled();
    });

    it('queries DB and caches when Redis cache is empty', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      const plans = [
        { id: 'plan-1', name: 'Monthly', price_usd: 4.99, is_active: true },
      ];

      const builder = createQueryBuilder();
      builder.where.mockReturnThis();
      builder.orderBy.mockReturnThis();
      builder.select.mockResolvedValue(plans);
      mockDb.mockReturnValueOnce(builder);

      const result = await subscriptionService.getPlans();

      expect(result).toEqual(plans);
      expect(mockDb).toHaveBeenCalledWith('subscription_plans');
      expect(redis.set).toHaveBeenCalledWith(
        'subscription:plans',
        JSON.stringify(plans),
        'EX',
        3600,
      );
    });

    it('returns plans ordered by price ascending', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      const plans = [
        { id: 'plan-1', name: 'Monthly', price_usd: 4.99 },
        { id: 'plan-2', name: 'Yearly', price_usd: 39.99 },
      ];

      const builder = createQueryBuilder();
      builder.where.mockReturnThis();
      builder.orderBy.mockReturnThis();
      builder.select.mockResolvedValue(plans);
      mockDb.mockReturnValueOnce(builder);

      await subscriptionService.getPlans();

      expect(builder.orderBy).toHaveBeenCalledWith('price_usd', 'asc');
    });
  });

  // =======================================================================
  // verifyReceipt() - Apple
  // =======================================================================

  describe('verifyReceipt() - Apple', () => {
    const userId = 'user-apple-1';
    const platform = 'apple' as const;
    const receiptData = 'base64-encoded-receipt';

    it('verifies receipt with Apple production URL and creates new subscription', async () => {
      mockAppleFetchSuccess();

      const plan = { id: 'plan-1', name: 'Pro Monthly', apple_product_id: 'pro_monthly', is_active: true };
      const newSub = {
        id: 'sub-1', user_id: userId, plan_id: plan.id, platform: 'apple',
        platform_subscription_id: 'orig-1', status: 'active',
      };

      // Call sequence: subscription_plans.where().where().first() -> plan
      const planBuilder = makePlanBuilder(plan);
      // user_subscriptions.where().where().first() -> null (no existing)
      const existingSubBuilder = makeSubscriptionBuilder(undefined);
      // user_subscriptions.insert().returning() -> [newSub]
      const insertBuilder = makeInsertBuilder([newSub]);
      // users.where().update()
      const userUpdateBuilder = makeUpdateBuilder();

      setupDbCallSequence([planBuilder, existingSubBuilder, insertBuilder, userUpdateBuilder]);

      const result = await subscriptionService.verifyReceipt(userId, platform, receiptData);

      expect(result.is_new).toBe(true);
      expect(result.subscription).toEqual(newSub);
      expect(redis.del).toHaveBeenCalledWith(`user:${userId}`);
    });

    it('falls back to sandbox URL when production returns status 21007', async () => {
      mockAppleFetchSandboxFallback();

      const plan = { id: 'plan-1', apple_product_id: 'pro_monthly', is_active: true };
      const newSub = { id: 'sub-1', user_id: userId, status: 'active' };

      setupDbCallSequence([
        makePlanBuilder(plan),
        makeSubscriptionBuilder(undefined),
        makeInsertBuilder([newSub]),
        makeUpdateBuilder(),
      ]);

      const result = await subscriptionService.verifyReceipt(userId, platform, receiptData);

      // Should have called fetch twice (production then sandbox)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://buy.itunes.apple.com/verifyReceipt',
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://sandbox.itunes.apple.com/verifyReceipt',
        expect.any(Object),
      );
      expect(result.is_new).toBe(true);
    });

    it('throws ValidationError when Apple status is not 0', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 21003 }),
      });

      await expect(
        subscriptionService.verifyReceipt(userId, platform, receiptData),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when no latest_receipt_info', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 0, latest_receipt_info: [] }),
      });

      await expect(
        subscriptionService.verifyReceipt(userId, platform, receiptData),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when receipt is cancelled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(makeAppleReceiptResponse({
          latest_receipt_info: [
            {
              product_id: 'pro_monthly',
              transaction_id: 'tx-1',
              original_transaction_id: 'orig-1',
              expires_date_ms: String(FUTURE_MS),
              cancellation_date_ms: String(Date.now()),
            },
          ],
        })),
      });

      await expect(
        subscriptionService.verifyReceipt(userId, platform, receiptData),
      ).rejects.toThrow(ValidationError);
    });

    it('throws NotFoundError when plan is not found', async () => {
      mockAppleFetchSuccess();

      // Plan not found
      setupDbCallSequence([makePlanBuilder(undefined)]);

      await expect(
        subscriptionService.verifyReceipt(userId, platform, receiptData),
      ).rejects.toThrow(NotFoundError);
    });

    it('updates existing subscription when found (is_new=false)', async () => {
      mockAppleFetchSuccess();

      const plan = { id: 'plan-1', apple_product_id: 'pro_monthly', is_active: true };
      const existingSub = {
        id: 'sub-existing', user_id: userId, plan_id: plan.id,
        platform: 'apple', platform_subscription_id: 'orig-1',
      };
      const updatedSub = { ...existingSub, status: 'active' };

      setupDbCallSequence([
        makePlanBuilder(plan),
        makeSubscriptionBuilder(existingSub),
        makeUpdateBuilder([updatedSub]),
        makeUpdateBuilder(),
      ]);

      const result = await subscriptionService.verifyReceipt(userId, platform, receiptData);

      expect(result.is_new).toBe(false);
      expect(result.subscription).toEqual(updatedSub);
    });

    it('updates user subscription_tier to pro after verification', async () => {
      mockAppleFetchSuccess();

      const plan = { id: 'plan-1', apple_product_id: 'pro_monthly', is_active: true };
      const newSub = { id: 'sub-1', user_id: userId, status: 'active' };

      const userUpdateBuilder = makeUpdateBuilder();
      setupDbCallSequence([
        makePlanBuilder(plan),
        makeSubscriptionBuilder(undefined),
        makeInsertBuilder([newSub]),
        userUpdateBuilder,
      ]);

      await subscriptionService.verifyReceipt(userId, platform, receiptData);

      // The 4th db call should be for users table
      expect(mockDb).toHaveBeenNthCalledWith(4, 'users');
      expect(userUpdateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_tier: 'pro',
        }),
      );
    });
  });

  // =======================================================================
  // verifyReceipt() - Google
  // =======================================================================

  describe('verifyReceipt() - Google', () => {
    const userId = 'user-google-1';
    const platform = 'google' as const;

    function makeGoogleReceiptData(overrides: Record<string, unknown> = {}) {
      return JSON.stringify({
        packageName: 'com.app.test',
        productId: 'pro_monthly',
        purchaseToken: 'token-123',
        ...overrides,
      });
    }

    function mockGoogleTokenAndVerify() {
      // First fetch: get google access token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ access_token: 'mock-access-token', expires_in: 3600 }),
      });
      // Second fetch: verify receipt with Google Play
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          orderId: 'GPA.1234',
          packageName: 'com.app.test',
          productId: 'pro_monthly',
          purchaseToken: 'token-123',
          expiryTimeMillis: String(FUTURE_MS),
          autoRenewing: true,
        }),
      });
    }

    it('throws ValidationError for invalid JSON receipt data', async () => {
      await expect(
        subscriptionService.verifyReceipt(userId, platform, 'not-valid-json'),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for missing required fields', async () => {
      const incompleteReceipt = JSON.stringify({ packageName: 'com.test' });

      await expect(
        subscriptionService.verifyReceipt(userId, platform, incompleteReceipt),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when Google verification fetch fails', async () => {
      // Pre-cache Google access token so the service skips JWT signing
      (redis.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'google:access_token') return Promise.resolve('cached-google-token');
        return Promise.resolve(null);
      });

      // Verification fetch fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      });

      await expect(
        subscriptionService.verifyReceipt(userId, platform, makeGoogleReceiptData()),
      ).rejects.toThrow(ValidationError);
    });

    it('creates new subscription for valid Google receipt', async () => {
      // Pre-cache Google access token so the service skips JWT signing
      (redis.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'google:access_token') return Promise.resolve('cached-google-token');
        return Promise.resolve(null);
      });

      // Only the verification fetch is needed since token is cached
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          orderId: 'GPA.1234',
          packageName: 'com.app.test',
          productId: 'pro_monthly',
          purchaseToken: 'token-123',
          expiryTimeMillis: String(FUTURE_MS),
          autoRenewing: true,
        }),
      });

      const plan = { id: 'plan-g1', google_product_id: 'pro_monthly', is_active: true };
      const newSub = { id: 'sub-g1', user_id: userId, status: 'active' };

      setupDbCallSequence([
        makePlanBuilder(plan),
        makeSubscriptionBuilder(undefined),
        makeInsertBuilder([newSub]),
        makeUpdateBuilder(),
      ]);

      const result = await subscriptionService.verifyReceipt(userId, platform, makeGoogleReceiptData());

      expect(result.is_new).toBe(true);
      expect(result.subscription).toEqual(newSub);
    });
  });

  // =======================================================================
  // getStatus()
  // =======================================================================

  describe('getStatus()', () => {
    const userId = 'user-status-1';

    it('returns no active subscription when none exists', async () => {
      const subBuilder = makeSubscriptionBuilder(undefined);
      mockDb.mockReturnValueOnce(subBuilder);

      const result = await subscriptionService.getStatus(userId);

      expect(result).toEqual({
        has_active_subscription: false,
        subscription: null,
        plan: null,
      });
    });

    it('returns active subscription with plan', async () => {
      const subscription = {
        id: 'sub-1', user_id: userId, plan_id: 'plan-1',
        status: 'active', expires_at: new Date(FUTURE_MS),
      };
      const plan = { id: 'plan-1', name: 'Pro Monthly', price_usd: 4.99 };

      const subBuilder = makeSubscriptionBuilder(subscription);
      const planBuilder = makePlanBuilder(plan);

      setupDbCallSequence([subBuilder, planBuilder]);

      const result = await subscriptionService.getStatus(userId);

      expect(result).toEqual({
        has_active_subscription: true,
        subscription,
        plan,
      });
    });

    it('only queries for active, grace_period, and billing_retry statuses', async () => {
      const subBuilder = makeSubscriptionBuilder(undefined);
      mockDb.mockReturnValueOnce(subBuilder);

      await subscriptionService.getStatus(userId);

      expect(subBuilder.whereIn).toHaveBeenCalledWith(
        'status',
        ['active', 'grace_period', 'billing_retry'],
      );
    });

    it('returns null plan when subscription has no plan_id', async () => {
      const subscription = {
        id: 'sub-1', user_id: userId, plan_id: null,
        status: 'active', expires_at: new Date(FUTURE_MS),
      };

      const subBuilder = makeSubscriptionBuilder(subscription);
      mockDb.mockReturnValueOnce(subBuilder);

      const result = await subscriptionService.getStatus(userId);

      expect(result.has_active_subscription).toBe(true);
      expect(result.plan).toBeNull();
      // Should NOT have queried subscription_plans since plan_id is null
      expect(mockDb).toHaveBeenCalledTimes(1);
    });
  });

  // =======================================================================
  // cancelSubscription()
  // =======================================================================

  describe('cancelSubscription()', () => {
    const userId = 'user-cancel-1';
    const subscriptionId = 'sub-cancel-1';

    it('throws NotFoundError when subscription not found', async () => {
      setupDbCallSequence([makeSubscriptionBuilder(undefined)]);

      await expect(
        subscriptionService.cancelSubscription(userId, subscriptionId),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError when subscription is already cancelled', async () => {
      const sub = { id: subscriptionId, user_id: userId, status: 'cancelled' };
      setupDbCallSequence([makeSubscriptionBuilder(sub)]);

      await expect(
        subscriptionService.cancelSubscription(userId, subscriptionId),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError when subscription is already expired', async () => {
      const sub = { id: subscriptionId, user_id: userId, status: 'expired' };
      setupDbCallSequence([makeSubscriptionBuilder(sub)]);

      await expect(
        subscriptionService.cancelSubscription(userId, subscriptionId),
      ).rejects.toThrow(ValidationError);
    });

    it('cancels an active subscription successfully', async () => {
      const sub = { id: subscriptionId, user_id: userId, status: 'active' };
      const cancelled = {
        ...sub, status: 'cancelled', is_auto_renewing: false,
        cancelled_at: expect.any(Date),
      };

      const findBuilder = makeSubscriptionBuilder(sub);
      const updateBuilder = makeUpdateBuilder([cancelled]);

      setupDbCallSequence([findBuilder, updateBuilder]);

      const result = await subscriptionService.cancelSubscription(userId, subscriptionId);

      expect(result).toEqual(cancelled);
      expect(logger.info).toHaveBeenCalledWith(
        'Subscription cancelled',
        expect.objectContaining({ userId, subscriptionId }),
      );
    });

    it('sets is_auto_renewing to false and cancelled_at on cancel', async () => {
      const sub = { id: subscriptionId, user_id: userId, status: 'active' };
      const cancelled = { ...sub, status: 'cancelled', is_auto_renewing: false };

      const findBuilder = makeSubscriptionBuilder(sub);
      const updateBuilder = makeUpdateBuilder([cancelled]);

      setupDbCallSequence([findBuilder, updateBuilder]);

      await subscriptionService.cancelSubscription(userId, subscriptionId);

      expect(updateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
          is_auto_renewing: false,
          cancelled_at: expect.any(Date),
        }),
      );
    });
  });

  // =======================================================================
  // handleWebhook() - Apple
  // =======================================================================

  describe('handleWebhook() - Apple', () => {
    const subscription = {
      id: 'sub-wh-1',
      user_id: 'user-wh-1',
      platform: 'apple',
      platform_subscription_id: 'orig-tx-1',
      expires_at: new Date(FUTURE_MS),
    };

    function setupAppleWebhookDb(sub: Record<string, unknown> | undefined) {
      // First call: find subscription by platform + original_transaction_id
      const findBuilder = makeSubscriptionBuilder(sub);
      // Second call: update user_subscriptions
      const subUpdateBuilder = makeUpdateBuilder();
      // Third call: update users
      const userUpdateBuilder = makeUpdateBuilder();

      setupDbCallSequence([findBuilder, subUpdateBuilder, userUpdateBuilder]);
      return { findBuilder, subUpdateBuilder, userUpdateBuilder };
    }

    it('handles DID_RENEW: sets active, updates expires_at, user to pro', async () => {
      const newExpiry = String(Date.now() + 86400000 * 30);
      setupAppleWebhookDb(subscription);

      await subscriptionService.handleWebhook('apple', {
        notification_type: 'DID_RENEW',
        data: { original_transaction_id: 'orig-tx-1', expires_date_ms: newExpiry },
      });

      expect(mockDb).toHaveBeenCalledWith('user_subscriptions');
      expect(mockDb).toHaveBeenCalledWith('users');
      expect(redis.del).toHaveBeenCalledWith(`user:${subscription.user_id}`);
    });

    it('handles SUBSCRIBED: same as DID_RENEW', async () => {
      setupAppleWebhookDb(subscription);

      await subscriptionService.handleWebhook('apple', {
        notification_type: 'SUBSCRIBED',
        data: { original_transaction_id: 'orig-tx-1', expires_date_ms: String(FUTURE_MS) },
      });

      expect(redis.del).toHaveBeenCalledWith(`user:${subscription.user_id}`);
      expect(logger.info).toHaveBeenCalledWith(
        'Apple subscription renewed',
        expect.objectContaining({ subscriptionId: subscription.id }),
      );
    });

    it('handles DID_FAIL_TO_RENEW: sets billing_retry', async () => {
      const findBuilder = makeSubscriptionBuilder(subscription);
      const subUpdateBuilder = makeUpdateBuilder();
      setupDbCallSequence([findBuilder, subUpdateBuilder]);

      await subscriptionService.handleWebhook('apple', {
        notification_type: 'DID_FAIL_TO_RENEW',
        data: { original_transaction_id: 'orig-tx-1' },
      });

      expect(subUpdateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'billing_retry', is_auto_renewing: false }),
      );
    });

    it('handles GRACE_PERIOD_EXPIRED: sets expired, user to free', async () => {
      setupAppleWebhookDb(subscription);

      await subscriptionService.handleWebhook('apple', {
        notification_type: 'GRACE_PERIOD_EXPIRED',
        data: { original_transaction_id: 'orig-tx-1' },
      });

      expect(mockDb).toHaveBeenCalledWith('users');
      expect(redis.del).toHaveBeenCalledWith(`user:${subscription.user_id}`);
    });

    it('handles CANCEL: sets cancelled, user to free', async () => {
      setupAppleWebhookDb(subscription);

      await subscriptionService.handleWebhook('apple', {
        notification_type: 'CANCEL',
        data: { original_transaction_id: 'orig-tx-1' },
      });

      expect(redis.del).toHaveBeenCalledWith(`user:${subscription.user_id}`);
      expect(logger.info).toHaveBeenCalledWith(
        'Apple subscription cancelled/refunded',
        expect.objectContaining({ subscriptionId: subscription.id, type: 'CANCEL' }),
      );
    });

    it('handles REFUND: sets cancelled, user to free', async () => {
      setupAppleWebhookDb(subscription);

      await subscriptionService.handleWebhook('apple', {
        notification_type: 'REFUND',
        data: { original_transaction_id: 'orig-tx-1' },
      });

      expect(redis.del).toHaveBeenCalledWith(`user:${subscription.user_id}`);
    });

    it('handles REVOKE: sets cancelled, user to free', async () => {
      setupAppleWebhookDb(subscription);

      await subscriptionService.handleWebhook('apple', {
        notification_type: 'REVOKE',
        data: { original_transaction_id: 'orig-tx-1' },
      });

      expect(redis.del).toHaveBeenCalledWith(`user:${subscription.user_id}`);
    });

    it('logs warning and returns when missing original_transaction_id', async () => {
      await subscriptionService.handleWebhook('apple', {
        notification_type: 'DID_RENEW',
        data: {},
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Apple webhook missing original_transaction_id',
        expect.any(Object),
      );
    });

    it('logs warning and returns when subscription not found', async () => {
      setupDbCallSequence([makeSubscriptionBuilder(undefined)]);

      await subscriptionService.handleWebhook('apple', {
        notification_type: 'DID_RENEW',
        original_transaction_id: 'nonexistent-tx',
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Apple webhook: subscription not found',
        expect.objectContaining({ originalTransactionId: 'nonexistent-tx' }),
      );
    });
  });

  // =======================================================================
  // handleWebhook() - Google
  // =======================================================================

  describe('handleWebhook() - Google', () => {
    const subscription = {
      id: 'sub-g-wh-1',
      user_id: 'user-g-wh-1',
      platform: 'google',
      receipt_data: JSON.stringify({
        packageName: 'com.app.test',
        productId: 'pro_monthly',
        purchaseToken: 'gtoken-123',
      }),
    };

    function encodeGoogleMessage(data: Record<string, unknown>) {
      return Buffer.from(JSON.stringify(data)).toString('base64');
    }

    function makeGooglePayload(notificationType: number, purchaseToken: string = 'gtoken-123') {
      return {
        message: {
          data: encodeGoogleMessage({
            subscriptionNotification: {
              notificationType,
              purchaseToken,
            },
          }),
        },
      };
    }

    it('handles RECOVERED (type 1): re-verifies, sets active', async () => {
      // Pre-cache Google access token so the service skips JWT signing
      (redis.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'google:access_token') return Promise.resolve('cached-google-token');
        return Promise.resolve(null);
      });

      // DB find subscription
      const findBuilder = makeSubscriptionBuilder(subscription);
      // Google re-verify: only verification fetch needed (token is cached)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          orderId: 'GPA.5678',
          productId: 'pro_monthly',
          expiryTimeMillis: String(FUTURE_MS),
          autoRenewing: true,
        }),
      });

      // Update subscription, update user
      const subUpdateBuilder = makeUpdateBuilder();
      const userUpdateBuilder = makeUpdateBuilder();
      setupDbCallSequence([findBuilder, subUpdateBuilder, userUpdateBuilder]);

      await subscriptionService.handleWebhook('google', makeGooglePayload(1));

      expect(redis.del).toHaveBeenCalledWith(`user:${subscription.user_id}`);
    });

    it('handles RENEWED (type 2): re-verifies, sets active', async () => {
      // Pre-cache Google access token so the service skips JWT signing
      (redis.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'google:access_token') return Promise.resolve('cached-google-token');
        return Promise.resolve(null);
      });

      const findBuilder = makeSubscriptionBuilder(subscription);
      // Only verification fetch needed (token is cached)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          orderId: 'GPA.9999',
          productId: 'pro_monthly',
          expiryTimeMillis: String(FUTURE_MS),
          autoRenewing: true,
        }),
      });

      const subUpdateBuilder = makeUpdateBuilder();
      const userUpdateBuilder = makeUpdateBuilder();
      setupDbCallSequence([findBuilder, subUpdateBuilder, userUpdateBuilder]);

      await subscriptionService.handleWebhook('google', makeGooglePayload(2));

      expect(redis.del).toHaveBeenCalledWith(`user:${subscription.user_id}`);
    });

    it('handles CANCELED (type 3): sets cancelled, user to free', async () => {
      const findBuilder = makeSubscriptionBuilder(subscription);
      const subUpdateBuilder = makeUpdateBuilder();
      const userUpdateBuilder = makeUpdateBuilder();
      setupDbCallSequence([findBuilder, subUpdateBuilder, userUpdateBuilder]);

      await subscriptionService.handleWebhook('google', makeGooglePayload(3));

      expect(subUpdateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled', is_auto_renewing: false }),
      );
      expect(redis.del).toHaveBeenCalledWith(`user:${subscription.user_id}`);
    });

    it('handles REVOKED (type 12): sets cancelled, user to free', async () => {
      const findBuilder = makeSubscriptionBuilder(subscription);
      const subUpdateBuilder = makeUpdateBuilder();
      const userUpdateBuilder = makeUpdateBuilder();
      setupDbCallSequence([findBuilder, subUpdateBuilder, userUpdateBuilder]);

      await subscriptionService.handleWebhook('google', makeGooglePayload(12));

      expect(subUpdateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' }),
      );
    });

    it('handles ON_HOLD (type 5): sets billing_retry', async () => {
      const findBuilder = makeSubscriptionBuilder(subscription);
      const subUpdateBuilder = makeUpdateBuilder();
      setupDbCallSequence([findBuilder, subUpdateBuilder]);

      await subscriptionService.handleWebhook('google', makeGooglePayload(5));

      expect(subUpdateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'billing_retry' }),
      );
    });

    it('handles IN_GRACE_PERIOD (type 6): sets grace_period', async () => {
      const findBuilder = makeSubscriptionBuilder(subscription);
      const subUpdateBuilder = makeUpdateBuilder();
      setupDbCallSequence([findBuilder, subUpdateBuilder]);

      await subscriptionService.handleWebhook('google', makeGooglePayload(6));

      expect(subUpdateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'grace_period' }),
      );
    });

    it('handles EXPIRED (type 13): sets expired, user to free', async () => {
      const findBuilder = makeSubscriptionBuilder(subscription);
      const subUpdateBuilder = makeUpdateBuilder();
      const userUpdateBuilder = makeUpdateBuilder();
      setupDbCallSequence([findBuilder, subUpdateBuilder, userUpdateBuilder]);

      await subscriptionService.handleWebhook('google', makeGooglePayload(13));

      expect(subUpdateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'expired', is_auto_renewing: false }),
      );
    });

    it('logs warning when message data is missing', async () => {
      await subscriptionService.handleWebhook('google', { message: {} });

      expect(logger.warn).toHaveBeenCalledWith('Google webhook: missing message data');
    });

    it('logs warning when base64 data is invalid', async () => {
      await subscriptionService.handleWebhook('google', {
        message: { data: '!!!not-valid-base64-json!!!' },
      });

      expect(logger.warn).toHaveBeenCalledWith('Google webhook: failed to decode message data');
    });
  });

  // =======================================================================
  // checkExpired()
  // =======================================================================

  describe('checkExpired()', () => {
    it('returns 0 when no expired subscriptions found', async () => {
      const selectBuilder = makeSelectBuilder([]);
      mockDb.mockReturnValueOnce(selectBuilder);

      const result = await subscriptionService.checkExpired();

      expect(result).toBe(0);
    });

    it('marks expired subscriptions and downgrades users to free', async () => {
      const expiredSubs = [
        { id: 'sub-exp-1', user_id: 'user-exp-1' },
        { id: 'sub-exp-2', user_id: 'user-exp-2' },
      ];

      // 1st call: select expired subscriptions
      const selectBuilder = makeSelectBuilder(expiredSubs);
      // 2nd call: update user_subscriptions whereIn ids
      const markExpiredBuilder = makeUpdateBuilder();
      // 3rd call: check user-exp-1 for other active subs -> none
      const activeCheckBuilder1 = makeSubscriptionBuilder(undefined);
      // 4th call: update user-exp-1 to free
      const userUpdate1 = makeUpdateBuilder();
      // 5th call: check user-exp-2 for other active subs -> none
      const activeCheckBuilder2 = makeSubscriptionBuilder(undefined);
      // 6th call: update user-exp-2 to free
      const userUpdate2 = makeUpdateBuilder();

      setupDbCallSequence([
        selectBuilder,
        markExpiredBuilder,
        activeCheckBuilder1,
        userUpdate1,
        activeCheckBuilder2,
        userUpdate2,
      ]);

      const result = await subscriptionService.checkExpired();

      expect(result).toBe(2);
      expect(redis.del).toHaveBeenCalledWith('user:user-exp-1');
      expect(redis.del).toHaveBeenCalledWith('user:user-exp-2');
      expect(logger.info).toHaveBeenCalledWith(
        'Expired subscriptions processed',
        expect.objectContaining({ count: 2 }),
      );
    });

    it('does not downgrade user who has another active subscription', async () => {
      const expiredSubs = [{ id: 'sub-exp-3', user_id: 'user-exp-3' }];

      // 1st: select expired
      const selectBuilder = makeSelectBuilder(expiredSubs);
      // 2nd: mark expired
      const markExpiredBuilder = makeUpdateBuilder();
      // 3rd: check for other active sub -> found one!
      const activeCheckBuilder = makeSubscriptionBuilder({
        id: 'sub-still-active',
        user_id: 'user-exp-3',
        status: 'active',
        expires_at: new Date(FUTURE_MS),
      });

      setupDbCallSequence([selectBuilder, markExpiredBuilder, activeCheckBuilder]);

      const result = await subscriptionService.checkExpired();

      expect(result).toBe(1);
      // Should NOT have called db('users') to downgrade
      // The 4th db call should not happen for users update
      expect(mockDb).toHaveBeenCalledTimes(3);
      // Should NOT invalidate cache since user still has active sub
      expect(redis.del).not.toHaveBeenCalledWith('user:user-exp-3');
    });

    it('deduplicates user IDs when multiple subscriptions expire for same user', async () => {
      const expiredSubs = [
        { id: 'sub-dup-1', user_id: 'user-dup' },
        { id: 'sub-dup-2', user_id: 'user-dup' },
      ];

      const selectBuilder = makeSelectBuilder(expiredSubs);
      const markExpiredBuilder = makeUpdateBuilder();
      // Only 1 active check for the deduplicated user
      const activeCheckBuilder = makeSubscriptionBuilder(undefined);
      const userUpdateBuilder = makeUpdateBuilder();

      setupDbCallSequence([selectBuilder, markExpiredBuilder, activeCheckBuilder, userUpdateBuilder]);

      const result = await subscriptionService.checkExpired();

      expect(result).toBe(2);
      // Even though 2 subs expired, only 1 user check + 1 user update
      expect(redis.del).toHaveBeenCalledTimes(1);
      expect(redis.del).toHaveBeenCalledWith('user:user-dup');
    });
  });

  // =======================================================================
  // restorePurchases()
  // =======================================================================

  describe('restorePurchases()', () => {
    it('delegates to verifyReceipt for Apple', async () => {
      const userId = 'user-restore-1';
      const receiptData = 'apple-receipt-data';

      mockAppleFetchSuccess();

      const plan = { id: 'plan-r1', apple_product_id: 'pro_monthly', is_active: true };
      const newSub = { id: 'sub-r1', user_id: userId, status: 'active' };

      setupDbCallSequence([
        makePlanBuilder(plan),
        makeSubscriptionBuilder(undefined),
        makeInsertBuilder([newSub]),
        makeUpdateBuilder(),
      ]);

      const result = await subscriptionService.restorePurchases(userId, 'apple', receiptData);

      expect(result.subscription).toEqual(newSub);
      expect(result.is_new).toBe(true);
    });

    it('delegates to verifyReceipt for Google', async () => {
      const userId = 'user-restore-2';
      const receiptData = JSON.stringify({
        packageName: 'com.app.test',
        productId: 'pro_monthly',
        purchaseToken: 'restore-token',
      });

      // Pre-cache Google access token so the service skips JWT signing
      (redis.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'google:access_token') return Promise.resolve('cached-google-token');
        return Promise.resolve(null);
      });

      // Only the verification fetch is needed since token is cached
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          orderId: 'GPA.restore',
          productId: 'pro_monthly',
          expiryTimeMillis: String(FUTURE_MS),
          autoRenewing: true,
        }),
      });

      const plan = { id: 'plan-r2', google_product_id: 'pro_monthly', is_active: true };
      const newSub = { id: 'sub-r2', user_id: userId, status: 'active' };

      setupDbCallSequence([
        makePlanBuilder(plan),
        makeSubscriptionBuilder(undefined),
        makeInsertBuilder([newSub]),
        makeUpdateBuilder(),
      ]);

      const result = await subscriptionService.restorePurchases(userId, 'google', receiptData);

      expect(result.subscription).toEqual(newSub);
      expect(result.is_new).toBe(true);
    });
  });
});

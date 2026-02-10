/**
 * Unit tests for the boost service logic.
 *
 * These tests mock the database (Knex), Redis, and logger so that no real
 * connections are needed. They verify the business logic of boost purchasing,
 * tier retrieval, score recalculation, and expiration.
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

// We need a sophisticated mock for Knex because boost.service.ts uses
// db.transaction(), chained query-builder calls, and raw operations.

// Build a chainable query builder mock
function createQueryBuilder() {
  const builder: Record<string, jest.Mock> = {
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    forUpdate: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn().mockReturnValue({ returning: jest.fn() }),
    update: jest.fn().mockReturnValue({ returning: jest.fn() }),
    count: jest.fn().mockReturnThis(),
    sum: jest.fn(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    groupBy: jest.fn(),
    del: jest.fn(),
  };
  return builder;
}

// The trx mock (transaction) works like the db mock but is passed to callbacks
function createTrxBuilder() {
  const builder: Record<string, jest.Mock> = {
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    forUpdate: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn().mockReturnValue({
      returning: jest.fn(),
    }),
    update: jest.fn().mockReturnValue({
      returning: jest.fn(),
    }),
    sum: jest.fn(),
  };

  // Make the trx callable (trx('tableName') returns builder)
  const trx = jest.fn().mockReturnValue(builder);
  (trx as any).fn = { now: jest.fn().mockReturnValue('NOW()') };
  (trx as any)._builder = builder;

  return trx;
}

// Create the main db mock
const mockDb = jest.fn().mockReturnValue(createQueryBuilder());
(mockDb as any).transaction = jest.fn();
(mockDb as any).fn = { now: jest.fn().mockReturnValue('NOW()') };
(mockDb as any).raw = jest.fn();

jest.mock('../../src/config/database', () => ({
  db: mockDb,
}));

// Now import the module under test
import * as boostService from '../../src/modules/boost/boost.service';
import { ValidationError, NotFoundError } from '../../src/shared/errors';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Boost Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-establish the default return value for mockDb after clearAllMocks
    mockDb.mockReturnValue(createQueryBuilder());
  });

  // -------------------------------------------------------------------
  // getTiers
  // -------------------------------------------------------------------

  describe('getTiers()', () => {
    it('returns all 3 boost tiers', () => {
      const tiers = boostService.getTiers();
      expect(tiers).toHaveLength(3);
    });

    it('includes small, medium, and large tiers with correct properties', () => {
      const tiers = boostService.getTiers();
      const tierNames = tiers.map((t) => t.tier);
      expect(tierNames).toContain('small');
      expect(tierNames).toContain('medium');
      expect(tierNames).toContain('large');

      const small = tiers.find((t) => t.tier === 'small')!;
      expect(small.cost).toBe(50);
      expect(small.boostValue).toBe(0.1);
      expect(small.durationHours).toBe(12);

      const medium = tiers.find((t) => t.tier === 'medium')!;
      expect(medium.cost).toBe(200);
      expect(medium.boostValue).toBe(0.3);
      expect(medium.durationHours).toBe(24);

      const large = tiers.find((t) => t.tier === 'large')!;
      expect(large.cost).toBe(500);
      expect(large.boostValue).toBe(0.5);
      expect(large.durationHours).toBe(48);
    });
  });

  // -------------------------------------------------------------------
  // isFirstBoost
  // -------------------------------------------------------------------

  describe('isFirstBoost()', () => {
    it('returns true when user has no boosts', async () => {
      const builder = createQueryBuilder();
      builder.count.mockResolvedValue([{ count: '0' }]);
      mockDb.mockReturnValue(builder);

      const result = await boostService.isFirstBoost('user-123');
      expect(result).toBe(true);
      expect(mockDb).toHaveBeenCalledWith('submission_boosts');
      expect(builder.where).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('returns false when user has existing boosts', async () => {
      const builder = createQueryBuilder();
      builder.count.mockResolvedValue([{ count: '3' }]);
      mockDb.mockReturnValue(builder);

      const result = await boostService.isFirstBoost('user-456');
      expect(result).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // getTiersForUser
  // -------------------------------------------------------------------

  describe('getTiersForUser()', () => {
    it('returns firstBoostFree=true when userId provided and user has no boosts', async () => {
      const builder = createQueryBuilder();
      builder.count.mockResolvedValue([{ count: '0' }]);
      mockDb.mockReturnValue(builder);

      const result = await boostService.getTiersForUser('user-new');
      expect(result.tiers).toHaveLength(3);
      expect(result.firstBoostFree).toBe(true);
    });

    it('returns firstBoostFree=false when userId provided and user has boosts', async () => {
      const builder = createQueryBuilder();
      builder.count.mockResolvedValue([{ count: '2' }]);
      mockDb.mockReturnValue(builder);

      const result = await boostService.getTiersForUser('user-existing');
      expect(result.tiers).toHaveLength(3);
      expect(result.firstBoostFree).toBe(false);
    });

    it('returns firstBoostFree=false when no userId provided', async () => {
      const result = await boostService.getTiersForUser();
      expect(result.tiers).toHaveLength(3);
      expect(result.firstBoostFree).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // purchaseBoost
  // -------------------------------------------------------------------

  describe('purchaseBoost()', () => {
    it('throws ValidationError for an invalid tier', async () => {
      await expect(
        boostService.purchaseBoost('user-1', 'sub-1', 'mega'),
      ).rejects.toThrow(ValidationError);

      await expect(
        boostService.purchaseBoost('user-1', 'sub-1', 'mega'),
      ).rejects.toThrow(/Invalid boost tier/);
    });

    it('throws NotFoundError when submission not found', async () => {
      const builder = createQueryBuilder();
      builder.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(builder);

      await expect(
        boostService.purchaseBoost('user-1', 'sub-missing', 'small'),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError when boost score is already at max', async () => {
      const builder = createQueryBuilder();
      builder.first.mockResolvedValue({
        id: 'sub-1',
        boost_score: '2.0',
        transcode_status: 'completed',
        moderation_status: 'approved',
        deleted_at: null,
      });
      mockDb.mockReturnValue(builder);

      await expect(
        boostService.purchaseBoost('user-1', 'sub-1', 'small'),
      ).rejects.toThrow(ValidationError);

      await expect(
        boostService.purchaseBoost('user-1', 'sub-1', 'small'),
      ).rejects.toThrow(/Boost limit reached/);
    });

    it('allows first small boost for free (cost=0, no coin debit)', async () => {
      // Mock the submission lookup (db('submissions')...)
      const submissionBuilder = createQueryBuilder();
      submissionBuilder.first.mockResolvedValue({
        id: 'sub-1',
        boost_score: '0',
        transcode_status: 'completed',
        moderation_status: 'approved',
        deleted_at: null,
      });

      // Mock isFirstBoost check (db('submission_boosts').where(...).count(...))
      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '0' }]);

      // Route table calls to the right builder
      mockDb.mockImplementation((table: string) => {
        if (table === 'submissions') return submissionBuilder;
        if (table === 'submission_boosts') return countBuilder;
        return createQueryBuilder();
      });

      const boostRecord = {
        id: 'boost-1',
        submission_id: 'sub-1',
        user_id: 'user-1',
        tier: 'small',
        coin_amount: 0,
        boost_value: 0.1,
        started_at: new Date(),
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000),
      };

      // Mock the transaction
      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        // trx('users').where(...).forUpdate().first(...) => user row
        trxBuilder.first.mockResolvedValue({
          coin_balance: 100,
          total_coins_spent: 0,
        });

        // trx('submission_boosts').insert(...).returning('*') => [boostRecord]
        trxBuilder.insert.mockReturnValue({
          returning: jest.fn().mockResolvedValue([boostRecord]),
        });

        // trx('submission_boosts').where(...).sum(...) for recalculateBoostScore
        trxBuilder.sum.mockResolvedValue([{ total: '0.1' }]);

        // trx('submissions').where(...).update(...)
        trxBuilder.update.mockResolvedValue(1);

        return callback(trx);
      });

      const result = await boostService.purchaseBoost('user-1', 'sub-1', 'small');

      expect(result).toBeDefined();
      expect(result.coin_amount).toBe(0);
      expect(result.tier).toBe('small');
    });

    it('deducts full cost for small tier when not first boost', async () => {
      // Mock the submission lookup
      const submissionBuilder = createQueryBuilder();
      submissionBuilder.first.mockResolvedValue({
        id: 'sub-1',
        boost_score: '0',
        transcode_status: 'completed',
        moderation_status: 'approved',
        deleted_at: null,
      });

      // Mock isFirstBoost check - user already has boosts
      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '1' }]);

      mockDb.mockImplementation((table: string) => {
        if (table === 'submissions') return submissionBuilder;
        if (table === 'submission_boosts') return countBuilder;
        return createQueryBuilder();
      });

      const boostRecord = {
        id: 'boost-2',
        submission_id: 'sub-1',
        user_id: 'user-1',
        tier: 'small',
        coin_amount: 50,
        boost_value: 0.1,
        started_at: new Date(),
        expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000),
      };

      let insertedCoinTransaction: any = null;
      let updatedUser: any = null;

      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        trxBuilder.first.mockResolvedValue({
          coin_balance: 200,
          total_coins_spent: 50,
        });

        // Track what gets inserted/updated
        trxBuilder.insert.mockImplementation((data: any) => {
          if (data.type === 'boost_spent') {
            insertedCoinTransaction = data;
          }
          return {
            returning: jest.fn().mockResolvedValue([boostRecord]),
          };
        });

        trxBuilder.update.mockImplementation((data: any) => {
          if (data.coin_balance !== undefined) {
            updatedUser = data;
          }
          return { returning: jest.fn().mockResolvedValue(1) };
        });

        trxBuilder.sum.mockResolvedValue([{ total: '0.1' }]);

        return callback(trx);
      });

      const result = await boostService.purchaseBoost('user-1', 'sub-1', 'small');

      expect(result).toBeDefined();
      expect(result.coin_amount).toBe(50);
      expect(insertedCoinTransaction).toBeDefined();
      expect(insertedCoinTransaction.amount).toBe(-50);
      expect(insertedCoinTransaction.balance_after).toBe(150);
      expect(updatedUser).toBeDefined();
      expect(updatedUser.coin_balance).toBe(150);
      expect(updatedUser.total_coins_spent).toBe(100);
    });

    it('deducts 200 coins for medium tier', async () => {
      const submissionBuilder = createQueryBuilder();
      submissionBuilder.first.mockResolvedValue({
        id: 'sub-1',
        boost_score: '0',
        transcode_status: 'completed',
        moderation_status: 'approved',
        deleted_at: null,
      });

      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '1' }]);

      mockDb.mockImplementation((table: string) => {
        if (table === 'submissions') return submissionBuilder;
        if (table === 'submission_boosts') return countBuilder;
        return createQueryBuilder();
      });

      const boostRecord = {
        id: 'boost-3',
        submission_id: 'sub-1',
        user_id: 'user-1',
        tier: 'medium',
        coin_amount: 200,
        boost_value: 0.3,
        started_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      let insertedCoinTransaction: any = null;

      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        trxBuilder.first.mockResolvedValue({
          coin_balance: 500,
          total_coins_spent: 0,
        });

        trxBuilder.insert.mockImplementation((data: any) => {
          if (data.type === 'boost_spent') {
            insertedCoinTransaction = data;
          }
          return {
            returning: jest.fn().mockResolvedValue([boostRecord]),
          };
        });

        trxBuilder.update.mockResolvedValue(1);
        trxBuilder.sum.mockResolvedValue([{ total: '0.3' }]);

        return callback(trx);
      });

      const result = await boostService.purchaseBoost('user-1', 'sub-1', 'medium');

      expect(result).toBeDefined();
      expect(result.coin_amount).toBe(200);
      expect(insertedCoinTransaction).toBeDefined();
      expect(insertedCoinTransaction.amount).toBe(-200);
      expect(insertedCoinTransaction.balance_after).toBe(300);
    });

    it('deducts 500 coins for large tier', async () => {
      const submissionBuilder = createQueryBuilder();
      submissionBuilder.first.mockResolvedValue({
        id: 'sub-1',
        boost_score: '0',
        transcode_status: 'completed',
        moderation_status: 'approved',
        deleted_at: null,
      });

      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '1' }]);

      mockDb.mockImplementation((table: string) => {
        if (table === 'submissions') return submissionBuilder;
        if (table === 'submission_boosts') return countBuilder;
        return createQueryBuilder();
      });

      const boostRecord = {
        id: 'boost-4',
        submission_id: 'sub-1',
        user_id: 'user-1',
        tier: 'large',
        coin_amount: 500,
        boost_value: 0.5,
        started_at: new Date(),
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000),
      };

      let insertedCoinTransaction: any = null;

      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        trxBuilder.first.mockResolvedValue({
          coin_balance: 1000,
          total_coins_spent: 0,
        });

        trxBuilder.insert.mockImplementation((data: any) => {
          if (data.type === 'boost_spent') {
            insertedCoinTransaction = data;
          }
          return {
            returning: jest.fn().mockResolvedValue([boostRecord]),
          };
        });

        trxBuilder.update.mockResolvedValue(1);
        trxBuilder.sum.mockResolvedValue([{ total: '0.5' }]);

        return callback(trx);
      });

      const result = await boostService.purchaseBoost('user-1', 'sub-1', 'large');

      expect(result).toBeDefined();
      expect(result.coin_amount).toBe(500);
      expect(insertedCoinTransaction).toBeDefined();
      expect(insertedCoinTransaction.amount).toBe(-500);
      expect(insertedCoinTransaction.balance_after).toBe(500);
    });

    it('throws ValidationError when user has insufficient balance', async () => {
      const submissionBuilder = createQueryBuilder();
      submissionBuilder.first.mockResolvedValue({
        id: 'sub-1',
        boost_score: '0',
        transcode_status: 'completed',
        moderation_status: 'approved',
        deleted_at: null,
      });

      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '1' }]);

      mockDb.mockImplementation((table: string) => {
        if (table === 'submissions') return submissionBuilder;
        if (table === 'submission_boosts') return countBuilder;
        return createQueryBuilder();
      });

      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        trxBuilder.first.mockResolvedValue({
          coin_balance: 10,
          total_coins_spent: 0,
        });

        return callback(trx);
      });

      await expect(
        boostService.purchaseBoost('user-1', 'sub-1', 'small'),
      ).rejects.toThrow(ValidationError);

      await expect(
        boostService.purchaseBoost('user-1', 'sub-1', 'small'),
      ).rejects.toThrow(/Insufficient balance/);
    });

    it('throws NotFoundError when user not found in transaction', async () => {
      const submissionBuilder = createQueryBuilder();
      submissionBuilder.first.mockResolvedValue({
        id: 'sub-1',
        boost_score: '0',
        transcode_status: 'completed',
        moderation_status: 'approved',
        deleted_at: null,
      });

      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '1' }]);

      mockDb.mockImplementation((table: string) => {
        if (table === 'submissions') return submissionBuilder;
        if (table === 'submission_boosts') return countBuilder;
        return createQueryBuilder();
      });

      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        // User not found
        trxBuilder.first.mockResolvedValue(undefined);

        return callback(trx);
      });

      await expect(
        boostService.purchaseBoost('user-ghost', 'sub-1', 'small'),
      ).rejects.toThrow(NotFoundError);
    });

    it('sets correct expires_at based on tier durationHours', async () => {
      const submissionBuilder = createQueryBuilder();
      submissionBuilder.first.mockResolvedValue({
        id: 'sub-1',
        boost_score: '0',
        transcode_status: 'completed',
        moderation_status: 'approved',
        deleted_at: null,
      });

      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '1' }]);

      mockDb.mockImplementation((table: string) => {
        if (table === 'submissions') return submissionBuilder;
        if (table === 'submission_boosts') return countBuilder;
        return createQueryBuilder();
      });

      let insertedBoostData: any = null;

      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        trxBuilder.first.mockResolvedValue({
          coin_balance: 1000,
          total_coins_spent: 0,
        });

        trxBuilder.insert.mockImplementation((data: any) => {
          // Capture the boost insert (has expires_at)
          if (data.expires_at) {
            insertedBoostData = data;
          }
          const record = {
            id: 'boost-duration',
            ...data,
          };
          return {
            returning: jest.fn().mockResolvedValue([record]),
          };
        });

        trxBuilder.update.mockResolvedValue(1);
        trxBuilder.sum.mockResolvedValue([{ total: '0.5' }]);

        return callback(trx);
      });

      const beforeTime = Date.now();
      await boostService.purchaseBoost('user-1', 'sub-1', 'large');
      const afterTime = Date.now();

      expect(insertedBoostData).toBeDefined();
      expect(insertedBoostData.expires_at).toBeInstanceOf(Date);

      // large tier = 48 hours
      const expectedDurationMs = 48 * 60 * 60 * 1000;
      const expiresAtMs = insertedBoostData.expires_at.getTime();
      const startedAtMs = insertedBoostData.started_at.getTime();
      const actualDurationMs = expiresAtMs - startedAtMs;

      expect(actualDurationMs).toBe(expectedDurationMs);
    });

    it('recalculates boost_score after inserting boost record', async () => {
      const submissionBuilder = createQueryBuilder();
      submissionBuilder.first.mockResolvedValue({
        id: 'sub-1',
        boost_score: '0',
        transcode_status: 'completed',
        moderation_status: 'approved',
        deleted_at: null,
      });

      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '1' }]);

      mockDb.mockImplementation((table: string) => {
        if (table === 'submissions') return submissionBuilder;
        if (table === 'submission_boosts') return countBuilder;
        return createQueryBuilder();
      });

      let submissionUpdateData: any = null;

      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        trxBuilder.first.mockResolvedValue({
          coin_balance: 1000,
          total_coins_spent: 0,
        });

        trxBuilder.insert.mockImplementation((data: any) => {
          const record = {
            id: 'boost-recalc',
            ...data,
          };
          return {
            returning: jest.fn().mockResolvedValue([record]),
          };
        });

        // recalculateBoostScore sum returns 0.8
        trxBuilder.sum.mockResolvedValue([{ total: '0.8' }]);

        trxBuilder.update.mockImplementation((data: any) => {
          if (data.boost_score !== undefined) {
            submissionUpdateData = data;
          }
          return { returning: jest.fn().mockResolvedValue(1) };
        });

        return callback(trx);
      });

      await boostService.purchaseBoost('user-1', 'sub-1', 'medium');

      expect(submissionUpdateData).toBeDefined();
      expect(submissionUpdateData.boost_score).toBe(0.8);
    });
  });

  // -------------------------------------------------------------------
  // getSubmissionBoosts
  // -------------------------------------------------------------------

  describe('getSubmissionBoosts()', () => {
    it('returns only active (non-expired) boosts', async () => {
      const activeBoosts = [
        {
          id: 'boost-active-1',
          submission_id: 'sub-1',
          user_id: 'user-1',
          tier: 'small',
          coin_amount: 50,
          boost_value: 0.1,
          started_at: new Date(),
          expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000),
        },
        {
          id: 'boost-active-2',
          submission_id: 'sub-1',
          user_id: 'user-2',
          tier: 'medium',
          coin_amount: 200,
          boost_value: 0.3,
          started_at: new Date(),
          expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000),
        },
      ];

      const builder = createQueryBuilder();
      builder.orderBy.mockResolvedValue(activeBoosts);
      mockDb.mockReturnValue(builder);

      const result = await boostService.getSubmissionBoosts('sub-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('boost-active-1');
      expect(result[1].id).toBe('boost-active-2');
      expect(mockDb).toHaveBeenCalledWith('submission_boosts');
      expect(builder.where).toHaveBeenCalledWith('submission_id', 'sub-1');
    });

    it('returns empty array when no boosts exist', async () => {
      const builder = createQueryBuilder();
      builder.orderBy.mockResolvedValue([]);
      mockDb.mockReturnValue(builder);

      const result = await boostService.getSubmissionBoosts('sub-no-boosts');

      expect(result).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------
  // getBoostHistory
  // -------------------------------------------------------------------

  describe('getBoostHistory()', () => {
    it('returns paginated boost history for a user', async () => {
      const boosts = [
        {
          id: 'boost-h1',
          submission_id: 'sub-1',
          user_id: 'user-1',
          tier: 'small',
          coin_amount: 50,
          boost_value: 0.1,
          started_at: new Date(),
          expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000),
        },
      ];

      // First call: count query
      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '1' }]);

      // Second call: data query
      const dataBuilder = createQueryBuilder();
      dataBuilder.select.mockResolvedValue(boosts);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return countBuilder;
        return dataBuilder;
      });

      const result = await boostService.getBoostHistory('user-1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total_pages).toBe(1);
    });

    it('returns empty data when user has no boosts', async () => {
      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '0' }]);

      const dataBuilder = createQueryBuilder();
      dataBuilder.select.mockResolvedValue([]);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return countBuilder;
        return dataBuilder;
      });

      const result = await boostService.getBoostHistory('user-empty', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // recalculateBoostScore
  // -------------------------------------------------------------------

  describe('recalculateBoostScore()', () => {
    it('sums active boost values correctly', async () => {
      const trx = createTrxBuilder();
      const trxBuilder = (trx as any)._builder;

      trxBuilder.sum.mockResolvedValue([{ total: '0.7' }]);

      const score = await boostService.recalculateBoostScore(trx as any, 'sub-1');

      expect(score).toBe(0.7);
      expect(trx).toHaveBeenCalledWith('submission_boosts');
      expect(trxBuilder.where).toHaveBeenCalledWith('submission_id', 'sub-1');
    });

    it('caps the score at MAX_BOOST_SCORE (2.0)', async () => {
      const trx = createTrxBuilder();
      const trxBuilder = (trx as any)._builder;

      trxBuilder.sum.mockResolvedValue([{ total: '3.5' }]);

      const score = await boostService.recalculateBoostScore(trx as any, 'sub-1');

      expect(score).toBe(2.0);
    });

    it('returns 0 when there are no active boosts', async () => {
      const trx = createTrxBuilder();
      const trxBuilder = (trx as any)._builder;

      trxBuilder.sum.mockResolvedValue([{ total: null }]);

      const score = await boostService.recalculateBoostScore(trx as any, 'sub-1');

      expect(score).toBe(0);
    });

    it('handles string "0" total correctly', async () => {
      const trx = createTrxBuilder();
      const trxBuilder = (trx as any)._builder;

      trxBuilder.sum.mockResolvedValue([{ total: '0' }]);

      const score = await boostService.recalculateBoostScore(trx as any, 'sub-1');

      expect(score).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // expireBoosts
  // -------------------------------------------------------------------

  describe('expireBoosts()', () => {
    it('returns 0 when no expired boosts exist', async () => {
      const builder = createQueryBuilder();
      builder.groupBy.mockResolvedValue([]);
      mockDb.mockReturnValue(builder);

      const result = await boostService.expireBoosts();

      expect(result).toBe(0);
    });

    it('recalculates affected submissions and deletes expired boosts', async () => {
      const affectedSubmissions = [
        { submission_id: 'sub-1' },
        { submission_id: 'sub-2' },
      ];

      // Track mockDb calls to route each to the right builder
      let dbCallIndex = 0;
      mockDb.mockImplementation((table: string) => {
        dbCallIndex++;

        // Call 1: find expired boosts (groupBy)
        if (dbCallIndex === 1) {
          const builder = createQueryBuilder();
          builder.groupBy.mockResolvedValue(affectedSubmissions);
          return builder;
        }

        // Calls 2-3: recalculateBoostScore for sub-1 (sum)
        if (dbCallIndex === 2) {
          const builder = createQueryBuilder();
          builder.sum.mockResolvedValue([{ total: '0.3' }]);
          return builder;
        }

        // Calls 3: update submissions sub-1
        if (dbCallIndex === 3) {
          const builder = createQueryBuilder();
          builder.update.mockResolvedValue(1);
          return builder;
        }

        // Call 4: recalculateBoostScore for sub-2 (sum)
        if (dbCallIndex === 4) {
          const builder = createQueryBuilder();
          builder.sum.mockResolvedValue([{ total: '0' }]);
          return builder;
        }

        // Call 5: update submissions sub-2
        if (dbCallIndex === 5) {
          const builder = createQueryBuilder();
          builder.update.mockResolvedValue(1);
          return builder;
        }

        // Call 6: delete expired records
        if (dbCallIndex === 6) {
          const builder = createQueryBuilder();
          builder.del.mockResolvedValue(3);
          return builder;
        }

        return createQueryBuilder();
      });

      const result = await boostService.expireBoosts();

      expect(result).toBe(3);
    });

    it('logs info when expired boosts are cleaned up', async () => {
      const { logger } = require('../../src/config/logger');

      const affectedSubmissions = [{ submission_id: 'sub-1' }];

      let dbCallIndex = 0;
      mockDb.mockImplementation(() => {
        dbCallIndex++;

        if (dbCallIndex === 1) {
          const builder = createQueryBuilder();
          builder.groupBy.mockResolvedValue(affectedSubmissions);
          return builder;
        }

        if (dbCallIndex === 2) {
          const builder = createQueryBuilder();
          builder.sum.mockResolvedValue([{ total: '0.1' }]);
          return builder;
        }

        if (dbCallIndex === 3) {
          const builder = createQueryBuilder();
          builder.update.mockResolvedValue(1);
          return builder;
        }

        if (dbCallIndex === 4) {
          const builder = createQueryBuilder();
          builder.del.mockResolvedValue(2);
          return builder;
        }

        return createQueryBuilder();
      });

      await boostService.expireBoosts();

      expect(logger.info).toHaveBeenCalledWith(
        'Expired boosts cleaned up',
        expect.objectContaining({
          submissionsAffected: 1,
          boostsDeleted: 2,
        }),
      );
    });
  });
});

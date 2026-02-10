/**
 * Unit tests for the daily-reward service logic.
 *
 * These tests mock the database (Knex), Redis, logger, and the creditCoins
 * dependency so that no real connections are needed. They verify the business
 * logic of claiming daily login rewards and checking claim status.
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

// Mock creditCoins from coin.service
jest.mock('../../src/modules/coin/coin.service', () => ({
  creditCoins: jest.fn().mockResolvedValue({
    id: 'tx-mock',
    amount: 3,
    balance_after: 3,
  }),
}));

// Build a chainable query builder mock for the db
function createQueryBuilder() {
  const builder: Record<string, jest.Mock> = {
    where: jest.fn().mockReturnThis(),
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

// Create the main db mock
const mockDb = jest.fn().mockReturnValue(createQueryBuilder());
(mockDb as any).transaction = jest.fn();
(mockDb as any).fn = { now: jest.fn().mockReturnValue('NOW()') };
(mockDb as any).raw = jest.fn();

jest.mock('../../src/config/database', () => ({
  db: mockDb,
}));

// Now import the module under test and its mocked dependencies
import { claimDailyReward, getDailyRewardStatus } from '../../src/modules/coin/daily-reward.service';
import { creditCoins } from '../../src/modules/coin/coin.service';
import { logger } from '../../src/config/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns today's date as YYYY-MM-DD, matching the service's logic. */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Daily Reward Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------
  // claimDailyReward
  // -------------------------------------------------------------------

  describe('claimDailyReward()', () => {
    it('returns { claimed: true, amount: 3 } on first successful claim', async () => {
      const userId = 'user-daily-1';
      const mockReward = {
        id: 'reward-1',
        user_id: userId,
        reward_date: getTodayString(),
        coin_amount: 3,
      };

      const mockReturning = jest.fn().mockResolvedValue([mockReward]);
      const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
      const qb = createQueryBuilder();
      qb.insert = mockInsert;
      mockDb.mockReturnValue(qb);

      const result = await claimDailyReward(userId);

      expect(result).toEqual({ claimed: true, amount: 3 });
    });

    it('inserts into daily_login_rewards table with correct user_id, date, and amount', async () => {
      const userId = 'user-daily-2';
      const today = getTodayString();
      const mockReward = {
        id: 'reward-2',
        user_id: userId,
        reward_date: today,
        coin_amount: 3,
      };

      const mockReturning = jest.fn().mockResolvedValue([mockReward]);
      const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
      const qb = createQueryBuilder();
      qb.insert = mockInsert;
      mockDb.mockReturnValue(qb);

      await claimDailyReward(userId);

      // Verify db was called with the correct table name
      expect(mockDb).toHaveBeenCalledWith('daily_login_rewards');

      // Verify insert was called with correct payload
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: userId,
        reward_date: today,
        coin_amount: 3,
      });

      // Verify returning('*') was called
      expect(mockReturning).toHaveBeenCalledWith('*');
    });

    it('calls creditCoins with correct arguments after successful insert', async () => {
      const userId = 'user-daily-3';
      const mockReward = {
        id: 'reward-3',
        user_id: userId,
        reward_date: getTodayString(),
        coin_amount: 3,
      };

      const mockReturning = jest.fn().mockResolvedValue([mockReward]);
      const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
      const qb = createQueryBuilder();
      qb.insert = mockInsert;
      mockDb.mockReturnValue(qb);

      await claimDailyReward(userId);

      expect(creditCoins).toHaveBeenCalledTimes(1);
      expect(creditCoins).toHaveBeenCalledWith(
        userId,
        3,
        'reward',
        'daily_login',
        'reward-3',
        'Daily login bonus',
      );
    });

    it('returns { claimed: false, amount: 0 } when already claimed today (error code 23505)', async () => {
      const userId = 'user-daily-4';

      const uniqueViolation = new Error('duplicate key value violates unique constraint');
      (uniqueViolation as any).code = '23505';

      const mockReturning = jest.fn().mockRejectedValue(uniqueViolation);
      const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
      const qb = createQueryBuilder();
      qb.insert = mockInsert;
      mockDb.mockReturnValue(qb);

      const result = await claimDailyReward(userId);

      expect(result).toEqual({ claimed: false, amount: 0 });
    });

    it('re-throws non-unique-constraint errors', async () => {
      const userId = 'user-daily-5';

      const dbError = new Error('connection refused');
      (dbError as any).code = 'ECONNREFUSED';

      const mockReturning = jest.fn().mockRejectedValue(dbError);
      const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
      const qb = createQueryBuilder();
      qb.insert = mockInsert;
      mockDb.mockReturnValue(qb);

      await expect(claimDailyReward(userId)).rejects.toThrow('connection refused');
    });

    it('re-throws errors without a code property', async () => {
      const userId = 'user-daily-6';

      const genericError = new Error('something went wrong');

      const mockReturning = jest.fn().mockRejectedValue(genericError);
      const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
      const qb = createQueryBuilder();
      qb.insert = mockInsert;
      mockDb.mockReturnValue(qb);

      await expect(claimDailyReward(userId)).rejects.toThrow('something went wrong');
    });

    it('logs info on successful claim with userId, amount, and date', async () => {
      const userId = 'user-daily-7';
      const today = getTodayString();
      const mockReward = {
        id: 'reward-7',
        user_id: userId,
        reward_date: today,
        coin_amount: 3,
      };

      const mockReturning = jest.fn().mockResolvedValue([mockReward]);
      const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
      const qb = createQueryBuilder();
      qb.insert = mockInsert;
      mockDb.mockReturnValue(qb);

      await claimDailyReward(userId);

      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith('Daily login reward claimed', {
        userId,
        amount: 3,
        date: today,
      });
    });

    it('does not log when claim fails due to unique constraint', async () => {
      const userId = 'user-daily-8';

      const uniqueViolation = new Error('duplicate key');
      (uniqueViolation as any).code = '23505';

      const mockReturning = jest.fn().mockRejectedValue(uniqueViolation);
      const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
      const qb = createQueryBuilder();
      qb.insert = mockInsert;
      mockDb.mockReturnValue(qb);

      await claimDailyReward(userId);

      expect(logger.info).not.toHaveBeenCalled();
    });

    it('does not call creditCoins when insert fails with unique constraint', async () => {
      const userId = 'user-daily-9';

      const uniqueViolation = new Error('duplicate key');
      (uniqueViolation as any).code = '23505';

      const mockReturning = jest.fn().mockRejectedValue(uniqueViolation);
      const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
      const qb = createQueryBuilder();
      qb.insert = mockInsert;
      mockDb.mockReturnValue(qb);

      await claimDailyReward(userId);

      expect(creditCoins).not.toHaveBeenCalled();
    });

    it('propagates creditCoins failure without catching it', async () => {
      const userId = 'user-daily-10';
      const mockReward = {
        id: 'reward-10',
        user_id: userId,
        reward_date: getTodayString(),
        coin_amount: 3,
      };

      const mockReturning = jest.fn().mockResolvedValue([mockReward]);
      const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
      const qb = createQueryBuilder();
      qb.insert = mockInsert;
      mockDb.mockReturnValue(qb);

      const creditError = new Error('creditCoins internal failure');
      (creditCoins as jest.Mock).mockRejectedValueOnce(creditError);

      await expect(claimDailyReward(userId)).rejects.toThrow('creditCoins internal failure');
    });
  });

  // -------------------------------------------------------------------
  // getDailyRewardStatus
  // -------------------------------------------------------------------

  describe('getDailyRewardStatus()', () => {
    it('returns { claimedToday: true, amount: 3 } when reward exists for today', async () => {
      const userId = 'user-status-1';
      const existingReward = {
        id: 'reward-s1',
        user_id: userId,
        reward_date: getTodayString(),
        coin_amount: 3,
      };

      const qb = createQueryBuilder();
      qb.first.mockResolvedValue(existingReward);
      mockDb.mockReturnValue(qb);

      const result = await getDailyRewardStatus(userId);

      expect(result).toEqual({ claimedToday: true, amount: 3 });
    });

    it('returns { claimedToday: false, amount: 3 } when no reward for today', async () => {
      const userId = 'user-status-2';

      const qb = createQueryBuilder();
      qb.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(qb);

      const result = await getDailyRewardStatus(userId);

      expect(result).toEqual({ claimedToday: false, amount: 3 });
    });

    it('always returns amount: 3 regardless of claim status (claimed)', async () => {
      const userId = 'user-status-3a';
      const qb = createQueryBuilder();
      qb.first.mockResolvedValue({ id: 'reward-x', user_id: userId });
      mockDb.mockReturnValue(qb);

      const result = await getDailyRewardStatus(userId);
      expect(result.amount).toBe(3);
    });

    it('always returns amount: 3 regardless of claim status (not claimed)', async () => {
      const userId = 'user-status-3b';
      const qb = createQueryBuilder();
      qb.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(qb);

      const result = await getDailyRewardStatus(userId);
      expect(result.amount).toBe(3);
    });

    it('queries with correct user_id and today\'s date', async () => {
      const userId = 'user-status-4';
      const today = getTodayString();

      const qb = createQueryBuilder();
      qb.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(qb);

      await getDailyRewardStatus(userId);

      expect(mockDb).toHaveBeenCalledWith('daily_login_rewards');
      expect(qb.where).toHaveBeenCalledWith({
        user_id: userId,
        reward_date: today,
      });
      expect(qb.first).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------

  describe('edge cases', () => {
    it('different users can each claim on the same day', async () => {
      const userA = 'user-edge-a';
      const userB = 'user-edge-b';

      const setupInsertMock = (userId: string, rewardId: string) => {
        const mockReward = {
          id: rewardId,
          user_id: userId,
          reward_date: getTodayString(),
          coin_amount: 3,
        };
        const mockReturning = jest.fn().mockResolvedValue([mockReward]);
        const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
        const qb = createQueryBuilder();
        qb.insert = mockInsert;
        mockDb.mockReturnValue(qb);
      };

      // User A claims
      setupInsertMock(userA, 'reward-a');
      const resultA = await claimDailyReward(userA);
      expect(resultA).toEqual({ claimed: true, amount: 3 });

      // User B claims
      setupInsertMock(userB, 'reward-b');
      const resultB = await claimDailyReward(userB);
      expect(resultB).toEqual({ claimed: true, amount: 3 });
    });

    it('same user claiming twice returns false on the second attempt', async () => {
      const userId = 'user-edge-double';
      const mockReward = {
        id: 'reward-double',
        user_id: userId,
        reward_date: getTodayString(),
        coin_amount: 3,
      };

      // First claim succeeds
      const mockReturningSuccess = jest.fn().mockResolvedValue([mockReward]);
      const mockInsertSuccess = jest.fn().mockReturnValue({ returning: mockReturningSuccess });
      const qbSuccess = createQueryBuilder();
      qbSuccess.insert = mockInsertSuccess;
      mockDb.mockReturnValue(qbSuccess);

      const first = await claimDailyReward(userId);
      expect(first).toEqual({ claimed: true, amount: 3 });

      // Second claim hits unique constraint
      const uniqueViolation = new Error('duplicate key');
      (uniqueViolation as any).code = '23505';
      const mockReturningFail = jest.fn().mockRejectedValue(uniqueViolation);
      const mockInsertFail = jest.fn().mockReturnValue({ returning: mockReturningFail });
      const qbFail = createQueryBuilder();
      qbFail.insert = mockInsertFail;
      mockDb.mockReturnValue(qbFail);

      const second = await claimDailyReward(userId);
      expect(second).toEqual({ claimed: false, amount: 0 });
    });

    it('date format matches YYYY-MM-DD pattern', async () => {
      const userId = 'user-edge-date';

      const qb = createQueryBuilder();
      qb.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(qb);

      await getDailyRewardStatus(userId);

      const whereCall = qb.where.mock.calls[0][0];
      const dateValue = whereCall.reward_date;

      // Verify date format is YYYY-MM-DD
      expect(dateValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('insert payload date format matches YYYY-MM-DD pattern', async () => {
      const userId = 'user-edge-date-insert';
      const mockReward = {
        id: 'reward-date',
        user_id: userId,
        reward_date: getTodayString(),
        coin_amount: 3,
      };

      const mockReturning = jest.fn().mockResolvedValue([mockReward]);
      const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
      const qb = createQueryBuilder();
      qb.insert = mockInsert;
      mockDb.mockReturnValue(qb);

      await claimDailyReward(userId);

      const insertPayload = mockInsert.mock.calls[0][0];
      expect(insertPayload.reward_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('uses the reward.id from the insert result when calling creditCoins', async () => {
      const userId = 'user-edge-reward-id';
      const specificRewardId = 'reward-uuid-specific-12345';
      const mockReward = {
        id: specificRewardId,
        user_id: userId,
        reward_date: getTodayString(),
        coin_amount: 3,
      };

      const mockReturning = jest.fn().mockResolvedValue([mockReward]);
      const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
      const qb = createQueryBuilder();
      qb.insert = mockInsert;
      mockDb.mockReturnValue(qb);

      await claimDailyReward(userId);

      // The 5th argument to creditCoins should be the reward.id from the insert
      expect(creditCoins).toHaveBeenCalledWith(
        userId,
        3,
        'reward',
        'daily_login',
        specificRewardId,
        'Daily login bonus',
      );
    });
  });
});

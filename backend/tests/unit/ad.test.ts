/**
 * Unit tests for the ad service logic.
 *
 * These tests mock the database (Knex), Redis, logger, and the coin service
 * so that no real connections are needed. They verify the business logic of
 * ad event logging, reward claiming (with daily limits), daily stats, and
 * ad config based on subscription tier.
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
    incrby: jest.fn().mockResolvedValue(1),
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

// Mock the dynamic import of coin.service
jest.mock('../../src/modules/coin/coin.service', () => ({
  creditCoins: jest.fn().mockResolvedValue({
    id: 'tx-mock',
    amount: 10,
    balance_after: 10,
  }),
}));

// Build a chainable query builder mock
function createQueryBuilder() {
  const builder: Record<string, jest.Mock> = {
    where: jest.fn().mockReturnThis(),
    forUpdate: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn().mockReturnValue({ returning: jest.fn() }),
    update: jest.fn().mockReturnValue({ returning: jest.fn() }),
    count: jest.fn().mockResolvedValue([{ count: '0' }]),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };
  return builder;
}

// Create the main db mock
const mockDb = jest.fn().mockReturnValue(createQueryBuilder());
(mockDb as any).transaction = jest.fn();
(mockDb as any).fn = { now: jest.fn().mockReturnValue('NOW()') };
(mockDb as any).raw = jest.fn().mockReturnValue('RAW_SQL');

jest.mock('../../src/config/database', () => ({
  db: mockDb,
}));

// Now import the module under test
import * as adService from '../../src/modules/ad/ad.service';
import { ValidationError, NotFoundError } from '../../src/shared/errors';
import { redis } from '../../src/config/redis';
import { creditCoins } from '../../src/modules/coin/coin.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sets up the chainable db mock for a specific set of calls.
 *
 * The ad service makes multiple db() calls per method invocation.
 * This helper lets us define what each successive db('table') call returns.
 */
function setupDbCallSequence(calls: Array<{
  table: string;
  result: any;
  countResult?: any;
}>) {
  let callIndex = 0;
  mockDb.mockImplementation((table: string) => {
    const builder = createQueryBuilder();
    const callDef = calls[callIndex];
    callIndex++;

    if (!callDef) {
      // Default fallback for unexpected calls
      builder.first.mockResolvedValue(undefined);
      builder.count.mockResolvedValue([{ count: '0' }]);
      builder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'default-id' }]),
      });
      return builder;
    }

    // Set up .first() to resolve with the result
    builder.first.mockResolvedValue(callDef.result);

    // Set up .count() to resolve with countResult or default
    if (callDef.countResult !== undefined) {
      builder.count.mockResolvedValue([{ count: String(callDef.countResult) }]);
    }

    // Set up .insert().returning('*') to resolve with result wrapped in array
    builder.insert.mockReturnValue({
      returning: jest.fn().mockResolvedValue(
        Array.isArray(callDef.result) ? callDef.result : [callDef.result],
      ),
    });

    // Make orderBy still chainable but eventually resolve first
    builder.orderBy.mockImplementation(() => {
      return {
        first: jest.fn().mockResolvedValue(callDef.result),
      };
    });

    return builder;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Ad Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mockDb to return a fresh query builder by default
    mockDb.mockReturnValue(createQueryBuilder());
  });

  // -----------------------------------------------------------------------
  // logAdEvent
  // -----------------------------------------------------------------------

  describe('logAdEvent()', () => {
    it('inserts an event with all fields and returns the inserted row', async () => {
      const mockEvent = {
        id: 'evt-1',
        user_id: 'user-1',
        ad_type: 'rewarded',
        placement: 'super_vote',
        ad_network: 'admob',
        event_type: 'completed',
        reward_type: 'super_vote',
        reward_amount: 1,
        created_at: new Date(),
      };

      const builder = createQueryBuilder();
      builder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockEvent]),
      });
      mockDb.mockReturnValue(builder);

      const result = await adService.logAdEvent(
        'user-1',
        'rewarded',
        'super_vote',
        'completed',
        'super_vote',
        1,
      );

      expect(result).toEqual(mockEvent);
      expect(mockDb).toHaveBeenCalledWith('ad_events');
      expect(builder.insert).toHaveBeenCalledWith({
        user_id: 'user-1',
        ad_type: 'rewarded',
        placement: 'super_vote',
        ad_network: 'admob',
        event_type: 'completed',
        reward_type: 'super_vote',
        reward_amount: 1,
      });
    });

    it('handles null userId correctly', async () => {
      const mockEvent = {
        id: 'evt-2',
        user_id: null,
        ad_type: 'banner',
        placement: 'feed_bottom',
        ad_network: 'admob',
        event_type: 'impression',
        reward_type: null,
        reward_amount: null,
        created_at: new Date(),
      };

      const builder = createQueryBuilder();
      builder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockEvent]),
      });
      mockDb.mockReturnValue(builder);

      const result = await adService.logAdEvent(
        null,
        'banner',
        'feed_bottom',
        'impression',
      );

      expect(result).toEqual(mockEvent);
      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: null,
          reward_type: null,
          reward_amount: null,
        }),
      );
    });

    it('handles optional reward fields (defaults to null)', async () => {
      const mockEvent = {
        id: 'evt-3',
        user_id: 'user-2',
        ad_type: 'interstitial',
        placement: 'after_vote',
        ad_network: 'admob',
        event_type: 'impression',
        reward_type: null,
        reward_amount: null,
        created_at: new Date(),
      };

      const builder = createQueryBuilder();
      builder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockEvent]),
      });
      mockDb.mockReturnValue(builder);

      const result = await adService.logAdEvent(
        'user-2',
        'interstitial',
        'after_vote',
        'impression',
      );

      expect(result.reward_type).toBeNull();
      expect(result.reward_amount).toBeNull();
      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          reward_type: null,
          reward_amount: null,
        }),
      );
    });

    it('passes ad_network as "admob"', async () => {
      const builder = createQueryBuilder();
      builder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'evt-4' }]),
      });
      mockDb.mockReturnValue(builder);

      await adService.logAdEvent('user-3', 'native', 'feed_bottom', 'click');

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ ad_network: 'admob' }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // claimReward
  // -----------------------------------------------------------------------

  describe('claimReward()', () => {
    it('throws ValidationError when no recent ad completion found', async () => {
      // claimReward makes: 1) db('ad_events') for recent completion check
      // recentCompletion query chain ends with .orderBy().first() => undefined
      const builder = createQueryBuilder();
      builder.orderBy.mockReturnValue({
        first: jest.fn().mockResolvedValue(undefined),
      });
      mockDb.mockReturnValue(builder);

      await expect(
        adService.claimReward('user-1', 'rewarded', 'super_vote'),
      ).rejects.toThrow(ValidationError);

      await expect(
        adService.claimReward('user-1', 'rewarded', 'super_vote'),
      ).rejects.toThrow(/No eligible ad completion/);
    });

    it('returns super_vote reward for super_vote placement', async () => {
      // Call sequence:
      // 1) db('ad_events') - recent completion check -> found
      // 2) db('ad_events') - getTodayRewardCount('super_vote') -> count=0
      // 3) db('ad_events') - logAdEvent insert -> inserted row
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          // Recent completion check: .where().where().where().where().where().orderBy().first()
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent', event_type: 'completed' }),
          });
        } else if (callIndex === 2) {
          // getTodayRewardCount: .where().where().where().where().count()
          builder.count.mockResolvedValue([{ count: '0' }]);
        } else if (callIndex === 3) {
          // logAdEvent: .insert().returning()
          builder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 'evt-reward',
              reward_type: 'super_vote',
              reward_amount: 1,
            }]),
          });
        }

        return builder;
      });

      const result = await adService.claimReward('user-1', 'rewarded', 'super_vote');

      expect(result.reward_type).toBe('super_vote');
      expect(result.reward_amount).toBe(1);
      expect(result.remaining_today).toBe(4); // MAX 5 - 0 used - 1 just claimed
    });

    it('returns bonus_coins reward for bonus_coins placement', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          builder.count.mockResolvedValue([{ count: '0' }]);
        } else if (callIndex === 3) {
          builder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: 'evt-reward',
              reward_type: 'bonus_coins',
              reward_amount: 10,
            }]),
          });
        }

        return builder;
      });

      const result = await adService.claimReward('user-1', 'rewarded', 'bonus_coins');

      expect(result.reward_type).toBe('bonus_coins');
      expect(result.reward_amount).toBe(10);
      expect(result.remaining_today).toBe(9); // MAX 10 - 0 used - 1 just claimed
    });

    it('grants super vote via redis.incrby for super_vote placement', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          builder.count.mockResolvedValue([{ count: '0' }]);
        } else {
          builder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'evt-new' }]),
          });
        }

        return builder;
      });

      await adService.claimReward('user-sv', 'rewarded', 'super_vote');

      expect(redis.incrby).toHaveBeenCalledWith('user:user-sv:super_votes', 1);
    });

    it('credits bonus coins via creditCoins for non-super_vote placement', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          builder.count.mockResolvedValue([{ count: '0' }]);
        } else {
          builder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'evt-new' }]),
          });
        }

        return builder;
      });

      await adService.claimReward('user-bc', 'rewarded', 'bonus_coins');

      expect(creditCoins).toHaveBeenCalledWith(
        'user-bc',
        10,
        'reward',
        'ad_reward',
        undefined,
        'Bonus coins from watching ad',
      );
    });

    it('calculates remaining_today correctly when some rewards already claimed', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          // Already used 3 super_vote rewards today
          builder.count.mockResolvedValue([{ count: '3' }]);
        } else {
          builder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'evt-new' }]),
          });
        }

        return builder;
      });

      const result = await adService.claimReward('user-1', 'rewarded', 'super_vote');

      // MAX 5 - 3 already used - 1 just claimed = 1 remaining
      expect(result.remaining_today).toBe(1);
    });

    it('throws ValidationError when super_vote daily limit (5) is reached', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          // Already at limit: 5 super_vote rewards today
          builder.count.mockResolvedValue([{ count: '5' }]);
        }

        return builder;
      });

      await expect(
        adService.claimReward('user-1', 'rewarded', 'super_vote'),
      ).rejects.toThrow(ValidationError);

      // Reset for message check
      callIndex = 0;
      await expect(
        adService.claimReward('user-1', 'rewarded', 'super_vote'),
      ).rejects.toThrow(/Daily limit reached/);
    });

    it('throws ValidationError when bonus_coins daily limit (10) is reached', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          // Already at limit: 10 bonus_coins rewards today
          builder.count.mockResolvedValue([{ count: '10' }]);
        }

        return builder;
      });

      await expect(
        adService.claimReward('user-1', 'rewarded', 'bonus_coins'),
      ).rejects.toThrow(ValidationError);

      // Reset for message check
      callIndex = 0;
      await expect(
        adService.claimReward('user-1', 'rewarded', 'bonus_coins'),
      ).rejects.toThrow(/Daily limit reached/);
    });

    it('succeeds when super_vote count is at limit-1 (edge case)', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          // At limit-1: 4 super_vote rewards today, 1 more allowed
          builder.count.mockResolvedValue([{ count: '4' }]);
        } else {
          builder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'evt-new' }]),
          });
        }

        return builder;
      });

      const result = await adService.claimReward('user-1', 'rewarded', 'super_vote');

      expect(result.reward_type).toBe('super_vote');
      expect(result.remaining_today).toBe(0); // MAX 5 - 4 used - 1 just claimed
    });

    it('succeeds when bonus_coins count is at limit-1 (edge case)', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          // At limit-1: 9 bonus_coins rewards today, 1 more allowed
          builder.count.mockResolvedValue([{ count: '9' }]);
        } else {
          builder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'evt-new' }]),
          });
        }

        return builder;
      });

      const result = await adService.claimReward('user-1', 'rewarded', 'bonus_coins');

      expect(result.reward_type).toBe('bonus_coins');
      expect(result.remaining_today).toBe(0); // MAX 10 - 9 used - 1 just claimed
    });

    it('reward amount is 1 for super_vote', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          builder.count.mockResolvedValue([{ count: '0' }]);
        } else {
          builder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'evt-new' }]),
          });
        }

        return builder;
      });

      const result = await adService.claimReward('user-1', 'rewarded', 'super_vote');
      expect(result.reward_amount).toBe(1);
    });

    it('reward amount is 10 (BONUS_COIN_REWARD_AMOUNT) for bonus_coins', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          builder.count.mockResolvedValue([{ count: '0' }]);
        } else {
          builder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'evt-new' }]),
          });
        }

        return builder;
      });

      const result = await adService.claimReward('user-1', 'rewarded', 'bonus_coins');
      expect(result.reward_amount).toBe(10);
    });

    it('placement containing "super_vote" is treated as super_vote reward', async () => {
      // e.g., placement = "rewarded_super_vote_modal" should be treated as super_vote
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          builder.count.mockResolvedValue([{ count: '0' }]);
        } else {
          builder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'evt-new' }]),
          });
        }

        return builder;
      });

      const result = await adService.claimReward(
        'user-1',
        'rewarded',
        'rewarded_super_vote_modal',
      );

      expect(result.reward_type).toBe('super_vote');
      expect(result.reward_amount).toBe(1);
      expect(redis.incrby).toHaveBeenCalled();
    });

    it('placement not containing "super_vote" is treated as bonus_coins reward', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          builder.count.mockResolvedValue([{ count: '0' }]);
        } else {
          builder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'evt-new' }]),
          });
        }

        return builder;
      });

      const result = await adService.claimReward(
        'user-1',
        'rewarded',
        'extra_submission',
      );

      expect(result.reward_type).toBe('bonus_coins');
      expect(result.reward_amount).toBe(10);
      expect(creditCoins).toHaveBeenCalled();
    });

    it('does not call redis.incrby for bonus_coins placement', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          builder.count.mockResolvedValue([{ count: '0' }]);
        } else {
          builder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'evt-new' }]),
          });
        }

        return builder;
      });

      await adService.claimReward('user-1', 'rewarded', 'bonus_coins');

      expect(redis.incrby).not.toHaveBeenCalled();
    });

    it('does not call creditCoins for super_vote placement', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          builder.count.mockResolvedValue([{ count: '0' }]);
        } else {
          builder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'evt-new' }]),
          });
        }

        return builder;
      });

      await adService.claimReward('user-1', 'rewarded', 'super_vote');

      expect(creditCoins).not.toHaveBeenCalled();
    });

    it('logs the reward event via logAdEvent (verifies insert is called with reward_granted)', async () => {
      let callIndex = 0;
      const insertArgs: any[] = [];
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          builder.count.mockResolvedValue([{ count: '0' }]);
        } else if (callIndex === 3) {
          // Capture the logAdEvent insert call
          builder.insert.mockImplementation((data: any) => {
            insertArgs.push(data);
            return {
              returning: jest.fn().mockResolvedValue([{ id: 'evt-logged', ...data }]),
            };
          });
        }

        return builder;
      });

      await adService.claimReward('user-1', 'rewarded', 'bonus_coins');

      expect(insertArgs.length).toBe(1);
      expect(insertArgs[0]).toEqual(
        expect.objectContaining({
          event_type: 'reward_granted',
          reward_type: 'bonus_coins',
          reward_amount: 10,
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // getDailyAdStats
  // -----------------------------------------------------------------------

  describe('getDailyAdStats()', () => {
    it('returns correct counts when no ads watched', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        // All counts return 0
        builder.count.mockResolvedValue([{ count: '0' }]);

        return builder;
      });

      const stats = await adService.getDailyAdStats('user-1');

      expect(stats.super_vote_rewards_today).toBe(0);
      expect(stats.bonus_coin_rewards_today).toBe(0);
      expect(stats.total_ads_watched_today).toBe(0);
    });

    it('returns correct remaining quotas when no ads watched', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();
        builder.count.mockResolvedValue([{ count: '0' }]);
        return builder;
      });

      const stats = await adService.getDailyAdStats('user-1');

      expect(stats.super_vote_rewards_remaining).toBe(5); // MAX_SUPER_VOTE_REWARDS_PER_DAY
      expect(stats.bonus_coin_rewards_remaining).toBe(10); // MAX_BONUS_COIN_REWARDS_PER_DAY
    });

    it('returns correct counts with mixed reward types', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          // getTodayRewardCount for super_vote => 3
          builder.count.mockResolvedValue([{ count: '3' }]);
        } else if (callIndex === 2) {
          // getTodayRewardCount for bonus_coins => 7
          builder.count.mockResolvedValue([{ count: '7' }]);
        } else if (callIndex === 3) {
          // total completed ads today => 15
          builder.count.mockResolvedValue([{ count: '15' }]);
        }

        return builder;
      });

      const stats = await adService.getDailyAdStats('user-1');

      expect(stats.super_vote_rewards_today).toBe(3);
      expect(stats.super_vote_rewards_remaining).toBe(2); // 5 - 3
      expect(stats.bonus_coin_rewards_today).toBe(7);
      expect(stats.bonus_coin_rewards_remaining).toBe(3); // 10 - 7
      expect(stats.total_ads_watched_today).toBe(15);
    });

    it('clamps remaining to 0 when count exceeds max', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          // super_vote count exceeds max somehow
          builder.count.mockResolvedValue([{ count: '8' }]);
        } else if (callIndex === 2) {
          // bonus_coins count exceeds max
          builder.count.mockResolvedValue([{ count: '12' }]);
        } else if (callIndex === 3) {
          builder.count.mockResolvedValue([{ count: '20' }]);
        }

        return builder;
      });

      const stats = await adService.getDailyAdStats('user-1');

      expect(stats.super_vote_rewards_remaining).toBe(0); // Math.max(0, 5-8)
      expect(stats.bonus_coin_rewards_remaining).toBe(0); // Math.max(0, 10-12)
    });

    it('total_ads_watched_today counts completed events', async () => {
      // This verifies that the total ads query uses event_type='completed'
      let callIndex = 0;
      const whereArgs: any[][] = [];

      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 3) {
          // Capture where calls for the total count query
          builder.where.mockImplementation((...args: any[]) => {
            whereArgs.push(args);
            return builder;
          });
          builder.count.mockResolvedValue([{ count: '5' }]);
        } else {
          builder.count.mockResolvedValue([{ count: '0' }]);
        }

        return builder;
      });

      const stats = await adService.getDailyAdStats('user-1');

      expect(stats.total_ads_watched_today).toBe(5);
      // Verify it queries for 'completed' event type
      const eventTypeWheres = whereArgs.filter(
        (args) => args[0] === 'event_type' && args[1] === 'completed',
      );
      expect(eventTypeWheres.length).toBe(1);
    });

    it('returns super_vote and bonus_coin counts tracked independently', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          // super_vote rewards: 5 (maxed out)
          builder.count.mockResolvedValue([{ count: '5' }]);
        } else if (callIndex === 2) {
          // bonus_coins rewards: 0 (none used)
          builder.count.mockResolvedValue([{ count: '0' }]);
        } else if (callIndex === 3) {
          builder.count.mockResolvedValue([{ count: '5' }]);
        }

        return builder;
      });

      const stats = await adService.getDailyAdStats('user-1');

      // Super vote maxed, bonus coins fully available
      expect(stats.super_vote_rewards_today).toBe(5);
      expect(stats.super_vote_rewards_remaining).toBe(0);
      expect(stats.bonus_coin_rewards_today).toBe(0);
      expect(stats.bonus_coin_rewards_remaining).toBe(10);
    });
  });

  // -----------------------------------------------------------------------
  // getAdConfig
  // -----------------------------------------------------------------------

  describe('getAdConfig()', () => {
    it('returns no ads for pro user', async () => {
      const builder = createQueryBuilder();
      builder.first.mockResolvedValue({ subscription_tier: 'pro' });
      mockDb.mockReturnValue(builder);

      const config = await adService.getAdConfig('user-pro');

      expect(config.show_interstitial).toBe(false);
      expect(config.show_banner).toBe(false);
      expect(config.show_rewarded).toBe(false);
      expect(config.placements.interstitial).toEqual([]);
      expect(config.placements.banner).toEqual([]);
      expect(config.placements.rewarded).toEqual([]);
    });

    it('returns all ad placements for free user', async () => {
      const builder = createQueryBuilder();
      builder.first.mockResolvedValue({ subscription_tier: 'free' });
      mockDb.mockReturnValue(builder);

      const config = await adService.getAdConfig('user-free');

      expect(config.show_interstitial).toBe(true);
      expect(config.show_banner).toBe(true);
      expect(config.show_rewarded).toBe(true);
    });

    it('throws NotFoundError when user not found', async () => {
      const builder = createQueryBuilder();
      builder.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(builder);

      await expect(
        adService.getAdConfig('nonexistent-user'),
      ).rejects.toThrow(NotFoundError);
    });

    it('returns correct interstitial placement arrays for free user', async () => {
      const builder = createQueryBuilder();
      builder.first.mockResolvedValue({ subscription_tier: 'free' });
      mockDb.mockReturnValue(builder);

      const config = await adService.getAdConfig('user-free');

      expect(config.placements.interstitial).toEqual([
        'after_vote',
        'between_challenges',
      ]);
    });

    it('returns correct banner placement arrays for free user', async () => {
      const builder = createQueryBuilder();
      builder.first.mockResolvedValue({ subscription_tier: 'free' });
      mockDb.mockReturnValue(builder);

      const config = await adService.getAdConfig('user-free');

      expect(config.placements.banner).toEqual([
        'feed_bottom',
        'leaderboard_bottom',
      ]);
    });

    it('returns correct rewarded placement arrays for free user', async () => {
      const builder = createQueryBuilder();
      builder.first.mockResolvedValue({ subscription_tier: 'free' });
      mockDb.mockReturnValue(builder);

      const config = await adService.getAdConfig('user-free');

      expect(config.placements.rewarded).toEqual([
        'super_vote',
        'bonus_coins',
        'extra_submission',
      ]);
    });

    it('queries the users table by user id', async () => {
      const builder = createQueryBuilder();
      builder.first.mockResolvedValue({ subscription_tier: 'free' });
      mockDb.mockReturnValue(builder);

      await adService.getAdConfig('user-123');

      expect(mockDb).toHaveBeenCalledWith('users');
      expect(builder.where).toHaveBeenCalledWith('id', 'user-123');
      expect(builder.first).toHaveBeenCalledWith('subscription_tier');
    });

    it('pro user gets empty arrays for all placement types', async () => {
      const builder = createQueryBuilder();
      builder.first.mockResolvedValue({ subscription_tier: 'pro' });
      mockDb.mockReturnValue(builder);

      const config = await adService.getAdConfig('user-pro');

      const allPlacements = [
        ...config.placements.interstitial,
        ...config.placements.banner,
        ...config.placements.rewarded,
      ];
      expect(allPlacements).toHaveLength(0);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    it('claimReward uses db.raw for time comparison in recent completion query', async () => {
      const builder = createQueryBuilder();
      builder.orderBy.mockReturnValue({
        first: jest.fn().mockResolvedValue(undefined),
      });
      mockDb.mockReturnValue(builder);

      try {
        await adService.claimReward('user-1', 'rewarded', 'bonus_coins');
      } catch {
        // Expected to throw
      }

      // Verify db.raw was called for the time comparison
      expect((mockDb as any).raw).toHaveBeenCalledWith("NOW() - INTERVAL '5 minutes'");
    });

    it('getDailyAdStats uses db.raw for CURRENT_DATE comparison', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();
        builder.count.mockResolvedValue([{ count: '0' }]);
        return builder;
      });

      await adService.getDailyAdStats('user-1');

      // getTodayRewardCount uses db.raw("CURRENT_DATE") for date comparison
      expect((mockDb as any).raw).toHaveBeenCalledWith('CURRENT_DATE');
    });

    it('remaining_today never goes below 0', async () => {
      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.orderBy.mockReturnValue({
            first: jest.fn().mockResolvedValue({ id: 'evt-recent' }),
          });
        } else if (callIndex === 2) {
          // count is 4, maxDaily is 5, so remaining = 5 - 4 - 1 = 0
          builder.count.mockResolvedValue([{ count: '4' }]);
        } else {
          builder.insert.mockReturnValue({
            returning: jest.fn().mockResolvedValue([{ id: 'evt-new' }]),
          });
        }

        return builder;
      });

      const result = await adService.claimReward('user-1', 'rewarded', 'super_vote');

      expect(result.remaining_today).toBe(0);
      expect(result.remaining_today).toBeGreaterThanOrEqual(0);
    });
  });
});

/**
 * Unit tests for the gift service logic.
 *
 * These tests mock the database (Knex), Redis, and logger so that no real
 * connections are needed. They verify the business logic of gift catalog
 * retrieval, gift sending (including balance checks, transaction recording,
 * notification creation), and paginated gift queries.
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

// We need a sophisticated mock for Knex because gift.service.ts uses
// db.transaction(), chained query-builder calls, leftJoin, whereNull, etc.

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
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
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
import * as giftService from '../../src/modules/gift/gift.service';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '../../src/shared/errors';
import { redis } from '../../src/config/redis';

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const mockGift = {
  id: 'gift-1',
  name: 'Heart',
  name_ja: 'ハート',
  icon_url: 'https://cdn.example.com/heart.png',
  animation_url: null,
  category: 'quick_reaction',
  coin_cost: 100,
  creator_coin_share: 50,
  is_active: true,
  sort_order: 1,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockGiftPremium = {
  id: 'gift-2',
  name: 'Diamond',
  name_ja: 'ダイヤモンド',
  icon_url: 'https://cdn.example.com/diamond.png',
  animation_url: 'https://cdn.example.com/diamond.json',
  category: 'premium',
  coin_cost: 500,
  creator_coin_share: 250,
  is_active: true,
  sort_order: 10,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockGiftStandard = {
  id: 'gift-3',
  name: 'Star',
  name_ja: 'スター',
  icon_url: 'https://cdn.example.com/star.png',
  animation_url: null,
  category: 'standard',
  coin_cost: 200,
  creator_coin_share: 100,
  is_active: true,
  sort_order: 5,
  created_at: new Date(),
  updated_at: new Date(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Gift Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the default db builder for each test
    mockDb.mockReturnValue(createQueryBuilder());
  });

  // -------------------------------------------------------------------
  // getCatalog
  // -------------------------------------------------------------------

  describe('getCatalog()', () => {
    it('returns from cache when available', async () => {
      const cachedData = {
        quick_reaction: [mockGift],
        standard: [mockGiftStandard],
        premium: [mockGiftPremium],
      };

      const cachedJson = JSON.stringify(cachedData);
      (redis.get as jest.Mock).mockResolvedValueOnce(cachedJson);

      const result = await giftService.getCatalog();

      expect(redis.get).toHaveBeenCalledWith('gift:catalog');
      // JSON.parse converts Date objects to strings, so compare via JSON roundtrip
      expect(result).toEqual(JSON.parse(cachedJson));
      // Should NOT query the database when cache exists
      expect(mockDb).not.toHaveBeenCalled();
    });

    it('queries db and groups by category when no cache', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      const allGifts = [mockGift, mockGiftStandard, mockGiftPremium];

      // db('gift_catalog').where(...).orderBy(...).select('*') returns gifts array
      const builder = createQueryBuilder();
      builder.select.mockResolvedValueOnce(allGifts);
      mockDb.mockReturnValueOnce(builder);

      const result = await giftService.getCatalog();

      expect(mockDb).toHaveBeenCalledWith('gift_catalog');
      expect(builder.where).toHaveBeenCalledWith('is_active', true);
      expect(builder.orderBy).toHaveBeenCalledWith('sort_order', 'asc');
      expect(result.quick_reaction).toEqual([mockGift]);
      expect(result.standard).toEqual([mockGiftStandard]);
      expect(result.premium).toEqual([mockGiftPremium]);
    });

    it('caches result with TTL after querying db', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      const allGifts = [mockGift, mockGiftStandard, mockGiftPremium];
      const builder = createQueryBuilder();
      builder.select.mockResolvedValueOnce(allGifts);
      mockDb.mockReturnValueOnce(builder);

      await giftService.getCatalog();

      expect(redis.set).toHaveBeenCalledWith(
        'gift:catalog',
        expect.any(String),
        'EX',
        3600,
      );

      // Verify the cached value is the grouped structure
      const cachedArg = (redis.set as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(cachedArg);
      expect(parsed.quick_reaction).toHaveLength(1);
      expect(parsed.standard).toHaveLength(1);
      expect(parsed.premium).toHaveLength(1);
    });

    it('returns empty categories when no gifts exist', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);

      const builder = createQueryBuilder();
      builder.select.mockResolvedValueOnce([]);
      mockDb.mockReturnValueOnce(builder);

      const result = await giftService.getCatalog();

      expect(result).toEqual({
        quick_reaction: [],
        standard: [],
        premium: [],
      });
    });
  });

  // -------------------------------------------------------------------
  // sendGift
  // -------------------------------------------------------------------

  describe('sendGift()', () => {
    const senderId = 'sender-001';
    const receiverId = 'receiver-002';
    const submissionId = 'sub-001';
    const giftId = 'gift-1';

    // Helper to set up pre-transaction db queries (gift + submission lookups)
    function setupPreTransactionMocks(overrides?: {
      gift?: any;
      submission?: any;
    }) {
      const giftData =
        overrides && 'gift' in overrides ? overrides.gift : mockGift;
      const submissionData =
        overrides && 'submission' in overrides
          ? overrides.submission
          : { id: submissionId, user_id: receiverId, gift_coins_received: 0 };

      // Call tracking: mockDb is called for gift_catalog, then submissions
      let callIndex = 0;

      mockDb.mockImplementation((tableName: string) => {
        const builder = createQueryBuilder();

        if (tableName === 'gift_catalog') {
          builder.first.mockResolvedValueOnce(giftData);
          return builder;
        }

        if (tableName === 'submissions') {
          builder.first.mockResolvedValueOnce(submissionData);
          return builder;
        }

        return builder;
      });
    }

    it('throws ForbiddenError when sender equals receiver', async () => {
      await expect(
        giftService.sendGift('user-1', 'user-1', submissionId, giftId),
      ).rejects.toThrow(ForbiddenError);

      await expect(
        giftService.sendGift('user-1', 'user-1', submissionId, giftId),
      ).rejects.toThrow('You cannot send a gift to yourself');
    });

    it('throws NotFoundError when gift not found', async () => {
      setupPreTransactionMocks({ gift: undefined });

      await expect(
        giftService.sendGift(senderId, receiverId, submissionId, giftId),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when gift is inactive', async () => {
      // The service queries with .where('is_active', true), so an inactive
      // gift will simply not be found by the query.
      setupPreTransactionMocks({ gift: undefined });

      await expect(
        giftService.sendGift(senderId, receiverId, submissionId, giftId),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when submission not found', async () => {
      setupPreTransactionMocks({ submission: undefined });

      await expect(
        giftService.sendGift(senderId, receiverId, submissionId, giftId),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when submission is deleted (soft-deleted)', async () => {
      // The service uses .whereNull('deleted_at'), so a soft-deleted
      // submission will not be found.
      setupPreTransactionMocks({ submission: undefined });

      await expect(
        giftService.sendGift(senderId, receiverId, submissionId, giftId),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError when receiver does not match submission owner', async () => {
      setupPreTransactionMocks({
        submission: {
          id: submissionId,
          user_id: 'different-user',
          gift_coins_received: 0,
        },
      });

      await expect(
        giftService.sendGift(senderId, receiverId, submissionId, giftId),
      ).rejects.toThrow(ValidationError);

      // Reset and verify the error message content
      setupPreTransactionMocks({
        submission: {
          id: submissionId,
          user_id: 'different-user',
          gift_coins_received: 0,
        },
      });

      await expect(
        giftService.sendGift(senderId, receiverId, submissionId, giftId),
      ).rejects.toThrow('Invalid receiver');
    });

    it('throws NotFoundError when sender user not found in transaction', async () => {
      setupPreTransactionMocks();

      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        // Sender not found
        trxBuilder.first.mockResolvedValueOnce(undefined);

        return callback(trx);
      });

      await expect(
        giftService.sendGift(senderId, receiverId, submissionId, giftId),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError when sender has insufficient balance', async () => {
      setupPreTransactionMocks();

      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        // Sender found but with low balance (gift costs 100, sender has 50)
        trxBuilder.first.mockResolvedValueOnce({
          coin_balance: 50,
          total_coins_spent: 0,
        });

        return callback(trx);
      });

      await expect(
        giftService.sendGift(senderId, receiverId, submissionId, giftId),
      ).rejects.toThrow(ValidationError);

      // Reset and verify error message
      setupPreTransactionMocks();

      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        trxBuilder.first.mockResolvedValueOnce({
          coin_balance: 50,
          total_coins_spent: 0,
        });

        return callback(trx);
      });

      await expect(
        giftService.sendGift(senderId, receiverId, submissionId, giftId),
      ).rejects.toThrow(/Insufficient/i);
    });

    it('throws NotFoundError when receiver user not found in transaction', async () => {
      setupPreTransactionMocks();

      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        // First .first() call: sender found with enough balance
        // Second .first() call: receiver not found
        trxBuilder.first
          .mockResolvedValueOnce({
            coin_balance: 200,
            total_coins_spent: 0,
          })
          .mockResolvedValueOnce(undefined);

        trxBuilder.insert.mockReturnValue({
          returning: jest.fn().mockResolvedValue([]),
        });
        trxBuilder.update.mockResolvedValue(1);

        return callback(trx);
      });

      await expect(
        giftService.sendGift(senderId, receiverId, submissionId, giftId),
      ).rejects.toThrow(NotFoundError);
    });

    // --- Successful sendGift tests ---

    function setupSuccessfulSendGift(options?: { message?: string }) {
      setupPreTransactionMocks();

      const giftTransactionRecord = {
        id: 'gt-001',
        sender_id: senderId,
        receiver_id: receiverId,
        submission_id: submissionId,
        gift_id: giftId,
        coin_amount: mockGift.coin_cost,
        creator_share: mockGift.creator_coin_share,
        platform_share: mockGift.coin_cost - mockGift.creator_coin_share,
        message: options?.message || null,
        created_at: new Date(),
      };

      let capturedInserts: any[] = [];
      let capturedUpdates: any[] = [];

      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        // First .first(): sender
        // Second .first(): receiver
        trxBuilder.first
          .mockResolvedValueOnce({
            coin_balance: 500,
            total_coins_spent: 100,
          })
          .mockResolvedValueOnce({
            coin_balance: 200,
            total_coins_earned: 50,
          });

        // Track all insert calls
        trxBuilder.insert.mockImplementation((data: any) => {
          capturedInserts.push(data);
          return {
            returning: jest.fn().mockResolvedValue([giftTransactionRecord]),
          };
        });

        // Track all update calls
        trxBuilder.update.mockImplementation((data: any) => {
          capturedUpdates.push(data);
          return Promise.resolve(1);
        });

        return callback(trx);
      });

      return { giftTransactionRecord, capturedInserts, capturedUpdates };
    }

    it('succeeds and debits sender correctly (full coin_cost)', async () => {
      const { capturedInserts } = setupSuccessfulSendGift();

      await giftService.sendGift(senderId, receiverId, submissionId, giftId);

      // First insert should be coin_transactions for sender debit
      const senderDebit = capturedInserts[0];
      expect(senderDebit.user_id).toBe(senderId);
      expect(senderDebit.type).toBe('gift_sent');
      expect(senderDebit.amount).toBe(-mockGift.coin_cost); // -100
      expect(senderDebit.balance_after).toBe(500 - mockGift.coin_cost); // 400
    });

    it('succeeds and credits receiver with creator_coin_share', async () => {
      const { capturedInserts } = setupSuccessfulSendGift();

      await giftService.sendGift(senderId, receiverId, submissionId, giftId);

      // Second insert: coin_transactions for receiver credit
      const receiverCredit = capturedInserts[1];
      expect(receiverCredit.user_id).toBe(receiverId);
      expect(receiverCredit.type).toBe('gift_received');
      expect(receiverCredit.amount).toBe(mockGift.creator_coin_share); // 50
      expect(receiverCredit.balance_after).toBe(200 + mockGift.creator_coin_share); // 250
    });

    it('succeeds and calculates platform share correctly', async () => {
      const { capturedInserts } = setupSuccessfulSendGift();

      await giftService.sendGift(senderId, receiverId, submissionId, giftId);

      // Third insert: gift_transactions record
      const giftTxInsert = capturedInserts[2];
      const expectedPlatformShare = mockGift.coin_cost - mockGift.creator_coin_share; // 50
      expect(giftTxInsert.platform_share).toBe(expectedPlatformShare);
      expect(giftTxInsert.creator_share).toBe(mockGift.creator_coin_share);
      expect(giftTxInsert.coin_amount).toBe(mockGift.coin_cost);
    });

    it('succeeds and inserts gift_transaction record', async () => {
      const { capturedInserts } = setupSuccessfulSendGift();

      await giftService.sendGift(senderId, receiverId, submissionId, giftId);

      // Third insert is the gift_transactions record
      const giftTxInsert = capturedInserts[2];
      expect(giftTxInsert.sender_id).toBe(senderId);
      expect(giftTxInsert.receiver_id).toBe(receiverId);
      expect(giftTxInsert.submission_id).toBe(submissionId);
      expect(giftTxInsert.gift_id).toBe(giftId);
    });

    it('succeeds and updates submission.gift_coins_received', async () => {
      const { capturedUpdates } = setupSuccessfulSendGift();

      await giftService.sendGift(senderId, receiverId, submissionId, giftId);

      // There are 3 updates: sender balance, receiver balance, submission
      // The third update is to submissions
      const submissionUpdate = capturedUpdates[2];
      expect(submissionUpdate.gift_coins_received).toBe(0 + mockGift.coin_cost); // 100
    });

    it('succeeds and creates notification for receiver', async () => {
      const { capturedInserts } = setupSuccessfulSendGift();

      await giftService.sendGift(senderId, receiverId, submissionId, giftId);

      // Fourth insert: notifications
      const notification = capturedInserts[3];
      expect(notification.user_id).toBe(receiverId);
      expect(notification.type).toBe('gift_received');
      expect(notification.title).toContain(mockGift.name);

      // Verify the data payload
      const data = JSON.parse(notification.data);
      expect(data.gift_id).toBe(giftId);
      expect(data.sender_id).toBe(senderId);
      expect(data.submission_id).toBe(submissionId);
      expect(data.coin_amount).toBe(mockGift.creator_coin_share);
    });

    it('succeeds and invalidates redis cache for both users', async () => {
      setupSuccessfulSendGift();

      await giftService.sendGift(senderId, receiverId, submissionId, giftId);

      expect(redis.del).toHaveBeenCalledWith(`user:${senderId}`);
      expect(redis.del).toHaveBeenCalledWith(`user:${receiverId}`);
    });

    it('succeeds and returns transaction with gift details', async () => {
      const { giftTransactionRecord } = setupSuccessfulSendGift();

      const result = await giftService.sendGift(
        senderId,
        receiverId,
        submissionId,
        giftId,
      );

      expect(result.id).toBe(giftTransactionRecord.id);
      expect(result.sender_id).toBe(senderId);
      expect(result.receiver_id).toBe(receiverId);
      expect(result.gift_name).toBe(mockGift.name);
      expect(result.gift_icon_url).toBe(mockGift.icon_url);
    });

    it('includes optional message in transaction when provided', async () => {
      const testMessage = 'Great video!';
      const { capturedInserts } = setupSuccessfulSendGift({ message: testMessage });

      await giftService.sendGift(
        senderId,
        receiverId,
        submissionId,
        giftId,
        testMessage,
      );

      // gift_transactions insert (3rd insert) should contain the message
      const giftTxInsert = capturedInserts[2];
      expect(giftTxInsert.message).toBe(testMessage);
    });

    it('stores null message when no message provided', async () => {
      const { capturedInserts } = setupSuccessfulSendGift();

      await giftService.sendGift(
        senderId,
        receiverId,
        submissionId,
        giftId,
      );

      // gift_transactions insert (3rd insert) should have null message
      const giftTxInsert = capturedInserts[2];
      expect(giftTxInsert.message).toBeNull();
    });

    it('updates sender balance and total_coins_spent correctly', async () => {
      const { capturedUpdates } = setupSuccessfulSendGift();

      await giftService.sendGift(senderId, receiverId, submissionId, giftId);

      // First update: sender's users row
      const senderUpdate = capturedUpdates[0];
      expect(senderUpdate.coin_balance).toBe(500 - mockGift.coin_cost); // 400
      expect(senderUpdate.total_coins_spent).toBe(100 + mockGift.coin_cost); // 200
    });

    it('updates receiver balance and total_coins_earned correctly', async () => {
      const { capturedUpdates } = setupSuccessfulSendGift();

      await giftService.sendGift(senderId, receiverId, submissionId, giftId);

      // Second update: receiver's users row
      const receiverUpdate = capturedUpdates[1];
      expect(receiverUpdate.coin_balance).toBe(200 + mockGift.creator_coin_share); // 250
      expect(receiverUpdate.total_coins_earned).toBe(50 + mockGift.creator_coin_share); // 100
    });
  });

  // -------------------------------------------------------------------
  // getReceivedGifts
  // -------------------------------------------------------------------

  describe('getReceivedGifts()', () => {
    it('returns paginated results', async () => {
      const userId = 'user-recv-001';
      const mockGiftsData = [
        {
          id: 'gt-1',
          sender_id: 'sender-1',
          receiver_id: userId,
          submission_id: 'sub-1',
          gift_id: 'gift-1',
          coin_amount: 100,
          creator_share: 50,
          platform_share: 50,
          message: null,
          created_at: new Date(),
          gift_name: 'Heart',
          gift_icon_url: 'https://cdn.example.com/heart.png',
          sender_username: 'sender_user',
          sender_display_name: 'Sender',
          sender_avatar_url: null,
        },
      ];

      let callIndex = 0;

      mockDb.mockImplementation((tableName: string) => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          // Count query: db('gift_transactions').where(...).count(...)
          // count returns [{count: '1'}] after being resolved
          builder.count.mockResolvedValueOnce([{ count: '1' }]);
          return builder;
        }

        if (callIndex === 2) {
          // Data query: db('gift_transactions as gt').where(...).leftJoin(...).select(...)
          builder.select.mockResolvedValueOnce(mockGiftsData);
          return builder;
        }

        return builder;
      });

      const result = await giftService.getReceivedGifts(userId, { page: 1, limit: 20 });

      expect(result.data).toEqual(mockGiftsData);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total_pages).toBe(1);
    });

    it('returns empty results when no gifts received', async () => {
      const userId = 'user-no-gifts';

      let callIndex = 0;

      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.count.mockResolvedValueOnce([{ count: '0' }]);
          return builder;
        }

        if (callIndex === 2) {
          builder.select.mockResolvedValueOnce([]);
          return builder;
        }

        return builder;
      });

      const result = await giftService.getReceivedGifts(userId, {});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // getSentGifts
  // -------------------------------------------------------------------

  describe('getSentGifts()', () => {
    it('returns paginated results', async () => {
      const userId = 'user-send-001';
      const mockGiftsData = [
        {
          id: 'gt-2',
          sender_id: userId,
          receiver_id: 'receiver-1',
          submission_id: 'sub-2',
          gift_id: 'gift-1',
          coin_amount: 100,
          creator_share: 50,
          platform_share: 50,
          message: 'Amazing!',
          created_at: new Date(),
          gift_name: 'Heart',
          gift_icon_url: 'https://cdn.example.com/heart.png',
          receiver_username: 'recv_user',
          receiver_display_name: 'Receiver',
          receiver_avatar_url: null,
        },
        {
          id: 'gt-3',
          sender_id: userId,
          receiver_id: 'receiver-2',
          submission_id: 'sub-3',
          gift_id: 'gift-2',
          coin_amount: 500,
          creator_share: 250,
          platform_share: 250,
          message: null,
          created_at: new Date(),
          gift_name: 'Diamond',
          gift_icon_url: 'https://cdn.example.com/diamond.png',
          receiver_username: 'recv_user_2',
          receiver_display_name: 'Receiver 2',
          receiver_avatar_url: null,
        },
      ];

      let callIndex = 0;

      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.count.mockResolvedValueOnce([{ count: '2' }]);
          return builder;
        }

        if (callIndex === 2) {
          builder.select.mockResolvedValueOnce(mockGiftsData);
          return builder;
        }

        return builder;
      });

      const result = await giftService.getSentGifts(userId, { page: 1, limit: 10 });

      expect(result.data).toEqual(mockGiftsData);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.total_pages).toBe(1);
    });

    it('returns empty results when no gifts sent', async () => {
      const userId = 'user-no-sent';

      let callIndex = 0;

      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.count.mockResolvedValueOnce([{ count: '0' }]);
          return builder;
        }

        if (callIndex === 2) {
          builder.select.mockResolvedValueOnce([]);
          return builder;
        }

        return builder;
      });

      const result = await giftService.getSentGifts(userId, {});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // getSubmissionGifts
  // -------------------------------------------------------------------

  describe('getSubmissionGifts()', () => {
    it('throws NotFoundError for missing submission', async () => {
      const builder = createQueryBuilder();
      builder.first.mockResolvedValueOnce(undefined);
      mockDb.mockReturnValueOnce(builder);

      await expect(
        giftService.getSubmissionGifts('nonexistent-sub', {}),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError for soft-deleted submission', async () => {
      // The service uses .whereNull('deleted_at'), so a deleted submission
      // will not be found and triggers NotFoundError
      const builder = createQueryBuilder();
      builder.first.mockResolvedValueOnce(undefined);
      mockDb.mockReturnValueOnce(builder);

      await expect(
        giftService.getSubmissionGifts('deleted-sub', {}),
      ).rejects.toThrow(NotFoundError);
    });

    it('returns paginated results for existing submission', async () => {
      const submissionId = 'sub-gifts-001';
      const mockGiftsData = [
        {
          id: 'gt-10',
          sender_id: 'sender-10',
          receiver_id: 'receiver-10',
          submission_id: submissionId,
          gift_id: 'gift-1',
          coin_amount: 100,
          creator_share: 50,
          platform_share: 50,
          message: 'Nice!',
          created_at: new Date(),
          gift_name: 'Heart',
          gift_icon_url: 'https://cdn.example.com/heart.png',
          sender_username: 'gifter',
          sender_display_name: 'Gifter',
          sender_avatar_url: null,
        },
      ];

      let callIndex = 0;

      mockDb.mockImplementation((tableName: string) => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          // Submission existence check: db('submissions').where(...).whereNull(...).first(...)
          builder.first.mockResolvedValueOnce({ id: submissionId });
          return builder;
        }

        if (callIndex === 2) {
          // Count query
          builder.count.mockResolvedValueOnce([{ count: '1' }]);
          return builder;
        }

        if (callIndex === 3) {
          // Data query with joins
          builder.select.mockResolvedValueOnce(mockGiftsData);
          return builder;
        }

        return builder;
      });

      const result = await giftService.getSubmissionGifts(submissionId, {
        page: 1,
        limit: 20,
      });

      expect(result.data).toEqual(mockGiftsData);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total_pages).toBe(1);
    });

    it('returns empty results for submission with no gifts', async () => {
      const submissionId = 'sub-no-gifts';

      let callIndex = 0;

      mockDb.mockImplementation(() => {
        callIndex++;
        const builder = createQueryBuilder();

        if (callIndex === 1) {
          builder.first.mockResolvedValueOnce({ id: submissionId });
          return builder;
        }

        if (callIndex === 2) {
          builder.count.mockResolvedValueOnce([{ count: '0' }]);
          return builder;
        }

        if (callIndex === 3) {
          builder.select.mockResolvedValueOnce([]);
          return builder;
        }

        return builder;
      });

      const result = await giftService.getSubmissionGifts(submissionId, {});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});

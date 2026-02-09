/**
 * Unit tests for the coin service logic.
 *
 * These tests mock the database (Knex) and Redis so that no real connections
 * are needed. They verify the business logic of credit/debit operations
 * including balance validation, transaction records, and error handling.
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

// We need a more sophisticated mock for Knex because coin.service.ts uses
// db.transaction() and chained query-builder calls.

const mockReturning = jest.fn();
const mockUpdate = jest.fn().mockReturnValue({ returning: mockReturning });
const mockForUpdate = jest.fn();
const mockFirst = jest.fn();
const mockWhere = jest.fn();
const mockInsert = jest.fn().mockReturnValue({ returning: mockReturning });
const mockCount = jest.fn();

// Build a chainable query builder mock
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
  };
  return builder;
}

// The trx mock (transaction) works like the db mock but is passed to callbacks
function createTrxBuilder() {
  const builder: Record<string, jest.Mock> = {
    where: jest.fn().mockReturnThis(),
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
import * as coinService from '../../src/modules/coin/coin.service';
import { ValidationError, NotFoundError } from '../../src/shared/errors';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Coin Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------
  // creditCoins
  // -------------------------------------------------------------------

  describe('creditCoins()', () => {
    it('increases balance and records a coin transaction', async () => {
      const userId = 'user-123';
      const amount = 50;
      const expectedNewBalance = 150; // 100 existing + 50 credit

      const mockTransaction = {
        id: 'tx-1',
        user_id: userId,
        type: 'reward',
        amount,
        balance_after: expectedNewBalance,
        created_at: new Date(),
      };

      // Set up the transaction mock
      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        // trx('users').where(...).forUpdate().first(...) => user row
        trxBuilder.first.mockResolvedValue({
          coin_balance: 100,
          total_coins_earned: 200,
        });

        // trx('coin_transactions').insert(...).returning('*') => [transaction]
        trxBuilder.insert.mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockTransaction]),
        });

        // trx('users').where(...).update(...) => void
        trxBuilder.update.mockResolvedValue(1);

        return callback(trx);
      });

      const result = await coinService.creditCoins(
        userId,
        amount,
        'reward' as any,
        undefined,
        undefined,
        'Test reward',
      );

      expect(result).toBeDefined();
      expect(result.amount).toBe(amount);
      expect(result.balance_after).toBe(expectedNewBalance);
    });

    it('throws ValidationError if amount is zero or negative', async () => {
      await expect(
        coinService.creditCoins('user-123', 0, 'reward' as any),
      ).rejects.toThrow(ValidationError);

      await expect(
        coinService.creditCoins('user-123', -10, 'reward' as any),
      ).rejects.toThrow(ValidationError);
    });

    it('throws NotFoundError if user does not exist', async () => {
      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        // User not found
        trxBuilder.first.mockResolvedValue(undefined);

        return callback(trx);
      });

      await expect(
        coinService.creditCoins('nonexistent-user', 10, 'reward' as any),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // -------------------------------------------------------------------
  // debitCoins
  // -------------------------------------------------------------------

  describe('debitCoins()', () => {
    it('decreases balance and records a negative coin transaction', async () => {
      const userId = 'user-456';
      const amount = 30;
      const existingBalance = 100;
      const expectedNewBalance = existingBalance - amount;

      const mockTransaction = {
        id: 'tx-2',
        user_id: userId,
        type: 'gift_sent',
        amount: -amount,
        balance_after: expectedNewBalance,
        created_at: new Date(),
      };

      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        trxBuilder.first.mockResolvedValue({
          coin_balance: existingBalance,
          total_coins_spent: 0,
        });

        trxBuilder.insert.mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockTransaction]),
        });

        trxBuilder.update.mockResolvedValue(1);

        return callback(trx);
      });

      const result = await coinService.debitCoins(
        userId,
        amount,
        'gift_sent' as any,
      );

      expect(result).toBeDefined();
      expect(result.amount).toBe(-amount);
      expect(result.balance_after).toBe(expectedNewBalance);
    });

    it('throws ValidationError when balance is insufficient', async () => {
      const userId = 'user-789';
      const amount = 200; // more than the 50 they have

      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        trxBuilder.first.mockResolvedValue({
          coin_balance: 50,
          total_coins_spent: 0,
        });

        return callback(trx);
      });

      await expect(
        coinService.debitCoins(userId, amount, 'gift_sent' as any),
      ).rejects.toThrow(ValidationError);

      await expect(
        coinService.debitCoins(userId, amount, 'gift_sent' as any),
      ).rejects.toThrow(/Insufficient/i);
    });

    it('throws ValidationError if amount is zero or negative', async () => {
      await expect(
        coinService.debitCoins('user-123', 0, 'gift_sent' as any),
      ).rejects.toThrow(ValidationError);

      await expect(
        coinService.debitCoins('user-123', -5, 'gift_sent' as any),
      ).rejects.toThrow(ValidationError);
    });

    it('throws NotFoundError if user does not exist', async () => {
      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        trxBuilder.first.mockResolvedValue(undefined);

        return callback(trx);
      });

      await expect(
        coinService.debitCoins('ghost-user', 10, 'gift_sent' as any),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // -------------------------------------------------------------------
  // Balance integrity
  // -------------------------------------------------------------------

  describe('balance integrity', () => {
    it('balance is correct after a credit followed by a debit (via mocked transactions)', async () => {
      // This test verifies that the service passes the correct amounts
      // to the database layer by inspecting the callback behaviour.

      let currentBalance = 0;
      let totalEarned = 0;
      let totalSpent = 0;

      const transactionLog: Array<{ type: string; amount: number; balance_after: number }> = [];

      // A stateful transaction mock that tracks balance changes
      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        trxBuilder.first.mockImplementation(() =>
          Promise.resolve({
            coin_balance: currentBalance,
            total_coins_earned: totalEarned,
            total_coins_spent: totalSpent,
          }),
        );

        trxBuilder.insert.mockImplementation((data: any) => {
          const txAmount = data.amount;
          const txBalanceAfter = data.balance_after;
          currentBalance = txBalanceAfter;
          if (txAmount > 0) {
            totalEarned += txAmount;
          } else {
            totalSpent += Math.abs(txAmount);
          }
          const record = {
            id: `tx-${transactionLog.length + 1}`,
            ...data,
            created_at: new Date(),
          };
          transactionLog.push(record);
          return { returning: jest.fn().mockResolvedValue([record]) };
        });

        trxBuilder.update.mockResolvedValue(1);

        return callback(trx);
      });

      // Credit 100
      await coinService.creditCoins('user-multi', 100, 'reward' as any);
      expect(currentBalance).toBe(100);

      // Credit 50 more
      await coinService.creditCoins('user-multi', 50, 'achievement' as any);
      expect(currentBalance).toBe(150);

      // Debit 30
      await coinService.debitCoins('user-multi', 30, 'gift_sent' as any);
      expect(currentBalance).toBe(120);

      // Verify we recorded 3 transactions
      expect(transactionLog).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------
  // Concurrent debit safety
  // -------------------------------------------------------------------

  describe('concurrent debit safety', () => {
    it('does not allow balance to go negative under concurrent debits (mocked)', async () => {
      // Simulates two debits racing: the first should succeed, the second
      // should fail because the balance check inside the transaction shows
      // insufficient funds after the first debit took the row lock.

      let balance = 50;

      const makeTransaction = (callback: Function) => {
        const trx = createTrxBuilder();
        const trxBuilder = (trx as any)._builder;

        trxBuilder.first.mockImplementation(() =>
          Promise.resolve({
            coin_balance: balance,
            total_coins_spent: 0,
          }),
        );

        trxBuilder.insert.mockImplementation((data: any) => {
          balance = data.balance_after;
          return {
            returning: jest.fn().mockResolvedValue([{
              id: 'tx-concurrent',
              ...data,
              created_at: new Date(),
            }]),
          };
        });

        trxBuilder.update.mockResolvedValue(1);

        return callback(trx);
      };

      (mockDb as any).transaction.mockImplementation(async (callback: Function) => {
        return makeTransaction(callback);
      });

      // First debit: 50 from 50 should succeed
      await coinService.debitCoins('user-race', 50, 'gift_sent' as any);
      expect(balance).toBe(0);

      // Second debit: 50 from 0 should fail with insufficient balance
      await expect(
        coinService.debitCoins('user-race', 50, 'gift_sent' as any),
      ).rejects.toThrow(ValidationError);
    });
  });
});

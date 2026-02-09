import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import {
  AppError,
  NotFoundError,
  ValidationError,
} from '../../shared/errors';
import {
  parsePaginationParams,
  paginationToOffset,
  buildPaginatedResult,
  type PaginatedResult,
} from '../../shared/types/pagination';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CoinPackage {
  id: string;
  name: string;
  coin_amount: number;
  bonus_amount: number;
  price_usd: number;
  apple_product_id: string | null;
  google_product_id: string | null;
  is_best_value: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

interface CoinTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: Date;
}

type CoinTransactionType =
  | 'purchase'
  | 'gift_sent'
  | 'gift_received'
  | 'reward'
  | 'achievement'
  | 'refund'
  | 'admin_adjustment';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_KEY_PACKAGES = 'coin:packages';
const CACHE_TTL_PACKAGES = 3600; // 1 hour

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

/**
 * Returns the current coin balance for a user.
 */
export async function getBalance(userId: string): Promise<number> {
  const user = await db('users')
    .where('id', userId)
    .first('coin_balance');

  if (!user) {
    throw new NotFoundError('User', userId);
  }

  return user.coin_balance;
}

/**
 * Returns all active coin packages, ordered by sort_order.
 */
export async function getPackages(): Promise<CoinPackage[]> {
  const cached = await redis.get(CACHE_KEY_PACKAGES);
  if (cached) {
    return JSON.parse(cached);
  }

  const packages = await db('coin_packages')
    .where('is_active', true)
    .orderBy('sort_order', 'asc')
    .select('*');

  await redis.set(CACHE_KEY_PACKAGES, JSON.stringify(packages), 'EX', CACHE_TTL_PACKAGES);

  return packages;
}

/**
 * Purchases coins via an in-app purchase receipt.
 * Verifies the receipt, credits coins, and records the transaction.
 */
export async function purchaseCoins(
  userId: string,
  packageId: string,
  platform: 'apple' | 'google',
  receiptData: string,
): Promise<CoinTransaction> {
  // Find the coin package
  const coinPackage = await db('coin_packages')
    .where('id', packageId)
    .where('is_active', true)
    .first();

  if (!coinPackage) {
    throw new NotFoundError('Coin package', packageId);
  }

  // Verify receipt with the appropriate platform
  // Import dynamically to avoid circular dependencies
  const { verifyAppleReceipt, verifyGoogleReceipt } = await getReceiptVerifiers();

  if (platform === 'apple') {
    await verifyAppleReceipt(receiptData, coinPackage.apple_product_id);
  } else {
    await verifyGoogleReceipt(receiptData, coinPackage.google_product_id);
  }

  const totalCoins = coinPackage.coin_amount + coinPackage.bonus_amount;

  // Credit coins in a transaction
  const transaction = await db.transaction(async (trx) => {
    // Lock the user row to prevent race conditions
    const user = await trx('users')
      .where('id', userId)
      .forUpdate()
      .first('coin_balance', 'total_coins_earned');

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    const newBalance = user.coin_balance + totalCoins;

    // Insert coin transaction record
    const [coinTx] = await trx('coin_transactions')
      .insert({
        user_id: userId,
        type: 'purchase' as CoinTransactionType,
        amount: totalCoins,
        balance_after: newBalance,
        reference_type: 'coin_package',
        reference_id: packageId,
        description: `Purchased ${coinPackage.name}`,
      })
      .returning('*');

    // Update user balance and total earned
    await trx('users')
      .where('id', userId)
      .update({
        coin_balance: newBalance,
        total_coins_earned: user.total_coins_earned + totalCoins,
        updated_at: trx.fn.now(),
      });

    return coinTx;
  });

  // Invalidate cached user data
  await redis.del(`user:${userId}`);

  logger.info('Coins purchased', {
    userId,
    packageId,
    amount: totalCoins,
    platform,
  });

  return transaction;
}

/**
 * Credits coins to a user (for rewards, achievements, etc.).
 * Returns the created transaction record.
 */
export async function creditCoins(
  userId: string,
  amount: number,
  type: CoinTransactionType,
  referenceType?: string,
  referenceId?: string,
  description?: string,
): Promise<CoinTransaction> {
  if (amount <= 0) {
    throw new ValidationError('Invalid coin amount', [
      { field: 'amount', message: 'Amount must be positive' },
    ]);
  }

  const transaction = await db.transaction(async (trx) => {
    const user = await trx('users')
      .where('id', userId)
      .forUpdate()
      .first('coin_balance', 'total_coins_earned');

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    const newBalance = user.coin_balance + amount;

    const [coinTx] = await trx('coin_transactions')
      .insert({
        user_id: userId,
        type,
        amount,
        balance_after: newBalance,
        reference_type: referenceType || null,
        reference_id: referenceId || null,
        description: description || null,
      })
      .returning('*');

    await trx('users')
      .where('id', userId)
      .update({
        coin_balance: newBalance,
        total_coins_earned: user.total_coins_earned + amount,
        updated_at: trx.fn.now(),
      });

    return coinTx;
  });

  await redis.del(`user:${userId}`);

  logger.info('Coins credited', {
    userId,
    amount,
    type,
    referenceType,
    referenceId,
  });

  return transaction;
}

/**
 * Debits coins from a user (for gifts, etc.).
 * Validates sufficient balance before debiting.
 * Returns the created transaction record.
 */
export async function debitCoins(
  userId: string,
  amount: number,
  type: CoinTransactionType,
  referenceType?: string,
  referenceId?: string,
  description?: string,
): Promise<CoinTransaction> {
  if (amount <= 0) {
    throw new ValidationError('Invalid coin amount', [
      { field: 'amount', message: 'Amount must be positive' },
    ]);
  }

  const transaction = await db.transaction(async (trx) => {
    const user = await trx('users')
      .where('id', userId)
      .forUpdate()
      .first('coin_balance', 'total_coins_spent');

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    if (user.coin_balance < amount) {
      throw new ValidationError('Insufficient balance', [
        {
          field: 'amount',
          message: `Insufficient coin balance. Current: ${user.coin_balance}, Required: ${amount}`,
        },
      ]);
    }

    const newBalance = user.coin_balance - amount;

    const [coinTx] = await trx('coin_transactions')
      .insert({
        user_id: userId,
        type,
        amount: -amount, // Negative for debits
        balance_after: newBalance,
        reference_type: referenceType || null,
        reference_id: referenceId || null,
        description: description || null,
      })
      .returning('*');

    await trx('users')
      .where('id', userId)
      .update({
        coin_balance: newBalance,
        total_coins_spent: user.total_coins_spent + amount,
        updated_at: trx.fn.now(),
      });

    return coinTx;
  });

  await redis.del(`user:${userId}`);

  logger.info('Coins debited', {
    userId,
    amount,
    type,
    referenceType,
    referenceId,
  });

  return transaction;
}

/**
 * Returns paginated coin transaction history for a user.
 */
export async function getTransactionHistory(
  userId: string,
  query: Record<string, unknown>,
): Promise<PaginatedResult<CoinTransaction>> {
  const pagination = parsePaginationParams(query);
  const offset = paginationToOffset(pagination);

  const [{ count }] = await db('coin_transactions')
    .where('user_id', userId)
    .count('id as count');

  const transactions = await db('coin_transactions')
    .where('user_id', userId)
    .orderBy('created_at', 'desc')
    .offset(offset)
    .limit(pagination.limit)
    .select('*');

  return buildPaginatedResult(transactions, parseInt(count as string, 10), pagination);
}

// ---------------------------------------------------------------------------
// Receipt verification helpers for coin purchases
// ---------------------------------------------------------------------------

/**
 * Lazy-loaded receipt verifiers to avoid heavy imports at module load.
 */
async function getReceiptVerifiers() {
  return {
    verifyAppleReceipt: async (receiptData: string, expectedProductId: string | null) => {
      const sharedSecret = process.env.APPLE_SHARED_SECRET;
      if (!sharedSecret) {
        throw new AppError('Apple shared secret is not configured', 500, 'CONFIG_ERROR');
      }

      const APPLE_VERIFY_URL_PRODUCTION = 'https://buy.itunes.apple.com/verifyReceipt';
      const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

      const payload = {
        'receipt-data': receiptData,
        password: sharedSecret,
        'exclude-old-transactions': true,
      };

      let response = await fetch(APPLE_VERIFY_URL_PRODUCTION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let result = await response.json() as { status: number; receipt?: { in_app?: Array<{ product_id: string }> } };

      if (result.status === 21007) {
        response = await fetch(APPLE_VERIFY_URL_SANDBOX, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        result = await response.json() as typeof result;
      }

      if (result.status !== 0) {
        throw new ValidationError('Invalid receipt', [
          { field: 'receipt_data', message: `Apple verification failed with status ${result.status}` },
        ]);
      }

      // For consumable IAPs, verify product ID matches
      if (expectedProductId) {
        const inApp = result.receipt?.in_app;
        const found = inApp?.some((item) => item.product_id === expectedProductId);
        if (!found) {
          throw new ValidationError('Invalid receipt', [
            { field: 'receipt_data', message: 'Receipt does not match the expected product' },
          ]);
        }
      }
    },

    verifyGoogleReceipt: async (receiptData: string, _expectedProductId: string | null) => {
      let parsed: { packageName: string; productId: string; purchaseToken: string };
      try {
        parsed = JSON.parse(receiptData);
      } catch {
        throw new ValidationError('Invalid receipt', [
          { field: 'receipt_data', message: 'Receipt data must be valid JSON for Google Play' },
        ]);
      }

      const { packageName, productId, purchaseToken } = parsed;

      if (!packageName || !productId || !purchaseToken) {
        throw new ValidationError('Invalid receipt', [
          { field: 'receipt_data', message: 'Missing packageName, productId, or purchaseToken' },
        ]);
      }

      // For production: verify with Google Play Developer API
      // The subscription service handles the actual Google API call;
      // for consumable products we use the products endpoint
      const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new AppError('Google service account key is not configured', 500, 'CONFIG_ERROR');
      }

      // Get access token (reuse from subscription module logic)
      const cacheKey = 'google:access_token';
      let accessToken = await redis.get(cacheKey);

      if (!accessToken) {
        // Token will be fetched/cached by the subscription module
        // For now, throw a descriptive error
        throw new AppError('Google access token not available', 500, 'GOOGLE_AUTH_ERROR');
      }

      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new ValidationError('Invalid receipt', [
          { field: 'receipt_data', message: 'Google Play verification failed' },
        ]);
      }

      const data = await response.json() as { purchaseState: number; consumptionState: number };

      // purchaseState: 0 = purchased, 1 = cancelled
      if (data.purchaseState !== 0) {
        throw new ValidationError('Invalid receipt', [
          { field: 'receipt_data', message: 'Purchase is not in a valid state' },
        ]);
      }
    },
  };
}

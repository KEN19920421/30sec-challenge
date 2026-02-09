import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
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

interface GiftCatalogItem {
  id: string;
  name: string;
  name_ja: string | null;
  icon_url: string;
  animation_url: string | null;
  category: 'quick_reaction' | 'standard' | 'premium';
  coin_cost: number;
  creator_coin_share: number;
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

interface GiftTransaction {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  submission_id: string | null;
  gift_id: string | null;
  coin_amount: number;
  creator_share: number;
  platform_share: number;
  message: string | null;
  created_at: Date;
}

interface GiftTransactionWithDetails extends GiftTransaction {
  gift_name?: string;
  gift_icon_url?: string;
  sender_username?: string;
  sender_display_name?: string;
  sender_avatar_url?: string;
  receiver_username?: string;
  receiver_display_name?: string;
  receiver_avatar_url?: string;
}

interface GroupedCatalog {
  quick_reaction: GiftCatalogItem[];
  standard: GiftCatalogItem[];
  premium: GiftCatalogItem[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_KEY_CATALOG = 'gift:catalog';
const CACHE_TTL_CATALOG = 3600; // 1 hour

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

/**
 * Returns all active gifts grouped by category.
 */
export async function getCatalog(): Promise<GroupedCatalog> {
  const cached = await redis.get(CACHE_KEY_CATALOG);
  if (cached) {
    return JSON.parse(cached);
  }

  const gifts: GiftCatalogItem[] = await db('gift_catalog')
    .where('is_active', true)
    .orderBy('sort_order', 'asc')
    .select('*');

  const grouped: GroupedCatalog = {
    quick_reaction: [],
    standard: [],
    premium: [],
  };

  for (const gift of gifts) {
    grouped[gift.category].push(gift);
  }

  await redis.set(CACHE_KEY_CATALOG, JSON.stringify(grouped), 'EX', CACHE_TTL_CATALOG);

  return grouped;
}

/**
 * Sends a gift from one user to another on a specific submission.
 *
 * Flow:
 *  1. Validate gift, sender balance, and submission existence
 *  2. In a transaction:
 *     - Debit sender (full coin_cost)
 *     - Credit receiver (creator_coin_share, typically 50%)
 *     - Record gift_transaction (platform keeps the remainder)
 *     - Update submission.gift_coins_received
 *     - Create a notification for the receiver
 *  3. Return the gift transaction record
 */
export async function sendGift(
  senderId: string,
  receiverId: string,
  submissionId: string,
  giftId: string,
  message?: string,
): Promise<GiftTransactionWithDetails> {
  // Validate: can't send gift to yourself
  if (senderId === receiverId) {
    throw new ForbiddenError('You cannot send a gift to yourself');
  }

  // Fetch the gift
  const gift = await db('gift_catalog')
    .where('id', giftId)
    .where('is_active', true)
    .first();

  if (!gift) {
    throw new NotFoundError('Gift', giftId);
  }

  // Fetch the submission
  const submission = await db('submissions')
    .where('id', submissionId)
    .whereNull('deleted_at')
    .first('id', 'user_id', 'gift_coins_received');

  if (!submission) {
    throw new NotFoundError('Submission', submissionId);
  }

  // Verify receiver matches submission owner
  if (submission.user_id !== receiverId) {
    throw new ValidationError('Invalid receiver', [
      { field: 'receiver_id', message: 'Receiver must be the submission owner' },
    ]);
  }

  const creatorShare = gift.creator_coin_share;
  const platformShare = gift.coin_cost - creatorShare;

  // Execute the gift in a single transaction
  const giftTransaction = await db.transaction(async (trx) => {
    // 1. Debit sender (lock row to prevent race conditions)
    const sender = await trx('users')
      .where('id', senderId)
      .forUpdate()
      .first('coin_balance', 'total_coins_spent');

    if (!sender) {
      throw new NotFoundError('User', senderId);
    }

    if (sender.coin_balance < gift.coin_cost) {
      throw new ValidationError('Insufficient balance', [
        {
          field: 'gift_id',
          message: `Insufficient coin balance. Current: ${sender.coin_balance}, Required: ${gift.coin_cost}`,
        },
      ]);
    }

    const senderNewBalance = sender.coin_balance - gift.coin_cost;

    // Debit sender: insert transaction + update balance
    await trx('coin_transactions').insert({
      user_id: senderId,
      type: 'gift_sent',
      amount: -gift.coin_cost,
      balance_after: senderNewBalance,
      reference_type: 'gift_transaction',
      reference_id: null, // Will be set after gift_transaction is created
      description: `Sent ${gift.name} gift`,
    });

    await trx('users')
      .where('id', senderId)
      .update({
        coin_balance: senderNewBalance,
        total_coins_spent: sender.total_coins_spent + gift.coin_cost,
        updated_at: trx.fn.now(),
      });

    // 2. Credit receiver
    const receiver = await trx('users')
      .where('id', receiverId)
      .forUpdate()
      .first('coin_balance', 'total_coins_earned');

    if (!receiver) {
      throw new NotFoundError('User', receiverId);
    }

    const receiverNewBalance = receiver.coin_balance + creatorShare;

    await trx('coin_transactions').insert({
      user_id: receiverId,
      type: 'gift_received',
      amount: creatorShare,
      balance_after: receiverNewBalance,
      reference_type: 'gift_transaction',
      reference_id: null,
      description: `Received ${gift.name} gift`,
    });

    await trx('users')
      .where('id', receiverId)
      .update({
        coin_balance: receiverNewBalance,
        total_coins_earned: receiver.total_coins_earned + creatorShare,
        updated_at: trx.fn.now(),
      });

    // 3. Create gift_transaction record
    const [giftTx] = await trx('gift_transactions')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        submission_id: submissionId,
        gift_id: giftId,
        coin_amount: gift.coin_cost,
        creator_share: creatorShare,
        platform_share: platformShare,
        message: message || null,
      })
      .returning('*');

    // 4. Update submission.gift_coins_received
    await trx('submissions')
      .where('id', submissionId)
      .update({
        gift_coins_received: submission.gift_coins_received + gift.coin_cost,
        updated_at: trx.fn.now(),
      });

    // 5. Create notification for receiver
    await trx('notifications').insert({
      user_id: receiverId,
      type: 'gift_received',
      title: `You received a ${gift.name}!`,
      body: message || `Someone sent you a ${gift.name} on your submission`,
      data: JSON.stringify({
        gift_id: giftId,
        gift_name: gift.name,
        gift_icon_url: gift.icon_url,
        sender_id: senderId,
        submission_id: submissionId,
        coin_amount: creatorShare,
      }),
    });

    return giftTx;
  });

  // Invalidate cached user data for both sender and receiver
  await Promise.all([
    redis.del(`user:${senderId}`),
    redis.del(`user:${receiverId}`),
  ]);

  logger.info('Gift sent', {
    senderId,
    receiverId,
    submissionId,
    giftId,
    giftName: gift.name,
    coinCost: gift.coin_cost,
    creatorShare,
    platformShare,
  });

  // Return with gift details
  return {
    ...giftTransaction,
    gift_name: gift.name,
    gift_icon_url: gift.icon_url,
  };
}

/**
 * Returns paginated gifts received by a user.
 */
export async function getReceivedGifts(
  userId: string,
  query: Record<string, unknown>,
): Promise<PaginatedResult<GiftTransactionWithDetails>> {
  const pagination = parsePaginationParams(query);
  const offset = paginationToOffset(pagination);

  const [{ count }] = await db('gift_transactions')
    .where('receiver_id', userId)
    .count('id as count');

  const gifts = await db('gift_transactions as gt')
    .where('gt.receiver_id', userId)
    .leftJoin('gift_catalog as gc', 'gt.gift_id', 'gc.id')
    .leftJoin('users as sender', 'gt.sender_id', 'sender.id')
    .orderBy('gt.created_at', 'desc')
    .offset(offset)
    .limit(pagination.limit)
    .select(
      'gt.*',
      'gc.name as gift_name',
      'gc.icon_url as gift_icon_url',
      'gc.animation_url as gift_animation_url',
      'sender.username as sender_username',
      'sender.display_name as sender_display_name',
      'sender.avatar_url as sender_avatar_url',
    );

  return buildPaginatedResult(gifts, parseInt(count as string, 10), pagination);
}

/**
 * Returns paginated gifts sent by a user.
 */
export async function getSentGifts(
  userId: string,
  query: Record<string, unknown>,
): Promise<PaginatedResult<GiftTransactionWithDetails>> {
  const pagination = parsePaginationParams(query);
  const offset = paginationToOffset(pagination);

  const [{ count }] = await db('gift_transactions')
    .where('sender_id', userId)
    .count('id as count');

  const gifts = await db('gift_transactions as gt')
    .where('gt.sender_id', userId)
    .leftJoin('gift_catalog as gc', 'gt.gift_id', 'gc.id')
    .leftJoin('users as receiver', 'gt.receiver_id', 'receiver.id')
    .orderBy('gt.created_at', 'desc')
    .offset(offset)
    .limit(pagination.limit)
    .select(
      'gt.*',
      'gc.name as gift_name',
      'gc.icon_url as gift_icon_url',
      'gc.animation_url as gift_animation_url',
      'receiver.username as receiver_username',
      'receiver.display_name as receiver_display_name',
      'receiver.avatar_url as receiver_avatar_url',
    );

  return buildPaginatedResult(gifts, parseInt(count as string, 10), pagination);
}

/**
 * Returns paginated gifts on a specific submission.
 */
export async function getSubmissionGifts(
  submissionId: string,
  query: Record<string, unknown>,
): Promise<PaginatedResult<GiftTransactionWithDetails>> {
  const pagination = parsePaginationParams(query);
  const offset = paginationToOffset(pagination);

  // Verify submission exists
  const submission = await db('submissions')
    .where('id', submissionId)
    .whereNull('deleted_at')
    .first('id');

  if (!submission) {
    throw new NotFoundError('Submission', submissionId);
  }

  const [{ count }] = await db('gift_transactions')
    .where('submission_id', submissionId)
    .count('id as count');

  const gifts = await db('gift_transactions as gt')
    .where('gt.submission_id', submissionId)
    .leftJoin('gift_catalog as gc', 'gt.gift_id', 'gc.id')
    .leftJoin('users as sender', 'gt.sender_id', 'sender.id')
    .orderBy('gt.created_at', 'desc')
    .offset(offset)
    .limit(pagination.limit)
    .select(
      'gt.*',
      'gc.name as gift_name',
      'gc.icon_url as gift_icon_url',
      'gc.animation_url as gift_animation_url',
      'sender.username as sender_username',
      'sender.display_name as sender_display_name',
      'sender.avatar_url as sender_avatar_url',
    );

  return buildPaginatedResult(gifts, parseInt(count as string, 10), pagination);
}

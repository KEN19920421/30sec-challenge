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

/**
 * Creator tier revenue share rates.
 * These represent the percentage of the total coin_cost paid to the creator.
 * The platform retains the remainder.
 *
 * rookie:   50% (baseline — same as default creator_coin_share)
 * rising:   55%
 * partner:  60%
 * featured: 65%
 */
const CREATOR_TIER_SHARE_RATES: Record<string, number> = {
  rookie: 0.50,
  rising: 0.55,
  partner: 0.60,
  featured: 0.65,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculates the effective creator share based on the recipient's creator tier.
 * If the tier grants a higher payout than the gift's base creator_coin_share,
 * the tier rate takes precedence (applied as a percentage of coin_cost).
 * Otherwise, the gift's base creator_coin_share is used.
 */
function resolveCreatorShare(
  coinCost: number,
  baseCreatorShare: number,
  creatorTier: string | null | undefined,
): { creatorShare: number; platformShare: number } {
  let creatorShare = baseCreatorShare;

  if (creatorTier && CREATOR_TIER_SHARE_RATES[creatorTier] !== undefined) {
    const tierShare = Math.floor(coinCost * CREATOR_TIER_SHARE_RATES[creatorTier]);
    // Always grant at least the tier share if it's higher than the base
    if (tierShare > baseCreatorShare) {
      creatorShare = tierShare;
    }
  }

  const platformShare = coinCost - creatorShare;
  return { creatorShare, platformShare };
}

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
 *     - Credit receiver (creator share adjusted by creator_tier)
 *     - Record gift_transaction (platform keeps the remainder)
 *     - Update submission.gift_coins_received
 *     - Create a notification for the receiver
 *  3. Return the gift transaction record
 *
 * Creator tier revenue share:
 *   - rookie:   50% of coin_cost (baseline)
 *   - rising:   55% of coin_cost
 *   - partner:  60% of coin_cost
 *   - featured: 65% of coin_cost
 *
 * If the recipient has no creator tier, the gift's base creator_coin_share is used.
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
    .where('moderation_status', 'approved')
    .where('transcode_status', 'completed')
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

  // Look up the receiver's creator_tier to apply the appropriate revenue share
  const receiverUser = await db('users')
    .where('id', receiverId)
    .first('creator_tier');

  const { creatorShare, platformShare } = resolveCreatorShare(
    gift.coin_cost,
    gift.creator_coin_share,
    receiverUser?.creator_tier,
  );

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

    // 2. Credit receiver (using tier-adjusted creatorShare)
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

    // 3. Create gift_transaction record (with tier-adjusted shares)
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
    receiverCreatorTier: receiverUser?.creator_tier ?? null,
  });

  // Return with gift details
  return {
    ...giftTransaction,
    gift_name: gift.name,
    gift_icon_url: gift.icon_url,
  };
}

// ---------------------------------------------------------------------------
// Gift Analytics
// ---------------------------------------------------------------------------

export interface GiftAnalytics {
  totalReceived: number;
  totalCoinsReceived: number;
  topGifters: Array<{
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    giftCount: number;
  }>;
  recentGifts: Array<{
    id: string;
    giftName: string | null;
    giftIconUrl: string | null;
    coinAmount: number;
    message: string | null;
    senderId: string | null;
    senderUsername: string | null;
    senderDisplayName: string | null;
    senderAvatarUrl: string | null;
    createdAt: Date;
  }>;
}

/**
 * Returns gift analytics for the authenticated user (gifts they received).
 */
export async function getGiftAnalytics(userId: string): Promise<GiftAnalytics> {
  const [totalResult, topGiftersResult, recentGiftsResult] = await Promise.all([
    // Total received count and coin sum
    db('gift_transactions')
      .where('receiver_id', userId)
      .select(
        db.raw('COUNT(*) as total_received'),
        db.raw('COALESCE(SUM(coin_amount), 0) as total_coins_received'),
      )
      .first(),

    // Top 5 gifters by number of gifts sent to this user
    db('gift_transactions as gt')
      .where('gt.receiver_id', userId)
      .whereNotNull('gt.sender_id')
      .join('users as sender', 'gt.sender_id', 'sender.id')
      .select(
        'sender.id as user_id',
        'sender.username',
        'sender.display_name',
        'sender.avatar_url',
        db.raw('COUNT(gt.id) as gift_count'),
      )
      .groupBy('sender.id', 'sender.username', 'sender.display_name', 'sender.avatar_url')
      .orderBy('gift_count', 'desc')
      .limit(5),

    // Last 5 received gifts with sender info
    db('gift_transactions as gt')
      .where('gt.receiver_id', userId)
      .leftJoin('gift_catalog as gc', 'gt.gift_id', 'gc.id')
      .leftJoin('users as sender', 'gt.sender_id', 'sender.id')
      .select(
        'gt.id',
        'gc.name as gift_name',
        'gc.icon_url as gift_icon_url',
        'gt.coin_amount',
        'gt.message',
        'gt.sender_id',
        'gt.created_at',
        'sender.username as sender_username',
        'sender.display_name as sender_display_name',
        'sender.avatar_url as sender_avatar_url',
      )
      .orderBy('gt.created_at', 'desc')
      .limit(5),
  ]);

  return {
    totalReceived: Number(totalResult?.total_received ?? 0),
    totalCoinsReceived: Number(totalResult?.total_coins_received ?? 0),
    topGifters: topGiftersResult.map((row: Record<string, unknown>) => ({
      userId: String(row.user_id),
      username: String(row.username),
      displayName: String(row.display_name),
      avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
      giftCount: Number(row.gift_count),
    })),
    recentGifts: recentGiftsResult.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      giftName: row.gift_name ? String(row.gift_name) : null,
      giftIconUrl: row.gift_icon_url ? String(row.gift_icon_url) : null,
      coinAmount: Number(row.coin_amount),
      message: row.message ? String(row.message) : null,
      senderId: row.sender_id ? String(row.sender_id) : null,
      senderUsername: row.sender_username ? String(row.sender_username) : null,
      senderDisplayName: row.sender_display_name ? String(row.sender_display_name) : null,
      senderAvatarUrl: row.sender_avatar_url ? String(row.sender_avatar_url) : null,
      createdAt: new Date(row.created_at as string),
    })),
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

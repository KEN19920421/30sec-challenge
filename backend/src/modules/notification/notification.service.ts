import { db } from '../../config/database';
import { redis } from '../../config/redis';
import { logger } from '../../config/logger';
import { NotFoundError } from '../../shared/errors';
import {
  PaginationParams,
  PaginatedResult,
  paginationToOffset,
  buildPaginatedResult,
} from '../../shared/types/pagination';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'follow'
  | 'like'
  | 'comment'
  | 'challenge_start'
  | 'challenge_end'
  | 'submission'
  | 'achievement'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: Date;
}

export interface NotificationPreferences {
  new_follower: boolean;
  vote_received: boolean;
  gift_received: boolean;
  challenge_start: boolean;
  rank_achieved: boolean;
  achievement_earned: boolean;
  submission_status: boolean;
  marketing: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UNREAD_COUNT_CACHE_PREFIX = 'unread_notifications:';
const UNREAD_COUNT_TTL = 600; // 10 minutes

const DEFAULT_PREFERENCES: NotificationPreferences = {
  new_follower: true,
  vote_received: true,
  gift_received: true,
  challenge_start: true,
  rank_achieved: true,
  achievement_earned: true,
  submission_status: true,
  marketing: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function unreadCountKey(userId: string): string {
  return `${UNREAD_COUNT_CACHE_PREFIX}${userId}`;
}

async function invalidateUnreadCount(userId: string): Promise<void> {
  await redis.del(unreadCountKey(userId));
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Creates a notification record for a user.
 */
export async function create(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<Notification> {
  const [notification] = await db('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      body,
      data: data ?? null,
      is_read: false,
    })
    .returning('*');

  await invalidateUnreadCount(userId);

  logger.debug('Notification created', {
    notificationId: notification.id,
    userId,
    type,
  });

  return notification as Notification;
}

/**
 * Returns a paginated list of notifications for a user, newest first.
 */
export async function getNotifications(
  userId: string,
  pagination: PaginationParams,
): Promise<PaginatedResult<Notification>> {
  const offset = paginationToOffset(pagination);

  const baseQuery = db('notifications').where('user_id', userId);

  const [{ count }] = await baseQuery.clone().count('* as count');
  const total = Number(count);

  const rows = await baseQuery
    .clone()
    .select('*')
    .orderBy('created_at', 'desc')
    .limit(pagination.limit)
    .offset(offset);

  const notifications: Notification[] = rows as Notification[];

  return buildPaginatedResult(notifications, total, pagination);
}

/**
 * Marks a single notification as read.
 */
export async function markAsRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  const updated = await db('notifications')
    .where({ id: notificationId, user_id: userId })
    .update({ is_read: true });

  if (!updated) {
    throw new NotFoundError('Notification', notificationId);
  }

  await invalidateUnreadCount(userId);
}

/**
 * Marks all notifications for a user as read.
 */
export async function markAllAsRead(userId: string): Promise<void> {
  await db('notifications')
    .where({ user_id: userId, is_read: false })
    .update({ is_read: true });

  await invalidateUnreadCount(userId);

  logger.info('All notifications marked as read', { userId });
}

/**
 * Returns the count of unread notifications for a user.
 * Uses Redis caching to avoid repeated DB queries.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const cacheKey = unreadCountKey(userId);

  const cached = await redis.get(cacheKey);
  if (cached !== null) {
    return Number(cached);
  }

  const [{ count }] = await db('notifications')
    .where({ user_id: userId, is_read: false })
    .count('* as count');

  const unreadCount = Number(count);

  await redis.set(cacheKey, unreadCount.toString(), 'EX', UNREAD_COUNT_TTL);

  return unreadCount;
}

/**
 * Deletes a single notification.
 */
export async function deleteNotification(
  userId: string,
  notificationId: string,
): Promise<void> {
  const deleted = await db('notifications')
    .where({ id: notificationId, user_id: userId })
    .delete();

  if (!deleted) {
    throw new NotFoundError('Notification', notificationId);
  }

  await invalidateUnreadCount(userId);
}

/**
 * Updates notification preferences for a user.
 * Creates a preferences row if one does not already exist (upsert).
 */
export async function updatePreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const existing = await db('notification_preferences')
    .where('user_id', userId)
    .first('*');

  if (existing) {
    const [updated] = await db('notification_preferences')
      .where('user_id', userId)
      .update({
        ...preferences,
        updated_at: db.fn.now(),
      })
      .returning('*');

    const { id: _id, user_id: _uid, created_at: _ca, updated_at: _ua, ...prefs } = updated;
    return prefs as NotificationPreferences;
  }

  const [created] = await db('notification_preferences')
    .insert({
      user_id: userId,
      ...DEFAULT_PREFERENCES,
      ...preferences,
    })
    .returning('*');

  const { id: _id, user_id: _uid, created_at: _ca, updated_at: _ua, ...prefs } = created;
  return prefs as NotificationPreferences;
}

/**
 * Returns the notification preferences for a user.
 * Returns default preferences if none are explicitly set.
 */
export async function getPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  const row = await db('notification_preferences')
    .where('user_id', userId)
    .first('*');

  if (!row) {
    return { ...DEFAULT_PREFERENCES };
  }

  const { id: _id, user_id: _uid, created_at: _ca, updated_at: _ua, ...prefs } = row;
  return prefs as NotificationPreferences;
}

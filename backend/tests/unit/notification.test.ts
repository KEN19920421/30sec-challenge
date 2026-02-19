/**
 * Unit tests for the notification service logic.
 *
 * These tests mock the database (Knex), Redis, and logger so that no real
 * connections are needed. They verify notification CRUD, unread count caching,
 * and preferences management.
 */

// ---------------------------------------------------------------------------
// Mocks -- must be set up before importing the module under test
// ---------------------------------------------------------------------------

// Mock Redis with a Map-based store for testing cache behavior
const redisStore = new Map<string, string>();

jest.mock('../../src/config/redis', () => ({
  redis: {
    get: jest.fn((key: string) => Promise.resolve(redisStore.get(key) ?? null)),
    set: jest.fn((key: string, value: string, _mode?: string, _ttl?: number) => {
      redisStore.set(key, value);
      return Promise.resolve('OK');
    }),
    del: jest.fn((key: string) => {
      redisStore.delete(key);
      return Promise.resolve(1);
    }),
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

// Build a chainable query builder mock
function createQueryBuilder() {
  const builder: Record<string, jest.Mock> = {
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn().mockReturnValue({ returning: jest.fn() }),
    update: jest.fn().mockReturnValue({ returning: jest.fn() }),
    count: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    clone: jest.fn(),
    delete: jest.fn(),
  };
  builder.clone.mockReturnValue(builder);
  return builder;
}

// Create the main db mock
const mockDb = jest.fn().mockReturnValue(createQueryBuilder());
(mockDb as any).fn = { now: jest.fn().mockReturnValue('NOW()') };
(mockDb as any).raw = jest.fn();

jest.mock('../../src/config/database', () => ({
  db: mockDb,
}));

// Now import the module under test
import * as notificationService from '../../src/modules/notification/notification.service';
import { NotFoundError } from '../../src/shared/errors';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisStore.clear();
    mockDb.mockReturnValue(createQueryBuilder());
  });

  // -------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------

  describe('create()', () => {
    it('creates a notification and returns it', async () => {
      const mockNotification = {
        id: 'notif-1',
        user_id: 'user-1',
        type: 'follow',
        title: 'New follower',
        body: 'johndoe started following you',
        data: null,
        is_read: false,
        created_at: new Date(),
      };

      const builder = createQueryBuilder();
      builder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockNotification]),
      });
      mockDb.mockReturnValue(builder);

      const result = await notificationService.create(
        'user-1',
        'follow',
        'New follower',
        'johndoe started following you',
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('notif-1');
      expect(result.type).toBe('follow');
      expect(result.is_read).toBe(false);
      expect(mockDb).toHaveBeenCalledWith('notifications');
    });

    it('creates a notification with extra data payload', async () => {
      const extraData = { follower_id: 'user-2', follower_name: 'Jane' };
      const mockNotification = {
        id: 'notif-2',
        user_id: 'user-1',
        type: 'follow',
        title: 'New follower',
        body: 'Jane started following you',
        data: extraData,
        is_read: false,
        created_at: new Date(),
      };

      let insertedData: any = null;
      const builder = createQueryBuilder();
      builder.insert.mockImplementation((data: any) => {
        insertedData = data;
        return {
          returning: jest.fn().mockResolvedValue([mockNotification]),
        };
      });
      mockDb.mockReturnValue(builder);

      const result = await notificationService.create(
        'user-1',
        'follow',
        'New follower',
        'Jane started following you',
        extraData,
      );

      expect(result.data).toEqual(extraData);
      expect(insertedData.data).toEqual(extraData);
    });

    it('invalidates the unread count cache after creation', async () => {
      // Prime the cache
      redisStore.set('unread_notifications:user-1', '5');

      const mockNotification = {
        id: 'notif-3',
        user_id: 'user-1',
        type: 'like',
        title: 'New like',
        body: 'Someone liked your video',
        data: null,
        is_read: false,
        created_at: new Date(),
      };

      const builder = createQueryBuilder();
      builder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockNotification]),
      });
      mockDb.mockReturnValue(builder);

      await notificationService.create(
        'user-1',
        'like',
        'New like',
        'Someone liked your video',
      );

      // Cache should be invalidated
      expect(redisStore.has('unread_notifications:user-1')).toBe(false);
    });

    it('logs debug info after creation', async () => {
      const { logger } = require('../../src/config/logger');

      const mockNotification = {
        id: 'notif-log',
        user_id: 'user-1',
        type: 'system',
        title: 'System notice',
        body: 'Maintenance scheduled',
        data: null,
        is_read: false,
        created_at: new Date(),
      };

      const builder = createQueryBuilder();
      builder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockNotification]),
      });
      mockDb.mockReturnValue(builder);

      await notificationService.create(
        'user-1',
        'system',
        'System notice',
        'Maintenance scheduled',
      );

      expect(logger.debug).toHaveBeenCalledWith(
        'Notification created',
        expect.objectContaining({
          notificationId: 'notif-log',
          userId: 'user-1',
          type: 'system',
        }),
      );
    });
  });

  // -------------------------------------------------------------------
  // getNotifications
  // -------------------------------------------------------------------

  describe('getNotifications()', () => {
    it('returns paginated notifications for a user', async () => {
      const mockNotifications = [
        {
          id: 'notif-a',
          user_id: 'user-1',
          type: 'follow',
          title: 'Follower',
          body: 'New follower',
          is_read: false,
          created_at: new Date(),
        },
        {
          id: 'notif-b',
          user_id: 'user-1',
          type: 'like',
          title: 'Like',
          body: 'New like',
          is_read: true,
          created_at: new Date(),
        },
      ];

      // Count query
      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '2' }]);
      countBuilder.clone.mockReturnValue(countBuilder);

      // Data query - clone returns a new builder
      const dataBuilder = createQueryBuilder();
      dataBuilder.offset.mockResolvedValue(mockNotifications);

      // The base query is cloned twice: once for count, once for data
      let cloneCallIndex = 0;
      const baseBuilder = createQueryBuilder();
      baseBuilder.clone.mockImplementation(() => {
        cloneCallIndex++;
        if (cloneCallIndex === 1) return countBuilder;
        return dataBuilder;
      });

      mockDb.mockReturnValue(baseBuilder);

      const result = await notificationService.getNotifications('user-1', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total_pages).toBe(1);
    });

    it('returns empty results when user has no notifications', async () => {
      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '0' }]);

      const dataBuilder = createQueryBuilder();
      dataBuilder.offset.mockResolvedValue([]);

      let cloneCallIndex = 0;
      const baseBuilder = createQueryBuilder();
      baseBuilder.clone.mockImplementation(() => {
        cloneCallIndex++;
        if (cloneCallIndex === 1) return countBuilder;
        return dataBuilder;
      });

      mockDb.mockReturnValue(baseBuilder);

      const result = await notificationService.getNotifications('user-empty', {
        page: 1,
        limit: 20,
      });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('handles multi-page pagination correctly', async () => {
      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '45' }]);

      const dataBuilder = createQueryBuilder();
      dataBuilder.offset.mockResolvedValue([{ id: 'notif-p3' }]);

      let cloneCallIndex = 0;
      const baseBuilder = createQueryBuilder();
      baseBuilder.clone.mockImplementation(() => {
        cloneCallIndex++;
        if (cloneCallIndex === 1) return countBuilder;
        return dataBuilder;
      });

      mockDb.mockReturnValue(baseBuilder);

      const result = await notificationService.getNotifications('user-1', {
        page: 3,
        limit: 20,
      });

      expect(result.total).toBe(45);
      expect(result.page).toBe(3);
      expect(result.total_pages).toBe(3);
    });
  });

  // -------------------------------------------------------------------
  // markAsRead
  // -------------------------------------------------------------------

  describe('markAsRead()', () => {
    it('marks a notification as read', async () => {
      const builder = createQueryBuilder();
      builder.update.mockResolvedValue(1);
      mockDb.mockReturnValue(builder);

      await expect(
        notificationService.markAsRead('user-1', 'notif-1'),
      ).resolves.toBeUndefined();

      expect(builder.where).toHaveBeenCalledWith({
        id: 'notif-1',
        user_id: 'user-1',
      });
    });

    it('throws NotFoundError when notification does not exist', async () => {
      const builder = createQueryBuilder();
      builder.update.mockResolvedValue(0);
      mockDb.mockReturnValue(builder);

      await expect(
        notificationService.markAsRead('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundError);
    });

    it('invalidates the unread count cache', async () => {
      redisStore.set('unread_notifications:user-1', '3');

      const builder = createQueryBuilder();
      builder.update.mockResolvedValue(1);
      mockDb.mockReturnValue(builder);

      await notificationService.markAsRead('user-1', 'notif-1');

      expect(redisStore.has('unread_notifications:user-1')).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // markAllAsRead
  // -------------------------------------------------------------------

  describe('markAllAsRead()', () => {
    it('marks all unread notifications as read', async () => {
      const builder = createQueryBuilder();
      builder.update.mockResolvedValue(5);
      mockDb.mockReturnValue(builder);

      await expect(
        notificationService.markAllAsRead('user-1'),
      ).resolves.toBeUndefined();

      expect(builder.where).toHaveBeenCalledWith({
        user_id: 'user-1',
        is_read: false,
      });
    });

    it('invalidates the unread count cache', async () => {
      redisStore.set('unread_notifications:user-1', '10');

      const builder = createQueryBuilder();
      builder.update.mockResolvedValue(10);
      mockDb.mockReturnValue(builder);

      await notificationService.markAllAsRead('user-1');

      expect(redisStore.has('unread_notifications:user-1')).toBe(false);
    });

    it('logs info after marking all as read', async () => {
      const { logger } = require('../../src/config/logger');

      const builder = createQueryBuilder();
      builder.update.mockResolvedValue(3);
      mockDb.mockReturnValue(builder);

      await notificationService.markAllAsRead('user-mark-all');

      expect(logger.info).toHaveBeenCalledWith(
        'All notifications marked as read',
        { userId: 'user-mark-all' },
      );
    });
  });

  // -------------------------------------------------------------------
  // getUnreadCount
  // -------------------------------------------------------------------

  describe('getUnreadCount()', () => {
    it('returns cached count when available', async () => {
      redisStore.set('unread_notifications:user-1', '7');

      const result = await notificationService.getUnreadCount('user-1');

      expect(result).toBe(7);
      // Should NOT have queried the database
      expect(mockDb).not.toHaveBeenCalledWith('notifications');
    });

    it('queries the database when cache is empty and caches the result', async () => {
      const builder = createQueryBuilder();
      builder.count.mockResolvedValue([{ count: '12' }]);
      mockDb.mockReturnValue(builder);

      const result = await notificationService.getUnreadCount('user-2');

      expect(result).toBe(12);
      expect(mockDb).toHaveBeenCalledWith('notifications');
      // Should have cached the result
      expect(redisStore.get('unread_notifications:user-2')).toBe('12');
    });

    it('returns 0 when user has no unread notifications', async () => {
      const builder = createQueryBuilder();
      builder.count.mockResolvedValue([{ count: '0' }]);
      mockDb.mockReturnValue(builder);

      const result = await notificationService.getUnreadCount('user-zero');

      expect(result).toBe(0);
      expect(redisStore.get('unread_notifications:user-zero')).toBe('0');
    });

    it('cache is invalidated after creating a new notification', async () => {
      // First, warm up the cache
      redisStore.set('unread_notifications:user-1', '5');

      // Create a notification (which invalidates cache)
      const mockNotification = {
        id: 'notif-new',
        user_id: 'user-1',
        type: 'follow',
        title: 'Follow',
        body: 'New follower',
        data: null,
        is_read: false,
        created_at: new Date(),
      };

      const insertBuilder = createQueryBuilder();
      insertBuilder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockNotification]),
      });
      mockDb.mockReturnValue(insertBuilder);

      await notificationService.create('user-1', 'follow', 'Follow', 'New follower');

      // Cache should be gone
      expect(redisStore.has('unread_notifications:user-1')).toBe(false);

      // Next getUnreadCount should hit DB
      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '6' }]);
      mockDb.mockReturnValue(countBuilder);

      const count = await notificationService.getUnreadCount('user-1');
      expect(count).toBe(6);
    });
  });

  // -------------------------------------------------------------------
  // deleteNotification
  // -------------------------------------------------------------------

  describe('deleteNotification()', () => {
    it('deletes a notification successfully', async () => {
      const builder = createQueryBuilder();
      builder.delete.mockResolvedValue(1);
      mockDb.mockReturnValue(builder);

      await expect(
        notificationService.deleteNotification('user-1', 'notif-1'),
      ).resolves.toBeUndefined();

      expect(builder.where).toHaveBeenCalledWith({
        id: 'notif-1',
        user_id: 'user-1',
      });
    });

    it('throws NotFoundError when notification does not exist', async () => {
      const builder = createQueryBuilder();
      builder.delete.mockResolvedValue(0);
      mockDb.mockReturnValue(builder);

      await expect(
        notificationService.deleteNotification('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundError);
    });

    it('invalidates the unread count cache after deletion', async () => {
      redisStore.set('unread_notifications:user-1', '4');

      const builder = createQueryBuilder();
      builder.delete.mockResolvedValue(1);
      mockDb.mockReturnValue(builder);

      await notificationService.deleteNotification('user-1', 'notif-del');

      expect(redisStore.has('unread_notifications:user-1')).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // updatePreferences
  // -------------------------------------------------------------------

  describe('updatePreferences()', () => {
    it('updates existing preferences and returns them', async () => {
      const existingPrefs = {
        id: 'pref-1',
        user_id: 'user-1',
        new_follower: true,
        vote_received: true,
        gift_received: true,
        challenge_start: true,
        rank_achieved: true,
        achievement_earned: true,
        submission_status: true,
        marketing: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updatedRow = {
        ...existingPrefs,
        marketing: true,
        updated_at: new Date(),
      };

      // Call 1: check existing
      const existingBuilder = createQueryBuilder();
      existingBuilder.first.mockResolvedValue(existingPrefs);

      // Call 2: update
      const updateBuilder = createQueryBuilder();
      updateBuilder.update.mockReturnValue({
        returning: jest.fn().mockResolvedValue([updatedRow]),
      });

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return existingBuilder;
        return updateBuilder;
      });

      const result = await notificationService.updatePreferences('user-1', {
        marketing: true,
      });

      expect(result.marketing).toBe(true);
      // Should not include internal fields
      expect((result as any).id).toBeUndefined();
      expect((result as any).user_id).toBeUndefined();
    });

    it('creates default preferences with overrides when none exist', async () => {
      // Call 1: no existing preferences
      const existingBuilder = createQueryBuilder();
      existingBuilder.first.mockResolvedValue(undefined);

      // Call 2: insert new
      const insertBuilder = createQueryBuilder();
      const createdRow = {
        id: 'pref-new',
        user_id: 'user-2',
        new_follower: true,
        vote_received: true,
        gift_received: true,
        challenge_start: false, // overridden
        rank_achieved: true,
        achievement_earned: true,
        submission_status: true,
        marketing: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      insertBuilder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([createdRow]),
      });

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return existingBuilder;
        return insertBuilder;
      });

      const result = await notificationService.updatePreferences('user-2', {
        challenge_start: false,
      });

      expect(result.challenge_start).toBe(false);
      expect(result.new_follower).toBe(true); // default preserved
    });
  });

  // -------------------------------------------------------------------
  // getPreferences
  // -------------------------------------------------------------------

  describe('getPreferences()', () => {
    it('returns stored preferences for a user', async () => {
      const prefRow = {
        id: 'pref-1',
        user_id: 'user-1',
        new_follower: true,
        vote_received: false,
        gift_received: true,
        challenge_start: true,
        rank_achieved: false,
        achievement_earned: true,
        submission_status: true,
        marketing: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const builder = createQueryBuilder();
      builder.first.mockResolvedValue(prefRow);
      mockDb.mockReturnValue(builder);

      const result = await notificationService.getPreferences('user-1');

      expect(result.vote_received).toBe(false);
      expect(result.rank_achieved).toBe(false);
      expect((result as any).id).toBeUndefined();
      expect((result as any).user_id).toBeUndefined();
    });

    it('returns default preferences when none are set', async () => {
      const builder = createQueryBuilder();
      builder.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(builder);

      const result = await notificationService.getPreferences('user-no-prefs');

      expect(result.new_follower).toBe(true);
      expect(result.vote_received).toBe(true);
      expect(result.gift_received).toBe(true);
      expect(result.challenge_start).toBe(true);
      expect(result.rank_achieved).toBe(true);
      expect(result.achievement_earned).toBe(true);
      expect(result.submission_status).toBe(true);
      expect(result.marketing).toBe(false);
    });

    it('returns a copy of defaults so mutations do not affect future calls', async () => {
      const builder = createQueryBuilder();
      builder.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(builder);

      const result1 = await notificationService.getPreferences('user-a');
      result1.marketing = true; // mutate

      mockDb.mockReturnValue(builder);
      const result2 = await notificationService.getPreferences('user-b');

      expect(result2.marketing).toBe(false); // should still be default
    });
  });
});

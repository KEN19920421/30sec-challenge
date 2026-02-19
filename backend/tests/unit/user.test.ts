/**
 * Unit tests for the user service logic.
 *
 * These tests mock the database (Knex), Redis, and logger so that no real
 * connections are needed. They verify user profile retrieval/update, search,
 * submissions listing, account deletion, and avatar update.
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
    whereILike: jest.fn().mockReturnThis(),
    orWhereILike: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
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
import * as userService from '../../src/modules/user/user.service';
import { NotFoundError } from '../../src/shared/errors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockUserProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    username: 'johndoe',
    email: 'john@example.com',
    display_name: 'John Doe',
    avatar_url: null,
    bio: 'Hello world',
    role: 'user',
    subscription_tier: 'free',
    follower_count: 10,
    following_count: 5,
    submission_count: 3,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-06-01'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisStore.clear();
    mockDb.mockReturnValue(createQueryBuilder());
  });

  // -------------------------------------------------------------------
  // getProfile
  // -------------------------------------------------------------------

  describe('getProfile()', () => {
    it('returns a user profile from the database', async () => {
      const mockProfile = createMockUserProfile();

      const builder = createQueryBuilder();
      builder.first.mockResolvedValue(mockProfile);
      mockDb.mockReturnValue(builder);

      const result = await userService.getProfile('user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('user-1');
      expect(result.username).toBe('johndoe');
      expect(result.is_following).toBe(false);
    });

    it('returns cached profile when available', async () => {
      const cachedProfile = createMockUserProfile();
      redisStore.set('user_profile:user-1', JSON.stringify(cachedProfile));

      const result = await userService.getProfile('user-1');

      expect(result.id).toBe('user-1');
      expect(result.username).toBe('johndoe');
      // Should NOT have queried the database for the profile
      // (db might still be called for the follow check, but not for profile)
    });

    it('caches profile after fetching from database', async () => {
      const mockProfile = createMockUserProfile();

      const builder = createQueryBuilder();
      builder.first.mockResolvedValue(mockProfile);
      mockDb.mockReturnValue(builder);

      await userService.getProfile('user-1');

      // Verify cache was populated
      const cached = redisStore.get('user_profile:user-1');
      expect(cached).toBeDefined();
      const parsed = JSON.parse(cached!);
      expect(parsed.id).toBe('user-1');
    });

    it('throws NotFoundError when user does not exist', async () => {
      const builder = createQueryBuilder();
      builder.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(builder);

      await expect(
        userService.getProfile('nonexistent'),
      ).rejects.toThrow(NotFoundError);
    });

    it('includes is_following=true when viewer follows the user', async () => {
      const mockProfile = createMockUserProfile();

      // Call 1: profile lookup
      const profileBuilder = createQueryBuilder();
      profileBuilder.first.mockResolvedValue(mockProfile);

      // Call 2: follow check
      const followBuilder = createQueryBuilder();
      followBuilder.first.mockResolvedValue({ id: 'follow-1' });

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return profileBuilder;
        return followBuilder;
      });

      const result = await userService.getProfile('user-1', 'viewer-1');

      expect(result.is_following).toBe(true);
    });

    it('includes is_following=false when viewer does not follow the user', async () => {
      const mockProfile = createMockUserProfile();

      const profileBuilder = createQueryBuilder();
      profileBuilder.first.mockResolvedValue(mockProfile);

      const followBuilder = createQueryBuilder();
      followBuilder.first.mockResolvedValue(undefined);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return profileBuilder;
        return followBuilder;
      });

      const result = await userService.getProfile('user-1', 'viewer-1');

      expect(result.is_following).toBe(false);
    });

    it('sets is_following=false when viewer is the same as the user', async () => {
      const mockProfile = createMockUserProfile();

      const builder = createQueryBuilder();
      builder.first.mockResolvedValue(mockProfile);
      mockDb.mockReturnValue(builder);

      const result = await userService.getProfile('user-1', 'user-1');

      expect(result.is_following).toBe(false);
    });

    it('sets is_following=false when no viewerId is provided', async () => {
      const mockProfile = createMockUserProfile();

      const builder = createQueryBuilder();
      builder.first.mockResolvedValue(mockProfile);
      mockDb.mockReturnValue(builder);

      const result = await userService.getProfile('user-1');

      expect(result.is_following).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // updateProfile
  // -------------------------------------------------------------------

  describe('updateProfile()', () => {
    it('updates display_name and returns the updated profile', async () => {
      const updatedProfile = createMockUserProfile({ display_name: 'New Name' });

      const builder = createQueryBuilder();
      builder.update.mockReturnValue({
        returning: jest.fn().mockResolvedValue([updatedProfile]),
      });
      mockDb.mockReturnValue(builder);

      const result = await userService.updateProfile('user-1', {
        display_name: 'New Name',
      });

      expect(result.display_name).toBe('New Name');
    });

    it('updates bio and avatar_url together', async () => {
      const updatedProfile = createMockUserProfile({
        bio: 'Updated bio',
        avatar_url: 'https://example.com/new-avatar.jpg',
      });

      let updatePayload: any = null;
      const builder = createQueryBuilder();
      builder.update.mockImplementation((data: any) => {
        updatePayload = data;
        return {
          returning: jest.fn().mockResolvedValue([updatedProfile]),
        };
      });
      mockDb.mockReturnValue(builder);

      const result = await userService.updateProfile('user-1', {
        bio: 'Updated bio',
        avatar_url: 'https://example.com/new-avatar.jpg',
      });

      expect(result.bio).toBe('Updated bio');
      expect(result.avatar_url).toBe('https://example.com/new-avatar.jpg');
      expect(updatePayload.bio).toBe('Updated bio');
      expect(updatePayload.avatar_url).toBe('https://example.com/new-avatar.jpg');
    });

    it('throws NotFoundError when user does not exist', async () => {
      const builder = createQueryBuilder();
      builder.update.mockReturnValue({
        returning: jest.fn().mockResolvedValue([undefined]),
      });
      mockDb.mockReturnValue(builder);

      await expect(
        userService.updateProfile('nonexistent', { display_name: 'Test' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('invalidates the profile cache after update', async () => {
      redisStore.set('user_profile:user-1', JSON.stringify(createMockUserProfile()));

      const updatedProfile = createMockUserProfile({ display_name: 'Updated' });
      const builder = createQueryBuilder();
      builder.update.mockReturnValue({
        returning: jest.fn().mockResolvedValue([updatedProfile]),
      });
      mockDb.mockReturnValue(builder);

      await userService.updateProfile('user-1', { display_name: 'Updated' });

      expect(redisStore.has('user_profile:user-1')).toBe(false);
    });

    it('logs info after updating', async () => {
      const { logger } = require('../../src/config/logger');

      const updatedProfile = createMockUserProfile();
      const builder = createQueryBuilder();
      builder.update.mockReturnValue({
        returning: jest.fn().mockResolvedValue([updatedProfile]),
      });
      mockDb.mockReturnValue(builder);

      await userService.updateProfile('user-1', { display_name: 'New' });

      expect(logger.info).toHaveBeenCalledWith(
        'Profile updated',
        { userId: 'user-1' },
      );
    });
  });

  // -------------------------------------------------------------------
  // searchUsers
  // -------------------------------------------------------------------

  describe('searchUsers()', () => {
    it('returns paginated search results matching username or display_name', async () => {
      const matchingUsers = [
        createMockUserProfile({ id: 'user-a', username: 'johndoe' }),
        createMockUserProfile({ id: 'user-b', username: 'john_smith', display_name: 'John Smith' }),
      ];

      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '2' }]);

      const dataBuilder = createQueryBuilder();
      dataBuilder.offset.mockResolvedValue(matchingUsers);

      let cloneCallIndex = 0;
      const baseBuilder = createQueryBuilder();
      baseBuilder.clone.mockImplementation(() => {
        cloneCallIndex++;
        if (cloneCallIndex === 1) return countBuilder;
        return dataBuilder;
      });
      // andWhere needs to return the builder for chaining
      baseBuilder.andWhere.mockImplementation((fn: Function) => {
        // The function uses this.whereILike... but we mock it at builder level
        return baseBuilder;
      });

      mockDb.mockReturnValue(baseBuilder);

      const result = await userService.searchUsers('john', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('returns empty results when no users match', async () => {
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

      const result = await userService.searchUsers('xyznonexistent', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('handles multi-page results', async () => {
      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '35' }]);

      const dataBuilder = createQueryBuilder();
      dataBuilder.offset.mockResolvedValue([
        createMockUserProfile({ id: 'user-page2' }),
      ]);

      let cloneCallIndex = 0;
      const baseBuilder = createQueryBuilder();
      baseBuilder.clone.mockImplementation(() => {
        cloneCallIndex++;
        if (cloneCallIndex === 1) return countBuilder;
        return dataBuilder;
      });

      mockDb.mockReturnValue(baseBuilder);

      const result = await userService.searchUsers('john', { page: 2, limit: 10 });

      expect(result.total).toBe(35);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total_pages).toBe(4);
    });
  });

  // -------------------------------------------------------------------
  // getUserSubmissions
  // -------------------------------------------------------------------

  describe('getUserSubmissions()', () => {
    it('returns paginated submissions for a user', async () => {
      const mockSubmissions = [
        {
          id: 'sub-1',
          user_id: 'user-1',
          video_url: 'https://cdn.example.com/video1.mp4',
          thumbnail_url: 'https://cdn.example.com/thumb1.jpg',
          caption: 'My first video',
          vote_count: 25,
          created_at: new Date(),
          challenge_id: 'challenge-1',
          challenge_title: 'Dance Challenge',
        },
      ];

      // Call 1: verify user exists
      const userBuilder = createQueryBuilder();
      userBuilder.first.mockResolvedValue({ id: 'user-1' });

      // Call 2: count query
      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '1' }]);
      countBuilder.clone.mockReturnValue(countBuilder);

      // Call 3: data query
      const dataBuilder = createQueryBuilder();
      dataBuilder.offset.mockResolvedValue(mockSubmissions);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return userBuilder;
        // For the base query and its clones
        const baseBuilder = createQueryBuilder();
        let cloneCall = 0;
        baseBuilder.clone.mockImplementation(() => {
          cloneCall++;
          if (cloneCall === 1) return countBuilder;
          return dataBuilder;
        });
        return baseBuilder;
      });

      const result = await userService.getUserSubmissions('user-1', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('sub-1');
      expect(result.data[0].challenge).toEqual({
        id: 'challenge-1',
        title: 'Dance Challenge',
      });
      expect(result.data[0].votes_count).toBe(25);
    });

    it('throws NotFoundError when user does not exist', async () => {
      const userBuilder = createQueryBuilder();
      userBuilder.first.mockResolvedValue(undefined);
      mockDb.mockReturnValue(userBuilder);

      await expect(
        userService.getUserSubmissions('nonexistent', { page: 1, limit: 20 }),
      ).rejects.toThrow(NotFoundError);
    });

    it('returns empty results when user has no submissions', async () => {
      const userBuilder = createQueryBuilder();
      userBuilder.first.mockResolvedValue({ id: 'user-empty' });

      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '0' }]);
      countBuilder.clone.mockReturnValue(countBuilder);

      const dataBuilder = createQueryBuilder();
      dataBuilder.offset.mockResolvedValue([]);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return userBuilder;
        const baseBuilder = createQueryBuilder();
        let cloneCall = 0;
        baseBuilder.clone.mockImplementation(() => {
          cloneCall++;
          if (cloneCall === 1) return countBuilder;
          return dataBuilder;
        });
        return baseBuilder;
      });

      const result = await userService.getUserSubmissions('user-empty', { page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('returns null for challenge when submission has no challenge_id', async () => {
      const mockSubmissions = [
        {
          id: 'sub-no-challenge',
          user_id: 'user-1',
          video_url: 'https://cdn.example.com/video.mp4',
          thumbnail_url: null,
          caption: null,
          vote_count: 0,
          created_at: new Date(),
          challenge_id: null,
          challenge_title: null,
        },
      ];

      const userBuilder = createQueryBuilder();
      userBuilder.first.mockResolvedValue({ id: 'user-1' });

      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '1' }]);
      countBuilder.clone.mockReturnValue(countBuilder);

      const dataBuilder = createQueryBuilder();
      dataBuilder.offset.mockResolvedValue(mockSubmissions);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return userBuilder;
        const baseBuilder = createQueryBuilder();
        let cloneCall = 0;
        baseBuilder.clone.mockImplementation(() => {
          cloneCall++;
          if (cloneCall === 1) return countBuilder;
          return dataBuilder;
        });
        return baseBuilder;
      });

      const result = await userService.getUserSubmissions('user-1', { page: 1, limit: 20 });

      expect(result.data[0].challenge).toBeNull();
    });
  });

  // -------------------------------------------------------------------
  // deleteAccount
  // -------------------------------------------------------------------

  describe('deleteAccount()', () => {
    it('soft-deletes a user account', async () => {
      const builder = createQueryBuilder();
      builder.update.mockResolvedValue(1);
      mockDb.mockReturnValue(builder);

      await expect(
        userService.deleteAccount('user-1'),
      ).resolves.toBeUndefined();
    });

    it('throws NotFoundError when user does not exist', async () => {
      const builder = createQueryBuilder();
      builder.update.mockResolvedValue(0);
      mockDb.mockReturnValue(builder);

      await expect(
        userService.deleteAccount('nonexistent'),
      ).rejects.toThrow(NotFoundError);
    });

    it('invalidates the profile cache after deletion', async () => {
      redisStore.set('user_profile:user-1', JSON.stringify(createMockUserProfile()));

      const builder = createQueryBuilder();
      builder.update.mockResolvedValue(1);
      mockDb.mockReturnValue(builder);

      await userService.deleteAccount('user-1');

      expect(redisStore.has('user_profile:user-1')).toBe(false);
    });

    it('logs info after deletion', async () => {
      const { logger } = require('../../src/config/logger');

      const builder = createQueryBuilder();
      builder.update.mockResolvedValue(1);
      mockDb.mockReturnValue(builder);

      await userService.deleteAccount('user-del');

      expect(logger.info).toHaveBeenCalledWith(
        'Account soft-deleted',
        { userId: 'user-del' },
      );
    });
  });

  // -------------------------------------------------------------------
  // updateAvatar
  // -------------------------------------------------------------------

  describe('updateAvatar()', () => {
    it('updates avatar_url via updateProfile', async () => {
      const updatedProfile = createMockUserProfile({
        avatar_url: 'https://cdn.example.com/new-avatar.png',
      });

      const builder = createQueryBuilder();
      builder.update.mockReturnValue({
        returning: jest.fn().mockResolvedValue([updatedProfile]),
      });
      mockDb.mockReturnValue(builder);

      const result = await userService.updateAvatar(
        'user-1',
        'https://cdn.example.com/new-avatar.png',
      );

      expect(result.avatar_url).toBe('https://cdn.example.com/new-avatar.png');
    });

    it('throws NotFoundError when user does not exist', async () => {
      const builder = createQueryBuilder();
      builder.update.mockReturnValue({
        returning: jest.fn().mockResolvedValue([undefined]),
      });
      mockDb.mockReturnValue(builder);

      await expect(
        userService.updateAvatar('nonexistent', 'https://cdn.example.com/avatar.png'),
      ).rejects.toThrow(NotFoundError);
    });
  });
});

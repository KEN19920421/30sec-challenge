/**
 * Unit tests for the feed service logic.
 *
 * These tests mock the database (Knex) so that no real connections are needed.
 * They verify trending feed retrieval and paginated for-you feed with
 * category/search filtering.
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

// Build a chainable query builder mock
function createQueryBuilder() {
  const builder: Record<string, jest.Mock> = {
    where: jest.fn().mockReturnThis(),
    whereNull: jest.fn().mockReturnThis(),
    whereILike: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    first: jest.fn(),
    insert: jest.fn().mockReturnValue({ returning: jest.fn() }),
    update: jest.fn().mockReturnValue({ returning: jest.fn() }),
    count: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    orderByRaw: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn(),
    clone: jest.fn(),
  };
  // clone() returns the builder itself for chaining
  builder.clone.mockReturnValue(builder);
  return builder;
}

// Create the main db mock
const mockDb = jest.fn().mockReturnValue(createQueryBuilder());
(mockDb as any).fn = { now: jest.fn().mockReturnValue('NOW()') };
(mockDb as any).raw = jest.fn();

// Feed service uses `import db from` (default import), so we need __esModule: true
// and the default property to match the compiled TypeScript output.
jest.mock('../../src/config/database', () => ({
  __esModule: true,
  db: mockDb,
  default: mockDb,
}));

// Now import the module under test
import * as feedService from '../../src/modules/feed/feed.service';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Feed Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.mockReturnValue(createQueryBuilder());
  });

  // -------------------------------------------------------------------
  // getTrending
  // -------------------------------------------------------------------

  describe('getTrending()', () => {
    it('returns trending submissions sorted by score', async () => {
      const mockSubmissions = [
        {
          id: 'sub-1',
          user_id: 'user-1',
          caption: 'Trending video',
          wilson_score: 0.85,
          boost_score: 0.1,
          username: 'johndoe',
          display_name: 'John Doe',
          avatar_url: null,
        },
        {
          id: 'sub-2',
          user_id: 'user-2',
          caption: 'Also trending',
          wilson_score: 0.72,
          boost_score: 0.0,
          username: 'janedoe',
          display_name: 'Jane Doe',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      ];

      const builder = createQueryBuilder();
      builder.limit.mockResolvedValue(mockSubmissions);
      mockDb.mockReturnValue(builder);

      const result = await feedService.getTrending(10);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('sub-1');
      expect(result[1].id).toBe('sub-2');
      expect(mockDb).toHaveBeenCalledWith('submissions');
    });

    it('returns empty array when no trending submissions exist', async () => {
      const builder = createQueryBuilder();
      builder.limit.mockResolvedValue([]);
      mockDb.mockReturnValue(builder);

      const result = await feedService.getTrending(10);

      expect(result).toHaveLength(0);
    });

    it('uses default limit of 10 when no limit is specified', async () => {
      const builder = createQueryBuilder();
      builder.limit.mockResolvedValue([]);
      mockDb.mockReturnValue(builder);

      await feedService.getTrending();

      expect(builder.limit).toHaveBeenCalledWith(10);
    });

    it('respects a custom limit parameter', async () => {
      const builder = createQueryBuilder();
      builder.limit.mockResolvedValue([]);
      mockDb.mockReturnValue(builder);

      await feedService.getTrending(5);

      expect(builder.limit).toHaveBeenCalledWith(5);
    });

    it('filters for completed and approved submissions only', async () => {
      const builder = createQueryBuilder();
      builder.limit.mockResolvedValue([]);
      mockDb.mockReturnValue(builder);

      await feedService.getTrending(10);

      expect(builder.where).toHaveBeenCalledWith('submissions.transcode_status', 'completed');
      expect(builder.where).toHaveBeenCalledWith('submissions.moderation_status', 'approved');
      expect(builder.whereNull).toHaveBeenCalledWith('submissions.deleted_at');
    });

    it('joins users table for username/display_name/avatar_url', async () => {
      const builder = createQueryBuilder();
      builder.limit.mockResolvedValue([]);
      mockDb.mockReturnValue(builder);

      await feedService.getTrending(10);

      expect(builder.leftJoin).toHaveBeenCalledWith(
        'users',
        'submissions.user_id',
        'users.id',
      );
    });
  });

  // -------------------------------------------------------------------
  // getForYou
  // -------------------------------------------------------------------

  describe('getForYou()', () => {
    /**
     * Helper that sets up the two db('submissions') calls that getForYou makes:
     *  1. baseQuery for counting (uses .clone().count())
     *  2. dataQuery for fetching rows (uses .select().leftJoin()...offset())
     */
    function setupForYouMocks(total: string, rows: Record<string, unknown>[]) {
      // baseQuery builder (first db call) - needs clone().count()
      const baseBuilder = createQueryBuilder();
      const clonedCountBuilder = createQueryBuilder();
      clonedCountBuilder.count.mockResolvedValue([{ count: total }]);
      baseBuilder.clone.mockReturnValue(clonedCountBuilder);

      // dataQuery builder (second db call) - needs .select()...limit().offset()
      const dataBuilder = createQueryBuilder();
      // limit() must be chainable (returns this) because offset() comes after it
      dataBuilder.limit.mockReturnValue(dataBuilder);
      dataBuilder.offset.mockResolvedValue(rows);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return baseBuilder;
        return dataBuilder;
      });

      return { baseBuilder, clonedCountBuilder, dataBuilder };
    }

    it('returns paginated for-you feed results', async () => {
      const mockSubmissions = [
        {
          id: 'sub-fy-1',
          user_id: 'user-1',
          caption: 'For you video',
          wilson_score: 0.9,
          username: 'user1',
        },
      ];

      setupForYouMocks('1', mockSubmissions);

      const result = await feedService.getForYou({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total_pages).toBe(1);
    });

    it('returns empty results when no submissions match', async () => {
      setupForYouMocks('0', []);

      const result = await feedService.getForYou({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('calculates pagination correctly for multiple pages', async () => {
      setupForYouMocks('55', [{ id: 'sub-page3' }]);

      const result = await feedService.getForYou({ page: 3, limit: 20 });

      expect(result.total).toBe(55);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(20);
      expect(result.total_pages).toBe(3);
    });

    it('applies category filter when provided and not "All"', async () => {
      const { baseBuilder, dataBuilder } = setupForYouMocks('5', [{ id: 'sub-dance' }]);

      const result = await feedService.getForYou(
        { page: 1, limit: 20 },
        { category: 'Dance' },
      );

      expect(result.data).toHaveLength(1);
      // The category filter adds a leftJoin on challenges for both base and data queries
      expect(baseBuilder.leftJoin).toHaveBeenCalledWith(
        'challenges as c_filter',
        'submissions.challenge_id',
        'c_filter.id',
      );
      expect(baseBuilder.where).toHaveBeenCalledWith('c_filter.category', 'Dance');
      expect(dataBuilder.leftJoin).toHaveBeenCalledWith(
        'challenges as c_feed',
        'submissions.challenge_id',
        'c_feed.id',
      );
    });

    it('does not apply category filter when category is "All"', async () => {
      const { baseBuilder } = setupForYouMocks('10', []);

      await feedService.getForYou(
        { page: 1, limit: 20 },
        { category: 'All' },
      );

      // Should NOT have joined challenges as c_filter
      expect(baseBuilder.leftJoin).not.toHaveBeenCalledWith(
        'challenges as c_filter',
        expect.any(String),
        expect.any(String),
      );
    });

    it('applies search filter when provided', async () => {
      const { baseBuilder } = setupForYouMocks('3', [{ id: 'sub-search-1' }]);

      const result = await feedService.getForYou(
        { page: 1, limit: 20 },
        { search: 'dance challenge' },
      );

      expect(result.data).toHaveLength(1);
      // The where function is called for the search sub-query
      expect(baseBuilder.where).toHaveBeenCalled();
    });

    it('applies both category and search filters together', async () => {
      const { baseBuilder } = setupForYouMocks('2', [{ id: 'sub-combo' }]);

      const result = await feedService.getForYou(
        { page: 1, limit: 20 },
        { category: 'Music', search: 'guitar' },
      );

      expect(result.data).toHaveLength(1);
      expect(baseBuilder.leftJoin).toHaveBeenCalledWith(
        'challenges as c_filter',
        'submissions.challenge_id',
        'c_filter.id',
      );
    });

    it('defaults sort order to desc', async () => {
      const { dataBuilder } = setupForYouMocks('1', [{ id: 'sub-1' }]);

      await feedService.getForYou({ page: 1, limit: 20 });

      // orderByRaw should have been called with DESC
      expect(dataBuilder.orderByRaw).toHaveBeenCalledWith(
        expect.stringContaining('DESC'),
      );
    });

    it('uses asc sort order when specified', async () => {
      const { dataBuilder } = setupForYouMocks('1', [{ id: 'sub-1' }]);

      await feedService.getForYou({ page: 1, limit: 20, sort_order: 'asc' });

      expect(dataBuilder.orderByRaw).toHaveBeenCalledWith(
        expect.stringContaining('ASC'),
      );
    });
  });
});

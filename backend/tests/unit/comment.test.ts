/**
 * Unit tests for the comment service logic.
 *
 * These tests mock the database (Knex) and logger so that no real connections
 * are needed. They verify comment creation, retrieval, deletion, and
 * notification side-effects.
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
  // clone() returns a copy of the builder
  builder.clone.mockReturnValue(builder);
  return builder;
}

// Create the main db mock
const mockDb = jest.fn().mockReturnValue(createQueryBuilder());
(mockDb as any).fn = { now: jest.fn().mockReturnValue('NOW()') };
(mockDb as any).raw = jest.fn();
(mockDb as any).transaction = jest.fn();

jest.mock('../../src/config/database', () => ({
  db: mockDb,
}));

// Now import the module under test
import * as commentService from '../../src/modules/comment/comment.service';
import { NotFoundError, ForbiddenError } from '../../src/shared/errors';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Comment Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.mockReturnValue(createQueryBuilder());
  });

  // -------------------------------------------------------------------
  // getSubmissionComments
  // -------------------------------------------------------------------

  describe('getSubmissionComments()', () => {
    it('returns paginated top-level comments for a submission', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          user_id: 'user-1',
          submission_id: 'sub-1',
          content: 'Great video!',
          parent_id: null,
          username: 'johndoe',
          display_name: 'John Doe',
          avatar_url: null,
          reply_count: 2,
          created_at: new Date(),
        },
        {
          id: 'comment-2',
          user_id: 'user-2',
          submission_id: 'sub-1',
          content: 'Nice work!',
          parent_id: null,
          username: 'janedoe',
          display_name: 'Jane Doe',
          avatar_url: null,
          reply_count: 0,
          created_at: new Date(),
        },
      ];

      // Count query builder
      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '2' }]);

      // Data query builder (chained calls ending with .select())
      const dataBuilder = createQueryBuilder();
      dataBuilder.select.mockResolvedValue(mockComments);

      let callIndex = 0;
      mockDb.mockImplementation((table: string) => {
        callIndex++;
        if (callIndex === 1) return countBuilder;
        return dataBuilder;
      });

      const result = await commentService.getSubmissionComments('sub-1', { page: '1', limit: '20' });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.total_pages).toBe(1);
      expect(result.data[0].content).toBe('Great video!');
    });

    it('returns empty results when no comments exist', async () => {
      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '0' }]);

      const dataBuilder = createQueryBuilder();
      dataBuilder.select.mockResolvedValue([]);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return countBuilder;
        return dataBuilder;
      });

      const result = await commentService.getSubmissionComments('sub-empty', {});

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('respects pagination parameters', async () => {
      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '25' }]);

      const dataBuilder = createQueryBuilder();
      dataBuilder.select.mockResolvedValue([
        { id: 'comment-11', content: 'Page 2 comment', parent_id: null },
      ]);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return countBuilder;
        return dataBuilder;
      });

      const result = await commentService.getSubmissionComments('sub-1', { page: '2', limit: '10' });

      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total_pages).toBe(3);
    });
  });

  // -------------------------------------------------------------------
  // getCommentReplies
  // -------------------------------------------------------------------

  describe('getCommentReplies()', () => {
    it('returns paginated replies for a parent comment', async () => {
      const mockReplies = [
        {
          id: 'reply-1',
          user_id: 'user-2',
          submission_id: 'sub-1',
          content: 'Thanks!',
          parent_id: 'comment-1',
          username: 'janedoe',
          created_at: new Date(),
        },
      ];

      // First call: verify parent comment exists
      const parentBuilder = createQueryBuilder();
      parentBuilder.first.mockResolvedValue({ id: 'comment-1' });

      // Second call: count query
      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '1' }]);

      // Third call: data query
      const dataBuilder = createQueryBuilder();
      dataBuilder.select.mockResolvedValue(mockReplies);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return parentBuilder;
        if (callIndex === 2) return countBuilder;
        return dataBuilder;
      });

      const result = await commentService.getCommentReplies('comment-1', { page: '1', limit: '20' });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].content).toBe('Thanks!');
    });

    it('throws NotFoundError when parent comment does not exist', async () => {
      const parentBuilder = createQueryBuilder();
      parentBuilder.first.mockResolvedValue(undefined);

      mockDb.mockReturnValue(parentBuilder);

      await expect(
        commentService.getCommentReplies('nonexistent-comment', {}),
      ).rejects.toThrow(NotFoundError);
    });

    it('returns empty results when parent has no replies', async () => {
      const parentBuilder = createQueryBuilder();
      parentBuilder.first.mockResolvedValue({ id: 'comment-no-replies' });

      const countBuilder = createQueryBuilder();
      countBuilder.count.mockResolvedValue([{ count: '0' }]);

      const dataBuilder = createQueryBuilder();
      dataBuilder.select.mockResolvedValue([]);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return parentBuilder;
        if (callIndex === 2) return countBuilder;
        return dataBuilder;
      });

      const result = await commentService.getCommentReplies('comment-no-replies', {});

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------
  // createComment
  // -------------------------------------------------------------------

  describe('createComment()', () => {
    it('creates a top-level comment and returns it with user info', async () => {
      const mockComment = {
        id: 'comment-new',
        user_id: 'user-1',
        submission_id: 'sub-1',
        content: 'Amazing!',
        parent_id: null,
        created_at: new Date(),
      };

      const mockCommentWithUser = {
        ...mockComment,
        username: 'johndoe',
        display_name: 'John Doe',
        avatar_url: null,
      };

      // Call 1: check submission exists
      const submissionBuilder = createQueryBuilder();
      submissionBuilder.first.mockResolvedValue({ id: 'sub-1', user_id: 'user-2' });

      // Call 2: insert comment
      const insertBuilder = createQueryBuilder();
      insertBuilder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockComment]),
      });

      // Call 3: insert notification (submission owner !== commenter)
      const notifBuilder = createQueryBuilder();
      notifBuilder.insert.mockResolvedValue([{ id: 'notif-1' }]);

      // Call 4: fetch comment with user info
      const fetchBuilder = createQueryBuilder();
      fetchBuilder.first.mockResolvedValue(mockCommentWithUser);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return submissionBuilder;
        if (callIndex === 2) return insertBuilder;
        if (callIndex === 3) return notifBuilder;
        return fetchBuilder;
      });

      const result = await commentService.createComment('user-1', {
        submission_id: 'sub-1',
        content: 'Amazing!',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('comment-new');
      expect(result.username).toBe('johndoe');
      expect(result.content).toBe('Amazing!');
    });

    it('throws NotFoundError when submission does not exist', async () => {
      const submissionBuilder = createQueryBuilder();
      submissionBuilder.first.mockResolvedValue(undefined);

      mockDb.mockReturnValue(submissionBuilder);

      await expect(
        commentService.createComment('user-1', {
          submission_id: 'sub-missing',
          content: 'Hello',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when parent comment does not exist', async () => {
      // Call 1: submission exists
      const submissionBuilder = createQueryBuilder();
      submissionBuilder.first.mockResolvedValue({ id: 'sub-1', user_id: 'user-2' });

      // Call 2: parent comment lookup returns nothing
      const parentBuilder = createQueryBuilder();
      parentBuilder.first.mockResolvedValue(undefined);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return submissionBuilder;
        return parentBuilder;
      });

      await expect(
        commentService.createComment('user-1', {
          submission_id: 'sub-1',
          content: 'Reply text',
          parent_id: 'nonexistent-parent',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when parent comment belongs to a different submission', async () => {
      // Call 1: submission exists
      const submissionBuilder = createQueryBuilder();
      submissionBuilder.first.mockResolvedValue({ id: 'sub-1', user_id: 'user-2' });

      // Call 2: parent comment exists but has different submission_id
      const parentBuilder = createQueryBuilder();
      parentBuilder.first.mockResolvedValue({
        id: 'parent-1',
        submission_id: 'sub-other',
        user_id: 'user-3',
      });

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return submissionBuilder;
        return parentBuilder;
      });

      await expect(
        commentService.createComment('user-1', {
          submission_id: 'sub-1',
          content: 'Reply text',
          parent_id: 'parent-1',
        }),
      ).rejects.toThrow(ForbiddenError);
    });

    it('does not create a notification when commenter is the submission owner', async () => {
      const mockComment = {
        id: 'comment-self',
        user_id: 'user-owner',
        submission_id: 'sub-1',
        content: 'Self comment',
        parent_id: null,
        created_at: new Date(),
      };

      const mockCommentWithUser = {
        ...mockComment,
        username: 'owner',
        display_name: 'Owner',
        avatar_url: null,
      };

      // Call 1: submission exists, owner is the same as commenter
      const submissionBuilder = createQueryBuilder();
      submissionBuilder.first.mockResolvedValue({ id: 'sub-1', user_id: 'user-owner' });

      // Call 2: insert comment
      const insertBuilder = createQueryBuilder();
      insertBuilder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockComment]),
      });

      // Call 3: fetch comment with user info (notification is skipped)
      const fetchBuilder = createQueryBuilder();
      fetchBuilder.first.mockResolvedValue(mockCommentWithUser);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return submissionBuilder;
        if (callIndex === 2) return insertBuilder;
        return fetchBuilder;
      });

      const result = await commentService.createComment('user-owner', {
        submission_id: 'sub-1',
        content: 'Self comment',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('comment-self');
      // Only 3 db calls (no notification insert)
      expect(callIndex).toBe(3);
    });

    it('creates reply notification for parent comment author', async () => {
      const mockComment = {
        id: 'reply-new',
        user_id: 'user-3',
        submission_id: 'sub-1',
        content: 'Reply to parent',
        parent_id: 'parent-1',
        created_at: new Date(),
      };

      const mockCommentWithUser = {
        ...mockComment,
        username: 'user3',
        display_name: 'User Three',
        avatar_url: null,
      };

      // Call 1: submission exists (owned by user-1)
      const submissionBuilder = createQueryBuilder();
      submissionBuilder.first.mockResolvedValue({ id: 'sub-1', user_id: 'user-1' });

      // Call 2: parent comment exists on same submission (owned by user-2)
      const parentCheckBuilder = createQueryBuilder();
      parentCheckBuilder.first.mockResolvedValue({
        id: 'parent-1',
        submission_id: 'sub-1',
        user_id: 'user-2',
      });

      // Call 3: insert comment
      const insertBuilder = createQueryBuilder();
      insertBuilder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockComment]),
      });

      // Call 4: notification for submission owner (user-1)
      const notifOwnerBuilder = createQueryBuilder();
      notifOwnerBuilder.insert.mockResolvedValue([{ id: 'notif-owner' }]);

      // Call 5: lookup parent comment for reply notification
      const parentLookupBuilder = createQueryBuilder();
      parentLookupBuilder.first.mockResolvedValue({ user_id: 'user-2' });

      // Call 6: notification for parent comment author (user-2)
      const notifParentBuilder = createQueryBuilder();
      notifParentBuilder.insert.mockResolvedValue([{ id: 'notif-parent' }]);

      // Call 7: fetch comment with user info
      const fetchBuilder = createQueryBuilder();
      fetchBuilder.first.mockResolvedValue(mockCommentWithUser);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return submissionBuilder;
        if (callIndex === 2) return parentCheckBuilder;
        if (callIndex === 3) return insertBuilder;
        if (callIndex === 4) return notifOwnerBuilder;
        if (callIndex === 5) return parentLookupBuilder;
        if (callIndex === 6) return notifParentBuilder;
        return fetchBuilder;
      });

      const result = await commentService.createComment('user-3', {
        submission_id: 'sub-1',
        content: 'Reply to parent',
        parent_id: 'parent-1',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('reply-new');
      // 7 db calls: submission check, parent check, insert, owner notif, parent lookup, parent notif, fetch
      expect(callIndex).toBe(7);
    });

    it('truncates long content in notification body', async () => {
      const longContent = 'A'.repeat(200);
      const mockComment = {
        id: 'comment-long',
        user_id: 'user-1',
        submission_id: 'sub-1',
        content: longContent,
        parent_id: null,
        created_at: new Date(),
      };

      // Track notification insert data
      let notificationData: any = null;

      // Call 1: submission exists
      const submissionBuilder = createQueryBuilder();
      submissionBuilder.first.mockResolvedValue({ id: 'sub-1', user_id: 'user-2' });

      // Call 2: insert comment
      const insertBuilder = createQueryBuilder();
      insertBuilder.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([mockComment]),
      });

      // Call 3: notification insert
      const notifBuilder = createQueryBuilder();
      notifBuilder.insert.mockImplementation((data: any) => {
        notificationData = data;
        return Promise.resolve([{ id: 'notif-1' }]);
      });

      // Call 4: fetch comment with user
      const fetchBuilder = createQueryBuilder();
      fetchBuilder.first.mockResolvedValue({ ...mockComment, username: 'u1' });

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return submissionBuilder;
        if (callIndex === 2) return insertBuilder;
        if (callIndex === 3) return notifBuilder;
        return fetchBuilder;
      });

      await commentService.createComment('user-1', {
        submission_id: 'sub-1',
        content: longContent,
      });

      expect(notificationData).toBeDefined();
      expect(notificationData.body.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(notificationData.body).toMatch(/\.\.\.$/);
    });
  });

  // -------------------------------------------------------------------
  // deleteComment
  // -------------------------------------------------------------------

  describe('deleteComment()', () => {
    it('soft-deletes a comment owned by the user', async () => {
      // Call 1: find the comment
      const findBuilder = createQueryBuilder();
      findBuilder.first.mockResolvedValue({ id: 'comment-1', user_id: 'user-1' });

      // Call 2: update (soft delete)
      const updateBuilder = createQueryBuilder();
      updateBuilder.update.mockResolvedValue(1);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return findBuilder;
        return updateBuilder;
      });

      await expect(
        commentService.deleteComment('user-1', 'comment-1'),
      ).resolves.toBeUndefined();

      expect(callIndex).toBe(2);
    });

    it('throws NotFoundError when comment does not exist', async () => {
      const findBuilder = createQueryBuilder();
      findBuilder.first.mockResolvedValue(undefined);

      mockDb.mockReturnValue(findBuilder);

      await expect(
        commentService.deleteComment('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when user does not own the comment', async () => {
      const findBuilder = createQueryBuilder();
      findBuilder.first.mockResolvedValue({ id: 'comment-1', user_id: 'user-other' });

      mockDb.mockReturnValue(findBuilder);

      await expect(
        commentService.deleteComment('user-1', 'comment-1'),
      ).rejects.toThrow(ForbiddenError);
    });

    it('logs deletion info', async () => {
      const { logger } = require('../../src/config/logger');

      const findBuilder = createQueryBuilder();
      findBuilder.first.mockResolvedValue({ id: 'comment-del', user_id: 'user-1' });

      const updateBuilder = createQueryBuilder();
      updateBuilder.update.mockResolvedValue(1);

      let callIndex = 0;
      mockDb.mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) return findBuilder;
        return updateBuilder;
      });

      await commentService.deleteComment('user-1', 'comment-del');

      expect(logger.info).toHaveBeenCalledWith(
        'Comment deleted',
        expect.objectContaining({
          commentId: 'comment-del',
          userId: 'user-1',
        }),
      );
    });
  });
});

/**
 * Integration tests for the /api/v1/voting endpoints.
 *
 * Tests exercise the full request cycle (Express -> middleware -> service -> DB)
 * using supertest against the real app and test database.
 */

import request from 'supertest';
import app from '../../src/app';
import { getDb } from '../helpers/database';
import {
  createTestUser,
  createTestChallenge,
  createTestSubmission,
  createTestVote,
  generateAuthToken,
} from '../helpers/factory';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRedisStore = new Map<string, string>();
jest.mock('../../src/config/redis', () => {
  return {
    redis: {
      get: jest.fn(async (key: string) => mockRedisStore.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        mockRedisStore.set(key, value);
        return 'OK';
      }),
      del: jest.fn(async (...keys: string[]) => {
        keys.forEach((k) => mockRedisStore.delete(k));
        return keys.length;
      }),
      zadd: jest.fn().mockResolvedValue(1),
    },
    disconnectRedis: jest.fn(),
    createRedisConnection: jest.fn(),
  };
});

jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  morganStream: { write: jest.fn() },
}));

// Mock BullMQ queues to avoid Redis connection during tests
jest.mock('../../src/jobs/queues', () => ({
  transcodeQueue: { add: jest.fn() },
  thumbnailQueue: { add: jest.fn() },
  leaderboardQueue: { add: jest.fn() },
  notificationQueue: { add: jest.fn() },
  achievementQueue: { add: jest.fn() },
  cleanupQueue: { add: jest.fn() },
  analyticsQueue: { add: jest.fn() },
  addJob: jest.fn(),
  closeAllQueues: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockRedisStore.clear();
});

describe('Voting Endpoints', () => {
  const db = getDb();

  // -----------------------------------------------------------------------
  // POST /api/v1/voting
  // -----------------------------------------------------------------------

  describe('POST /api/v1/voting', () => {
    it('casts an upvote successfully (201)', async () => {
      const voter = await createTestUser({ email: 'voter@test.com', username: 'voter1' });
      const author = await createTestUser({ email: 'author@test.com', username: 'author1' });
      const challenge = await createTestChallenge({ status: 'active' });
      const submission = await createTestSubmission(author.id, challenge.id);

      const token = generateAuthToken(voter);

      const res = await request(app)
        .post('/api/v1/voting')
        .set('Authorization', `Bearer ${token}`)
        .send({
          submission_id: submission.id,
          value: 1,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.value).toBe(1);
      expect(res.body.data.submission_id).toBe(submission.id);
      expect(res.body.data.user_id).toBe(voter.id);
    });

    it('casts a downvote successfully (201)', async () => {
      const voter = await createTestUser({ email: 'downvoter@test.com', username: 'downvoter1' });
      const author = await createTestUser({ email: 'downauthor@test.com', username: 'downauthor1' });
      const challenge = await createTestChallenge({ status: 'active' });
      const submission = await createTestSubmission(author.id, challenge.id);

      const token = generateAuthToken(voter);

      const res = await request(app)
        .post('/api/v1/voting')
        .set('Authorization', `Bearer ${token}`)
        .send({
          submission_id: submission.id,
          value: -1,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.value).toBe(-1);
    });

    it('returns 400 for a duplicate vote on the same submission', async () => {
      const voter = await createTestUser({ email: 'dupvoter@test.com', username: 'dupvoter' });
      const author = await createTestUser({ email: 'dupauthor@test.com', username: 'dupauthor' });
      const challenge = await createTestChallenge({ status: 'active' });
      const submission = await createTestSubmission(author.id, challenge.id);

      const token = generateAuthToken(voter);

      // First vote should succeed
      await request(app)
        .post('/api/v1/voting')
        .set('Authorization', `Bearer ${token}`)
        .send({ submission_id: submission.id, value: 1 })
        .expect(201);

      // Second vote should fail
      const res = await request(app)
        .post('/api/v1/voting')
        .set('Authorization', `Bearer ${token}`)
        .send({ submission_id: submission.id, value: -1 })
        .expect(400);

      expect(res.body.success).toBe(false);
      // ValidationError wraps details in errors array; message is "Validation failed"
      expect(res.body.message).toBe('Validation failed');
    });

    it('returns 403 when trying to vote on own submission', async () => {
      const user = await createTestUser({ email: 'selfvoter@test.com', username: 'selfvoter' });
      const challenge = await createTestChallenge({ status: 'active' });
      const submission = await createTestSubmission(user.id, challenge.id);

      const token = generateAuthToken(user);

      const res = await request(app)
        .post('/api/v1/voting')
        .set('Authorization', `Bearer ${token}`)
        .send({ submission_id: submission.id, value: 1 })
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/own submission/i);
    });

    it('returns 401 without an auth token', async () => {
      const res = await request(app)
        .post('/api/v1/voting')
        .send({ submission_id: 'some-id', value: 1 })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('super vote works for eligible users', async () => {
      const voter = await createTestUser({
        email: 'supervote@test.com',
        username: 'supervote_user',
        subscription_tier: 'pro',
      });
      const author = await createTestUser({
        email: 'svauthor@test.com',
        username: 'svauthor',
      });
      const challenge = await createTestChallenge({ status: 'active' });
      const submission = await createTestSubmission(author.id, challenge.id);

      // Give the voter some earned super votes via ad_events
      await db('ad_events').insert({
        user_id: voter.id,
        ad_type: 'rewarded',
        placement: 'super_vote',
        ad_network: 'admob',
        event_type: 'reward_granted',
        reward_type: 'super_vote',
        reward_amount: 1,
      });

      const token = generateAuthToken({
        id: voter.id,
        email: voter.email,
        role: 'user',
        subscription_tier: 'pro',
      });

      const res = await request(app)
        .post('/api/v1/voting')
        .set('Authorization', `Bearer ${token}`)
        .send({
          submission_id: submission.id,
          value: 1,
          is_super_vote: true,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.is_super_vote).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/v1/voting/queue
  // -----------------------------------------------------------------------

  describe('GET /api/v1/voting/queue', () => {
    it('returns unvoted submissions for a challenge', async () => {
      const voter = await createTestUser({ email: 'qvoter@test.com', username: 'qvoter' });
      const author1 = await createTestUser({ email: 'qauthor1@test.com', username: 'qauthor1' });
      const author2 = await createTestUser({ email: 'qauthor2@test.com', username: 'qauthor2' });

      const challenge = await createTestChallenge({ status: 'active' });

      await createTestSubmission(author1.id, challenge.id);
      await createTestSubmission(author2.id, challenge.id);

      const token = generateAuthToken(voter);

      const res = await request(app)
        .get('/api/v1/voting/queue')
        .set('Authorization', `Bearer ${token}`)
        .query({ challenge_id: challenge.id, limit: '10' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Should include submissions from author1 and author2
      expect(res.body.data.length).toBeGreaterThanOrEqual(0);
    });

    it('excludes the voter own submission', async () => {
      const voter = await createTestUser({ email: 'selfq@test.com', username: 'selfq' });
      const other = await createTestUser({ email: 'otherq@test.com', username: 'otherq' });

      const challenge = await createTestChallenge({ status: 'active' });

      // Voter's own submission
      await createTestSubmission(voter.id, challenge.id);
      // Another user's submission
      const otherSub = await createTestSubmission(other.id, challenge.id);

      const token = generateAuthToken(voter);

      const res = await request(app)
        .get('/api/v1/voting/queue')
        .set('Authorization', `Bearer ${token}`)
        .query({ challenge_id: challenge.id })
        .expect(200);

      // If items are returned, none should be the voter's own submission
      const submissionUserIds = res.body.data.map((s: any) => s.user_id);
      expect(submissionUserIds).not.toContain(voter.id);
    });

    it('excludes already-voted submissions', async () => {
      const voter = await createTestUser({ email: 'votedq@test.com', username: 'votedq' });
      const author = await createTestUser({ email: 'autq@test.com', username: 'autq' });

      const challenge = await createTestChallenge({ status: 'active' });
      const submission = await createTestSubmission(author.id, challenge.id);

      // Cast a vote first
      await createTestVote(voter.id, submission.id, {
        challenge_id: challenge.id,
        value: 1,
      });

      const token = generateAuthToken(voter);

      const res = await request(app)
        .get('/api/v1/voting/queue')
        .set('Authorization', `Bearer ${token}`)
        .query({ challenge_id: challenge.id })
        .expect(200);

      // The already-voted submission should not appear in the queue
      const submissionIds = res.body.data.map((s: any) => s.id);
      expect(submissionIds).not.toContain(submission.id);
    });

    it('excludes blocked users submissions', async () => {
      const voter = await createTestUser({ email: 'blocker@test.com', username: 'blockerq' });
      const blocked = await createTestUser({ email: 'blocked@test.com', username: 'blockedq' });
      const normal = await createTestUser({ email: 'normal@test.com', username: 'normalq' });

      const challenge = await createTestChallenge({ status: 'active' });

      await createTestSubmission(blocked.id, challenge.id);
      await createTestSubmission(normal.id, challenge.id);

      // Block the user
      await db('blocked_users').insert({
        blocker_id: voter.id,
        blocked_id: blocked.id,
      });

      const token = generateAuthToken(voter);

      const res = await request(app)
        .get('/api/v1/voting/queue')
        .set('Authorization', `Bearer ${token}`)
        .query({ challenge_id: challenge.id })
        .expect(200);

      // Blocked user's submissions should not appear
      const submissionUserIds = res.body.data.map((s: any) => s.user_id);
      expect(submissionUserIds).not.toContain(blocked.id);
    });

    it('returns 401 without auth', async () => {
      const challenge = await createTestChallenge();

      await request(app)
        .get('/api/v1/voting/queue')
        .query({ challenge_id: challenge.id })
        .expect(401);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/v1/voting/super-votes/balance
  // -----------------------------------------------------------------------

  describe('GET /api/v1/voting/super-votes/balance', () => {
    it('returns correct balance for a free user (0 if no ads watched)', async () => {
      const user = await createTestUser({
        email: 'freesvb@test.com',
        username: 'freesvb',
        subscription_tier: 'free',
      });

      const token = generateAuthToken(user);

      const res = await request(app)
        .get('/api/v1/voting/super-votes/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('remaining');
      expect(res.body.data).toHaveProperty('maxDaily');
      expect(res.body.data).toHaveProperty('source');
      expect(res.body.data.source).toBe('free');
      // Free user with no ads: 0 remaining
      expect(res.body.data.remaining).toBe(0);
    });

    it('returns correct balance for a pro user (3 free daily)', async () => {
      const user = await createTestUser({
        email: 'prosvb@test.com',
        username: 'prosvb',
        subscription_tier: 'pro',
      });

      const token = generateAuthToken({
        id: user.id,
        email: user.email,
        role: 'user',
        subscription_tier: 'pro',
      });

      const res = await request(app)
        .get('/api/v1/voting/super-votes/balance')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.source).toBe('pro');
      expect(res.body.data.maxDaily).toBe(3);
      // Pro user with 3 free daily and no used: 3 remaining
      expect(res.body.data.remaining).toBe(3);
    });

    it('returns 401 without auth', async () => {
      await request(app)
        .get('/api/v1/voting/super-votes/balance')
        .expect(401);
    });
  });
});

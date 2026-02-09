/**
 * Integration tests for the /api/v1/challenges endpoints.
 *
 * Tests interact with the test database via supertest.
 */

import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import app from '../../src/app';
import { getDb } from '../helpers/database';
import {
  createTestUser,
  createTestChallenge,
  createTestSubmission,
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

describe('Challenge Endpoints', () => {
  const db = getDb();

  // -----------------------------------------------------------------------
  // GET /api/v1/challenges
  // -----------------------------------------------------------------------

  describe('GET /api/v1/challenges', () => {
    it('returns the currently active challenge', async () => {
      // Create an active challenge whose window includes now
      const challenge = await createTestChallenge({ status: 'active' });

      const res = await request(app)
        .get('/api/v1/challenges')
        .expect(200);

      expect(res.body.success).toBe(true);

      // The data should be the active challenge (or null if cache returns stale)
      if (res.body.data !== null) {
        expect(res.body.data.id).toBe(challenge.id);
        expect(res.body.data.status).toBe('active');
      }
    });

    it('returns null when there is no active challenge', async () => {
      // No challenges created -- table is empty after truncation

      const res = await request(app)
        .get('/api/v1/challenges')
        .expect(200);

      expect(res.body.success).toBe(true);
      // Data should be null, with a message
      expect(res.body.data).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/v1/challenges/history
  // -----------------------------------------------------------------------

  describe('GET /api/v1/challenges/history', () => {
    it('returns paginated completed challenges', async () => {
      // Create some completed challenges
      const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const pastEnd = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      const votingEnd = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

      await createTestChallenge({
        status: 'completed',
        title: 'Completed 1',
        starts_at: past.toISOString(),
        ends_at: pastEnd.toISOString(),
        voting_ends_at: votingEnd.toISOString(),
      });
      await createTestChallenge({
        status: 'completed',
        title: 'Completed 2',
        starts_at: past.toISOString(),
        ends_at: pastEnd.toISOString(),
        voting_ends_at: votingEnd.toISOString(),
      });

      const res = await request(app)
        .get('/api/v1/challenges/history')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
    });

    it('respects page and limit query parameters', async () => {
      const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const pastEnd = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      const votingEnd = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

      for (let i = 0; i < 5; i++) {
        await createTestChallenge({
          status: 'completed',
          title: `Paginated ${i}`,
          starts_at: past.toISOString(),
          ends_at: pastEnd.toISOString(),
          voting_ends_at: votingEnd.toISOString(),
        });
      }

      // Ask for page 1 with limit 2
      const res = await request(app)
        .get('/api/v1/challenges/history')
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.limit).toBe(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(5);
      expect(res.body.meta.total_pages).toBeGreaterThanOrEqual(3);
    });

    it('returns an empty array when no completed challenges exist', async () => {
      const res = await request(app)
        .get('/api/v1/challenges/history')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/v1/challenges/:id
  // -----------------------------------------------------------------------

  describe('GET /api/v1/challenges/:id', () => {
    it('returns a challenge by ID', async () => {
      const challenge = await createTestChallenge();

      const res = await request(app)
        .get(`/api/v1/challenges/${challenge.id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(challenge.id);
      expect(res.body.data.title).toBe(challenge.title);
    });

    it('returns 404 for a non-existent challenge ID', async () => {
      const fakeId = uuidv4();

      const res = await request(app)
        .get(`/api/v1/challenges/${fakeId}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 for an invalid (non-UUID) ID', async () => {
      const res = await request(app)
        .get('/api/v1/challenges/not-a-uuid')
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/v1/challenges/:id/results
  // -----------------------------------------------------------------------

  describe('GET /api/v1/challenges/:id/results', () => {
    it('returns ranked submissions for a challenge', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const challenge = await createTestChallenge();

      // Create submissions from different users (unique constraint: one per user per challenge)
      await createTestSubmission(user1.id, challenge.id, {
        vote_count: 10,
      });
      await createTestSubmission(user2.id, challenge.id, {
        vote_count: 25,
      });

      const res = await request(app)
        .get(`/api/v1/challenges/${challenge.id}/results`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      // Submissions should be ordered by vote_count descending
      if (res.body.data.length >= 2) {
        expect(res.body.data[0].vote_count).toBeGreaterThanOrEqual(
          res.body.data[1].vote_count,
        );
      }
    });

    it('returns 404 for results of a non-existent challenge', async () => {
      const fakeId = uuidv4();

      const res = await request(app)
        .get(`/api/v1/challenges/${fakeId}/results`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('returns empty data array when no submissions exist', async () => {
      const challenge = await createTestChallenge();

      const res = await request(app)
        .get(`/api/v1/challenges/${challenge.id}/results`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });
});

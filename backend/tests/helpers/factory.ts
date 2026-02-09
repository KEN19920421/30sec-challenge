/**
 * Factory functions for creating test data.
 *
 * Every factory inserts a row into the real test database and returns the
 * full row (including generated columns like `id` and timestamps).
 *
 * Optional `overrides` parameters let individual tests customise any column.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestUser {
  id: string;
  email: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: string;
  subscription_tier: string;
  coin_balance: number;
  total_coins_earned: number;
  total_coins_spent: number;
  created_at: Date;
  updated_at: Date;
}

export interface TestChallenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  status: string;
  starts_at: Date;
  ends_at: Date;
  voting_ends_at: Date;
  created_at: Date;
  updated_at: Date;
  [key: string]: unknown;
}

export interface TestSubmission {
  id: string;
  user_id: string;
  challenge_id: string;
  video_key: string;
  video_url: string;
  transcode_status: string;
  moderation_status: string;
  vote_count: number;
  super_vote_count: number;
  wilson_score: number;
  created_at: Date;
  updated_at: Date;
  [key: string]: unknown;
}

export interface TestVote {
  id: string;
  user_id: string;
  submission_id: string;
  challenge_id: string;
  value: number;
  is_super_vote: boolean;
  source: string;
  created_at: Date;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_PASSWORD = 'TestPass1';
const DEFAULT_PASSWORD_HASH_PROMISE = bcrypt.hash(DEFAULT_PASSWORD, 4); // low rounds for speed

let userCounter = 0;

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/**
 * Creates a user in the `users` table.
 *
 * A unique email and username are generated automatically unless overridden.
 * The password defaults to 'TestPass1' hashed with bcrypt (4 rounds for speed).
 */
export async function createTestUser(
  overrides: Partial<Record<string, unknown>> = {},
): Promise<TestUser> {
  const db = getDb();
  userCounter += 1;
  const suffix = `${Date.now()}_${userCounter}`;

  const passwordHash = overrides.password_hash ?? await DEFAULT_PASSWORD_HASH_PROMISE;

  const [user] = await db('users')
    .insert({
      email: `testuser_${suffix}@test.com`,
      username: `testuser_${suffix}`,
      display_name: `Test User ${suffix}`,
      password_hash: passwordHash,
      role: 'user',
      subscription_tier: 'free',
      coin_balance: 0,
      total_coins_earned: 0,
      total_coins_spent: 0,
      ...overrides,
    })
    .returning('*');

  return user as TestUser;
}

/**
 * Creates a challenge in the `challenges` table.
 *
 * Defaults to an active challenge with sensible start/end times.
 */
export async function createTestChallenge(
  overrides: Partial<Record<string, unknown>> = {},
): Promise<TestChallenge> {
  const db = getDb();
  const now = new Date();
  const startsAt = new Date(now.getTime() - 60 * 60 * 1000); // 1h ago
  const endsAt = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23h from now
  const votingEndsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000); // 24h after end

  const [challenge] = await db('challenges')
    .insert({
      title: `Test Challenge ${Date.now()}`,
      description: 'A test challenge for automated tests.',
      category: 'general',
      difficulty: 'easy',
      status: 'active',
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      voting_ends_at: votingEndsAt.toISOString(),
      ...overrides,
    })
    .returning('*');

  return challenge as TestChallenge;
}

/**
 * Creates a submission in the `submissions` table.
 *
 * Requires `userId` and `challengeId`; all other columns can be overridden.
 */
export async function createTestSubmission(
  userId: string,
  challengeId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<TestSubmission> {
  const db = getDb();

  const videoId = uuidv4();
  const [submission] = await db('submissions')
    .insert({
      user_id: userId,
      challenge_id: challengeId,
      video_key: `uploads/${userId}/${videoId}.mp4`,
      video_url: `https://cdn.test.com/videos/${videoId}.mp4`,
      thumbnail_url: `https://cdn.test.com/thumbs/${videoId}.jpg`,
      caption: 'Test submission caption',
      transcode_status: 'completed',
      moderation_status: 'approved',
      vote_count: 0,
      super_vote_count: 0,
      wilson_score: 0,
      video_duration: 25,
      ...overrides,
    })
    .returning('*');

  return submission as TestSubmission;
}

/**
 * Creates a vote in the `votes` table.
 *
 * Requires `userId`, `submissionId`; challenge_id is looked up if not
 * provided via overrides.
 */
export async function createTestVote(
  userId: string,
  submissionId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<TestVote> {
  const db = getDb();

  // Look up the challenge_id from the submission if not provided
  let challengeId = overrides.challenge_id as string | undefined;
  if (!challengeId) {
    const submission = await db('submissions')
      .where('id', submissionId)
      .first('challenge_id');
    challengeId = submission?.challenge_id;
  }

  const [vote] = await db('votes')
    .insert({
      user_id: userId,
      submission_id: submissionId,
      challenge_id: challengeId,
      value: 1,
      is_super_vote: false,
      source: 'organic',
      ...overrides,
    })
    .returning('*');

  return vote as TestVote;
}

/**
 * Generates a valid JWT access token for the given user.
 *
 * Uses the same secret that the test environment configures in setup.ts,
 * so the auth middleware will accept it.
 */
export function generateAuthToken(user: {
  id: string;
  email: string;
  role?: string;
  subscription_tier?: string;
}): string {
  const secret = process.env.JWT_SECRET!;

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role ?? 'user',
      subscription_tier: user.subscription_tier ?? 'free',
    },
    secret,
    {
      expiresIn: '1h',
      issuer: 'video-challenge-api',
      audience: 'video-challenge-app',
    },
  );
}

/**
 * Generates an expired JWT access token for testing auth rejection.
 */
export function generateExpiredAuthToken(user: {
  id: string;
  email: string;
  role?: string;
  subscription_tier?: string;
}): string {
  const secret = process.env.JWT_SECRET!;

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role ?? 'user',
      subscription_tier: user.subscription_tier ?? 'free',
    },
    secret,
    {
      expiresIn: '-10s', // already expired
      issuer: 'video-challenge-api',
      audience: 'video-challenge-app',
    },
  );
}

/**
 * The default plain-text password used by createTestUser.
 * Tests that need to log in can use this value.
 */
export const DEFAULT_TEST_PASSWORD = DEFAULT_PASSWORD;

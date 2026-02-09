/**
 * Database helpers for tests.
 *
 * Provides utilities for obtaining a test Knex instance, truncating tables
 * between tests (respecting foreign-key constraints), and optionally seeding
 * a minimal data set.
 */

import knex, { Knex } from 'knex';
import knexConfig from '../../knexfile';

// ---------------------------------------------------------------------------
// Singleton test DB connection
// ---------------------------------------------------------------------------

let _db: Knex | null = null;

/**
 * Returns (and lazily creates) a Knex connection that points at the
 * test database defined in knexfile.ts under the `test` key.
 */
export function getDb(): Knex {
  if (!_db) {
    const config = (knexConfig as Record<string, Knex.Config>).test;
    if (!config) {
      throw new Error('No Knex "test" configuration found in knexfile.ts');
    }
    _db = knex(config);
  }
  return _db;
}

// ---------------------------------------------------------------------------
// Truncation
// ---------------------------------------------------------------------------

/**
 * Tables listed in an order that respects foreign-key constraints.
 *
 * Children (tables that reference other tables) come first so that
 * TRUNCATE ... CASCADE is not required and accidental data leaks between
 * unrelated tables are avoided.
 *
 * If your schema adds new tables, append them here in the correct position.
 */
const TABLES_IN_TRUNCATION_ORDER: string[] = [
  // Leaf / junction tables first
  'ad_events',
  'analytics_events',
  'push_tokens',
  'notifications',
  'reports',
  'coin_transactions',
  'gift_transactions',
  'gift_catalog',
  'vote_queue',
  'votes',
  'submissions',
  'user_achievements',
  'achievements',
  'leaderboard_entries',
  'user_subscriptions',
  'subscription_plans',
  'coin_packages',
  'blocked_users',
  'follows',
  'user_auth_providers',
  'challenges',
  'users',
];

/**
 * Truncates every application table in the correct order.
 *
 * Uses `TRUNCATE ... CASCADE` as a safety net in case the ordering above
 * is incomplete, but the explicit order avoids most cascade surprises.
 */
export async function truncateAllTables(): Promise<void> {
  const db = getDb();

  for (const table of TABLES_IN_TRUNCATION_ORDER) {
    try {
      await db.raw(`TRUNCATE TABLE "${table}" CASCADE`);
    } catch {
      // Table may not exist if a migration was skipped -- ignore.
    }
  }
}

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

/**
 * Inserts a minimal, internally-consistent data set useful as a baseline
 * for integration tests that need *some* data to exist.
 *
 * Returns references to the created rows so tests can build on top.
 */
export async function seedTestData(): Promise<{
  userId: string;
  challengeId: string;
}> {
  const db = getDb();

  const [user] = await db('users')
    .insert({
      email: 'seed@test.com',
      username: 'seeduser',
      display_name: 'Seed User',
      password_hash: '$2a$12$dummyhashforseeding000000000000000000000000000000',
      role: 'user',
      subscription_tier: 'free',
      coin_balance: 0,
      total_coins_earned: 0,
      total_coins_spent: 0,
    })
    .returning('id');

  const now = new Date();
  const endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const votingEndsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);

  const [challenge] = await db('challenges')
    .insert({
      title: 'Seed Challenge',
      description: 'A challenge for seeding test data.',
      category: 'general',
      difficulty: 'easy',
      status: 'active',
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      voting_ends_at: votingEndsAt.toISOString(),
    })
    .returning('id');

  return {
    userId: user.id,
    challengeId: challenge.id,
  };
}

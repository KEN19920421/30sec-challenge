/**
 * Global test setup/teardown.
 *
 * - Sets NODE_ENV to 'test' so the app picks up the test database config.
 * - Provides env vars required by services that read from process.env.
 * - Runs migrations once before all tests (if DB is available).
 * - Truncates tables between each test to guarantee isolation.
 * - Destroys database and Redis connections after all tests.
 */

import { getDb, truncateAllTables } from './database';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-access-secret-32chars!!';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-32chars!';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.REDIS_URL = 'redis://localhost:6379/1'; // use DB 1 for tests

// ---------------------------------------------------------------------------
// Lifecycle hooks
// ---------------------------------------------------------------------------

let dbAvailable = false;

beforeAll(async () => {
  try {
    const db = getDb();
    // Check if the database is reachable
    await db.raw('SELECT 1');
    // Run all migrations so the schema is up to date
    await db.migrate.latest();
    dbAvailable = true;
  } catch {
    // Database not available - unit tests can still run with mocks
    dbAvailable = false;
  }
});

afterEach(async () => {
  if (dbAvailable) {
    // Clean every table between tests for full isolation
    await truncateAllTables();
  }
});

afterAll(async () => {
  if (dbAvailable) {
    try {
      const db = getDb();
      // Roll back migrations so the test DB is left clean
      await db.migrate.rollback(undefined, true);
      // Destroy the knex connection pool
      await db.destroy();
    } catch {
      // Ignore cleanup errors
    }
  }

  // Disconnect Redis (imported lazily to avoid side-effects if Redis is mocked)
  try {
    const { disconnectRedis } = await import('../../src/config/redis');
    await disconnectRedis();
  } catch {
    // Redis may not be running in unit-test environments; ignore.
  }
});
